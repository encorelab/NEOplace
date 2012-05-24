require 'rubygems'
require 'blather/client/dsl'
require 'mongo'
require 'rest_client'

$: << 'sail.rb/lib'
require 'sail/agent'

class ClassroomChoreographer < Sail::Agent

  def initialize(*args)
    super(*args)
    @students = {} # cache of Choreographer::Student objects
    @runname = ''
    @runid = ''
    @active_users = []
    @rollcallurl = ""
    @groups_with_active_users = {}
    @classroom_started = false
  end

  def behaviour
    when_ready do
      # Setup MongoDB connection
      @mongo = Mongo::Connection.new.db(config[:database])
      
      # Pull runname and Rollcall URL that came from config.json
      @runname = config[:room]
      @rollcallurl = config[:sail][:rollcall][:url]
      log "runname #{@runname} rollcallurl #{@rollcallurl}"

      # read problems.json and store in mongo if not existant already
      unless @mongo.collection(:problem_assignments).find_one then
        problems_from_file = ''
        file = File.new("../assets/problems.json", "r")
        while (line = file.gets)
            problems_from_file += line
        end
        file.close

        # Convert string to JSON
        problems_from_file = JSON.parse(problems_from_file)

        # Add a assigned field (default false) and store in MongoDB
        problems_from_file.each do |problem|
          problem['assigned'] = false
          problem['active_user_ids'] = []
          @mongo.collection(:problem_assignments).save(problem)
        end
        log "#{problems_from_file}"
      else
        log "problem_assignments already in database"
      end

      join_room
      #join_log_room
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end

    
    
    # Take note of who is doing a check_in and store in mongodb
    event :login? do |stanza, data|
      # unless @classroom_started then
        log "Received login #{data.inspect}"
        # retrieving user id from rollcall
        userid = lookup_userid(data['origin'])
        # retrieving user name
        if userid then
          user = {'name' => data['origin'], "id" => userid}
        
          # check if user is already stored and store if not already in db
          unless @mongo.collection(:active_users).find_one(user) then
            log "storing #{user.inspect} in MongoDB"
            @mongo.collection(:active_users).save(user)
          end
        end
      # else
      #   log "Classroom already started ignoring event login"
      # end
    end
    
    # once start is received hand out first problem batch to checked in students
    event :start_classroom? do |stanza, data|
      unless @classroom_started then
        log "Once this event is received, hand out first problem batch"
        log "Run name #{@runname.inspect}"
        # Retrieve run id from Rollcall
        @runid = lookup_runid(@runname)

        unless @runid == nil then
          log "Run Id #{@runid} for runname #{@runname}"
        else
          log 'No runid no dice'
          return nil
        end

        # Retrieve groups that belong to run id from Rollcall
        groups_in_run = lookup_groups(@runid)
        log "Found #{groups_in_run.length} groups that fit to #{@runid} : #{groups_in_run.inspect}"

        # Retrieve all user names for 'active' groups
        @mongo.collection(:active_users).find.each do |row|
          @active_users.push(row)
        end
        log "Active_users array #{@active_users.inspect}"

        # Remove users not logged in from groups
        @groups_with_active_users = remove_inactive_users(groups_in_run, @active_users)
        log "did groups change? #{@groups_with_active_users.inspect}"

        # Send group presence
        @groups_with_active_users.each do |active_group|
          active_user_ids = active_group[1].collect {|user| user['id']}
          if active_user_ids.length > 0 then
            log "Sending group_presense event with group #{active_group[0].inspect} and member ids #{active_user_ids.inspect}"
            event!(:group_presence, {:group => active_group[0], :members => active_user_ids})
            # Send problem assignment
            unless send_problem_assignment(active_group[0], active_user_ids) then
              log "Running out of problems should not happen at start of class :("
            end
          else
            log "Not active members for group #{active_group.inspect}"
          end
        end

        # @groups_with_active_users.each do |active_group|
        #   # Send problem assignment
        #   unless send_problem_assignment(active_group[0], active_group[1]) then
        #     log "Running out of problems should not happen at start of class :("
        #   end
        # end

        @classroom_started = true
      else
        log "Classroom already started ignoring event start_classroom"
      end
    end

    event :quorum_reached? do |stanza, data|
      # if @classroom_started then
        log "Received quorum_reached #{data.inspect}"
        payload = data['payload']

        if payload['equations'] then
          log "Received quorum_reached for equations #{data.inspect}"
          # quorum_reached with equation will be received several times so pulling problem_assignment from
          # mongodb and deleting user_id from active_user_ids array to know when last quorum message is in
          problem = @mongo.collection(:problem_assignments).find_one('name' => payload['problem_name'])
          log "Problem in database #{problem.inspect}"
          # remove current user_id from active_user_ids array
          problem['active_user_ids'].delete_if {|user_id| payload['user_id'] == user_id }
          log "Problem in database #{problem.inspect}"
          # store in mongodb so we know that all users send quorum and we can assign new problem
          @mongo.collection(:problem_assignments).save(problem)
          
          unless problem['active_user_ids'].length > 0
            @groups_with_active_users.each do |active_group|
              active_user_ids = active_group[1].collect {|user| user['id']}
              # Send problem assignment
              unless send_problem_assignment(payload['group_name'], active_user_ids) then
                log "We are out of problems now we send done message"
                event!(:activity_end, {})
              end
            end
          end
        end
      # else
      #   log "Classroom not started, yet! Ignoring event quorum_reached"
      # end
    end

  end

  def lookup_userid(username)
    RestClient.get("#{@rollcallurl}users.json") do |response, request, result, &block|
      case response.code
      when 200
        #log "Result #{response.inspect}"
        users = JSON.parse(response)
        
        users.each do |user|
          if user['account']['login'] == username then
            #log "Run #{run.inspect}"
            return user['id']
          end
        end

        return nil
      else
        response.return!(request, result, &block)
        return nil
      end
    end
  end

  def lookup_runid (runname)
    #RestClient.get('http://rollcall.proto.encorelab.org/runs/neo-test.json'){ |response, request, result, &block|
    RestClient.get("#{@rollcallurl}runs/#{runname}.json"){ |response, request, result, &block|
      case response.code
      when 200
        #log "Result #{response.inspect}"
        run = JSON.parse(response)
        
        return run['id']
      else
        response.return!(request, result, &block)
        return nil
      end
    }
  end

  def lookup_groups (runid)
    #RestClient.get('http://rollcall.proto.encorelab.org/groups.json'){ |response, request, result, &block|
    RestClient.get("#{@rollcallurl}runs/#{runid}/groups.json"){ |response, request, result, &block|
      case response.code
      when 200
        #log "Result #{response.inspect}"
        groups = JSON.parse(response)
        groups_and_their_members = {}

        groups.each do |group|
          groups_and_their_members[group['name']] = []
          group['members'].each do |member|
            groups_and_their_members[group['name']].push('id' => member['id'])
          end
        end
        
        #reduce the set to the entries that fit the run_id
        #groups.delete_if { |group| group['run_id'] != runid }

        return groups_and_their_members
      else
        response.return!(request, result, &block)
        return nil
      end
    }
  end

  def remove_inactive_users(groups_and_their_members, active_users)
    active_user_ids = active_users.collect{|u| u['id']}.flatten.uniq

    groups_and_their_members.keys.each do |gname|
      active_members_in_this_group = 
        groups_and_their_members[gname].select do |member|
            active_user_ids.include?(member['id'])
        end
      
        if active_members_in_this_group.length > 0 then
          groups_and_their_members[gname] = active_members_in_this_group  
        else
          groups_and_their_members.delete(gname)
        end
    end

    return groups_and_their_members
  end

  def send_problem_assignment(active_group_name, active_user_ids)
    # find a problem with assigned 'false'
    next_problem = @mongo.collection(:problem_assignments).find_one('assigned' => false)
    if next_problem then
      log "#{next_problem.inspect}"
      # send out problem assignment event
      event!(:problem_assignment, {:group => active_group_name, :problem_name => next_problem['name']})
      # set assigned to 'true' and store in MongoDB
      next_problem['assigned'] = true
      next_problem['active_user_ids'] = active_user_ids
      log "#{active_user_ids.inspect}"
      log "#{next_problem.inspect}"
      @mongo.collection(:problem_assignments).save(next_problem)
      return true
    else
      log "Out of problems"
      return false
    end
  end

  # def lookup_student(username, restoring = false)
  #   stu = @students[username]
      
  #   if stu.nil?
  #     log "Looking up user #{username.inspect} in Rollcall..."
      
  #     begin
  #       stu = Student.find(username)
  #     rescue ActiveResource::ResourceNotFound
  #       log "#{username.inspect} not found in Rollcall..."
  #       return nil
  #     end
      
  #     unless stu.kind == "Student"
  #       log "#{username.inspect} is not a student; will be ignored."
  #       return nil
  #     end
      
  #     log "#{username.inspect} loaded in state #{stu.state}"
      
  #     @students[username] = stu
  #   elsif restoring # make sure the entry event gets triggered when we are restoring but not reloading
  #     stu_from_rollcall = Student.find(username)
  #     stu.state = stu_from_rollcall.state
  #   end
    
  #   stu.agent = self
  #   return stu
  # end
  
end