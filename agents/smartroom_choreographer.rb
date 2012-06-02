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
    @vidwalls_user_tag_counts = {}
  end

  def behaviour
    when_ready do
      # Setup MongoDB connection
      @mongo = Mongo::Connection.new.db(config[:database])

      join_room
      #join_log_room
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end

    
    
    # Keep track of who is submitting what principle
    event :student_principle_submit? do |stanza, data|
      log "Received student_principles_submit #{data.inspect}"
      if data['origin'] && data['payload']['location'] && data['payload']['principle'] then
        record_principle_submission(data['origin'], data['payload']['location'],)
      end
    end

    event :start_sort? do |stanza, data|
      log "Received student_principles_submit #{data.inspect}"
      if data && data['payload'] && data['payload']['step'] == "principle_sort" then
        # data = JSON.parse('{ "VW1":[{"student_name":"bob","principle_count":3},{"student_name":"jim","principle_count":4}], "VW2":[{"student_name":"bob","principle_count":3},{"student_name":"jim","principle_count":4}] }')
        vidwall_user_tag_counts = JSON.parse('{ "A":{"bob":3,"jim":4,"tim":1}, "B":{"bob":3,"jim":2,"tim":4} , "C":{"bob":1,"jim":2,"tim":4} }')
        # vidwall_user_tag_counts = JSON.parse('[ {"bob":3,"jim":4,"tim":1}, {"bob":3,"jim":2,"tim":4} ]')

        # call function to generate the location assignments
        @user_wall_assignments = generate_location_assignments(vidwall_user_tag_counts)

        # store user_wall_assignments in database so clients can use it
        store_user_wall_assigments(@user_wall_assignments)
        # send out events
        send_location_assignments(@user_wall_assignments)
      end
    end 

  end

  # This function stores the submitted principles for each student
  def record_principle_submission(user, location)
    log "user #{user.inspect} - location #{location.inspect}"

    unless @vidwalls_user_tag_counts[location] == nil then
      log "Updating location #{location} with user #{user}"
      # create Hash with user name and count 1
      user_tag_count = {user => 1}
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
      user_tag_count = {user => 1}
      @vidwalls_user_tag_counts[location] = user_tag_count
      log "Creating new entry for location #{location} with user #{user} and count 1"
    end

    #store in mongo
    log "Store vidwall_user_tag_counts in mongo database #{@vidwalls_user_tag_counts}"
    @vidwalls_user_tag_counts.each do |vidwall|
      @mongo.collection(:vidwall_user_tag_counts).save(vidwall)
    end
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

  def store_user_wall_assigments(user_wall_assignments)
    @mongo.collection(:user_wall_assignments).remove()

    user_wall_assignments.map do |user, wall|
      beautified_user_wall_assignment = {:user_name => user, :location => wall}
      @mongo.collection(:user_wall_assignments).save(beautified_user_wall_assignment)
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
  
end