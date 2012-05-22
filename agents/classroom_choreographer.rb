require 'rubygems'
require 'blather/client/dsl'
require 'mongo'

$: << 'sail.rb/lib'
require 'sail/agent'

class ClassroomChoreographer < Sail::Agent
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
    event :check_in? do |stanza, data|
      log "Once this event is received, hand out first problem batch"
    end
    
    # once start is received hand out first problem batch to checked in students
    event :start_classroom? do |stanza, data|
      log "Once this event is received, hand out first problem batch"
    end
  end
end