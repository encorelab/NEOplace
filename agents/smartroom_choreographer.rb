require 'rubygems'
require 'blather/client/dsl'
require 'mongo'
require 'rest_client'

$: << 'sail.rb/lib'
require 'sail/agent'

class SmartroomChoreographer < Sail::Agent

  def initialize(*args)
    super(*args)
    @user_wall_assignments = {}
    @user_wall_assignments_eq = {}
    @vidwalls_user_tag_counts = {'A' => {}, 'B' => {}, 'C' => {}, 'D' => {}}
  end

  def behaviour
    when_ready do
      # Setup MongoDB connection
      @mongo = Mongo::Connection.new.db(config[:database])

      join_room
      #join_log_room

      @mongo.collection(:vidwall_user_tag_counts).find().each do |row|
        # log "#{row.inspect}"
        row.map do |key, values|
          unless key == "_id" then
            # log "key #{key}"
            @vidwalls_user_tag_counts.merge!({key => values})
          end
        end
      end
      log "Restored vidwalls_user_tag_counts from MongoDB #{@vidwalls_user_tag_counts}"

      # @mongo.collection(:user_wall_assignments).find().each do |row|
      #   log "#{row.inspect}"
      #   new_row = {}
      #   row.map do |key, value|
      #     unless key == "_id" then
      #       log "key #{key} value #{value}"
      #       new_row.merge!({key => value})
      #     end
      #   end
      #   log "new_row #{new_row}"
      #   @user_wall_assignments.merge!(new_row)
      # end
      # log "Restored user_wall_assignments from MongoDB #{@user_wall_assignments}"

    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end

    event :check_in? do |stanza, data|
      log "Received check_in #{data.inspect}"
      if data['origin'] && data['payload']['location'] then
        record_user_presence(data['origin'])
      end
    end
    
    # Keep track of who is submitting what principle
    event :student_principle_submit? do |stanza, data|
      log "Received student_principles_submit #{data.inspect}"
      if data['origin'] && data['payload']['location'] && data['payload']['principle'] then
        # This couldn't hurt. We might have missed check_in, so why not record the precense
        record_user_presence(data['origin'])
        # And now count the submission
        record_principle_submission(data['origin'], data['payload']['location'],)
      end
    end

    event :start_sort? do |stanza, data|
      log "Received student_principles_submit #{data.inspect}"
      # first sorting by principle submission ranking
      if data && data['payload'] && data['payload']['step'] == "principle_sort" then
        # data = JSON.parse('{ "VW1":[{"student_name":"bob","principle_count":3},{"student_name":"jim","principle_count":4}], "VW2":[{"student_name":"bob","principle_count":3},{"student_name":"jim","principle_count":4}] }')
        # vidwall_user_tag_counts = JSON.parse('{ "A":{"bob":3,"jim":4,"tim":1}, "B":{"bob":3,"jim":2,"tim":4} , "C":{"bob":1,"jim":2,"tim":4} }')
        # vidwall_user_tag_counts = JSON.parse('[ {"bob":3,"jim":4,"tim":1}, {"bob":3,"jim":2,"tim":4} ]')

        # call function to generate the location assignments
        @user_wall_assignments = generate_location_assignments(@vidwalls_user_tag_counts)

        # store user_wall_assignments in database so clients can use it
        store_user_wall_assigments_principle(@user_wall_assignments)
        # send out events
        send_location_assignments(@user_wall_assignments)
      elsif data && data['payload'] && data['payload']['step'] == "equation_step" then
        # call function to generate old location assignments
        user_wall_assignments_eq = generate_location_assignments(@vidwalls_user_tag_counts)
        # reshuffle users
        log "What I got for reshuffling #{user_wall_assignments_eq}"
        @user_wall_assignments_eq = generate_location_assignments_eq(user_wall_assignments_eq)

        # store user_wall_assignments in database so clients can use it
        store_user_wall_assigments_equation(@user_wall_assignments_eq)
        # send out events
        send_location_assignments(@user_wall_assignments_eq)
      end
    end 

  end

  def record_user_presence(user)
    log "Recording user #{user} in all locations"
    @vidwalls_user_tag_counts.map do |location, v|
      record_principle_submission(user, location, 0)
    end
  end

  # This function stores the submitted principles for each student
  def record_principle_submission(user, location, count=1)
    log "user #{user.inspect} - location #{location.inspect}"

    unless @vidwalls_user_tag_counts[location] == nil then
      log "Updating location #{location} with user #{user}"
      # create Hash with user name and count 1
      user_tag_count = {user => count}
      # Retrieve Has with users and counts for a certain location
      user_tag_counts = @vidwalls_user_tag_counts[location]
      log "Before #{user_tag_counts}"
      # Merge the hashes and add counts if user already exists
      new_user_tag_counts = user_tag_counts.merge(user_tag_count){|key, oldcount, newcount| oldcount + newcount}
      log "After #{new_user_tag_counts}"
      @vidwalls_user_tag_counts[location] = new_user_tag_counts
      # log "vidwall_user_tag_counts after adding: #{@vidwalls_user_tag_counts.inspect}"
    else
      # Create entry for location
      user_tag_count = {user => count}
      @vidwalls_user_tag_counts[location] = user_tag_count
      log "Creating new entry for location #{location} with user #{user} and count 1"
    end

    #store in mongo
    store_vidwall_user_tag_counts(@vidwalls_user_tag_counts)
  end

  # This function is brought to you by Matt Zukowski's brilliance
  def generate_location_assignments(vidwall_user_tag_counts)
    log "Video wall user tag counts to generate location assignments #{vidwall_user_tag_counts.inspect}"
    # end result structure used to send out messages later on
    user_wall_assignments = {}

    # function to determine if there are still users in the hash
    def any_unassigned_users_left?(vidwall_user_tag_rankings)
        vidwall_user_tag_rankings.any?{|wall, users| !users.empty?}
    end

    # Step 1 create sorted rankings
    vidwall_user_tag_rankings = vidwall_user_tag_counts.map do |wall, user_counts|
      [wall, user_counts.sort_by {|user,count|  count }.reverse.map{ |user, count| user } ]
    end
    # => [["video-wall-A", ["jim", "bob", "tim"]], ["video-wall-B", ["tim", "bob", "jim"]]]
    # convert array structure back to hash
    vidwall_user_tag_rankings  = Hash[ vidwall_user_tag_rankings ]
    log "Users sorted by ranking for each videowall #{vidwall_user_tag_rankings.inspect}"
    # => {"video-wall-A"=>["jim", "bob", "tim"], "video-wall-B"=>["tim", "bob", "jim"]}

    # create a array with all the wall names
    walls = vidwall_user_tag_rankings.keys
    log "Walls #{walls.inspect}"

    # Step 2 cycle through walls while still users in videwall_user_tag_rankings
    i = 0
    while any_unassigned_users_left?(vidwall_user_tag_rankings) do
        wall = walls[i]
        # retrieve top user
        top_user = vidwall_user_tag_rankings[wall].first
        # store top user in result structure with the assigned wall
        user_wall_assignments[top_user] = wall
        
        # delete the user from all videowall rankings
        walls.each {|w| vidwall_user_tag_rankings[w].delete(top_user) }
        # make sure that the iterator goes through all walls (like 4) again and again
        i = (i + 1) % walls.length
    end

    log "User assignment array to send messages #{user_wall_assignments.inspect}"
    return user_wall_assignments
  end

  # This function is brought to you by Matt Zukowski's brilliance
  def generate_location_assignments_eq(user_wall_assignments)
    log "Users and and their assigned wall #{user_wall_assignments.inspect}"
    # end result structure used to send out messages later on and copy in empty setup
    user_wall_assignments_eq = {}
    wall_to_user_assignment = {}
    wall_users = {}

    # go over user_wall_assigments, e.g. {"Mike"=>"A", "Jim"=>"B", "Pearl"=>"C", "Colin"=>"D", "Armin"=>"A"}
    # turn it into wall_to_user_assignment {"A"=>["Mike", "Armin"], "B"=>["Jim"], "C"=>["Pearl"], "D"=>["Colin"]}
    user_wall_assignments.map do |user, wall|
      unless wall_users[wall] == nil then
        wall_users[wall] += [user]
      else
        wall_users[wall] = [user]
        # setup target walls with empty user array
        wall_to_user_assignment[wall] = []
      end
    end

    log "walls and their users #{wall_users}"
    # get the keys in an array ["A", "B", "C", "D"]
    walls = wall_users.keys

    # using shift is slightly hacky, but ensures that we get a even distribution
    shift = 0
    # go through all walls
    walls.each do |wall|
      # remove current wall from target_walls
      target_walls = walls.reject{|w| w == wall}
      # shift_left takes element of array (first arg) from the beginning and adds it at the end done as N times (second arg)
      # this ensures an even redistribution of users
      target_walls = shift_left(target_walls, shift)
      shift = (shift + 1) % walls.length
      log "target walls #{target_walls}"

      # retrieve all users for the current wall
      users = wall_users[wall]
      log "users #{users.inspect}"

      # now go over all users and assign them to first target wall, shift, repeat
      users.each do |user|
        wall_to_user_assignment[target_walls.first] += [user]
        target_walls = shift_left(target_walls)
      end
    end
    
    log "Wall with assigned users #{wall_to_user_assignment.inspect}"
    # now re-organize to get hash with {"user" => "wall", "Colin" => "A"}
    wall_to_user_assignment.map do |wall, users|
      users.each {|user| user_wall_assignments_eq[user] = wall}
    end

    log "User assignment array (equations) to send messages #{user_wall_assignments_eq.inspect}"
    return user_wall_assignments_eq
  end

  def store_vidwall_user_tag_counts(vidwalls_user_tag_counts)
    log "Store vidwall_user_tag_counts in mongo database #{vidwalls_user_tag_counts}"
    @mongo.collection(:vidwall_user_tag_counts).remove()
    vidwalls_user_tag_counts.map do |wall, users|
      # log "#{wall} #{users}"
      vidwall = {wall => users}
      # log "#{vidwall.inspect}"
      @mongo.collection(:vidwall_user_tag_counts).save(vidwall)
    end
    log "Storing done"
  end

  def store_user_wall_assigments_principle(user_wall_assignments)
    store_user_wall_pairs(user_wall_assignments, :user_wall_assignments_principle)
  end

  def store_user_wall_assigments_equation(user_wall_assignments)
    store_user_wall_pairs(user_wall_assignments, :user_wall_assignments_equation)
  end

  def store_user_wall_pairs(user_wall_pairs, collection)
    @mongo.collection(collection).remove()

    user_wall_pairs.map do |user, wall|
      beautified_user_wall_pairs = {:user_name => user, :location => wall}
      @mongo.collection(collection).save(beautified_user_wall_pairs)
    end

    log "pimped out user_wall_assignments stored for lookup in mongo"
  end


  def send_location_assignments(user_to_wall_assignments)
    # find a problem with assigned 'false'
    user_to_wall_assignments.map do |user, wall|
      log "Sending location_assignment for user '#{user.inspect}' at videowall '#{wall.inspect}'"
      event!(:location_assignment, {:student => user, :location => wall})
    end
  end

  def shift_left (array, howOften = 1)
    unless array == nil || !array.kind_of?(Array) || array.empty? then
      if howOften > 0 then
        first_element = array.shift
        array.push(first_element)
        return shift_left(array, (howOften - 1))
      else
        return array
      end
    end
    return array
  end
  
end