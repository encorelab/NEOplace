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
      # Retrieve run id from Rollcall
      @runid = lookup_runid (@runname)

      unless @runid == nil then
        log "Run Id #{@runid} for run"
      else
        log 'No runid no dice'
        return nil
      end

      # Retrieve groups that belong to run id from Rollcall
      groups = lookup_groups (@runid)
      log "Found #{groups.length} groups that fit to #{@runid} : #{groups.inspect}"

      # Retrieve all user names for 'active' groups
      @mongo.collection(:active_users).find.each do |row|
        @active_users.push(row)
      end

      log "Active_users array #{@active_users.inspect}"

      # Remove users not logged in from groups

      # Send group presence

      # Send problem assignment
    end
  end

  def lookup_userid(username)
    RestClient.get('http://rollcall.proto.encorelab.org/users.json'){ |response, request, result, &block|
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
    }
  end

  def lookup_runid (runname)
    RestClient.get('http://rollcall.proto.encorelab.org/runs.json'){ |response, request, result, &block|
      case response.code
      when 200
        log "Result #{response.inspect}"
        runs = JSON.parse(response)
        
        runs.each do |run|
          if run['name'] == runname then
            #log "Run #{run.inspect}"
            return run['id']
          end
        end

        return nil
      else
        response.return!(request, result, &block)
        return nil
      end
    }
  end

  def lookup_groups (runid)
    RestClient.get('http://rollcall.proto.encorelab.org/groups.json'){ |response, request, result, &block|
      case response.code
      when 200
        #log "Result #{response.inspect}"
        groups = JSON.parse(response)
        
        #reduce the set to the entries that fit the run_id
        groups.delete_if { |group| group['run_id'] != runid }

        return groups
      else
        response.return!(request, result, &block)
        return nil
      end
    }
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