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
    @runname = 'neo-test'
    @runid = nil
    @active_users = []
    @rollcallurl = "http://rollcall.proto.encorelab.org/"
  end

  def behaviour
    when_ready do
      @mongo = Mongo::Connection.new.db(config[:database])

      join_room
      #join_log_room
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end

    
    
    # Take note of who is doing a check_in and store in mongodb
    event :login? do |stanza, data|
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
        
    end
    
    # once start is received hand out first problem batch to checked in students
    event :start_classroom? do |stanza, data|
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
      groups_with_active_users = remove_inactive_users(groups_in_run, @active_users)
      log "did groups change? #{groups_with_active_users.inspect}"

      # Send group presence
      groups_with_active_users.each do |active_group|
        log "active group name: #{active_group[0]}"
        log "active group member ids: #{active_group[1]}"
        #event!(:group_presence, {:group => active_group[0], :members => active_group[1]})
      end

      # Send problem assignment
    end
  end

  def lookup_userid(username)
    RestClient.get("#{@rollcallurl}users.json") do |response, request, result, &block|
      case response.code
      when 200
        log "Result #{response.inspect}"
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
        log "Result #{response.inspect}"
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
        groups_and_their_members = nil

        groups.each do |group|
          groups_and_their_members = {group['name'] => []}
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
    
        groups_and_their_members[gname] = active_members_in_this_group  
    end

    return groups_and_their_members
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