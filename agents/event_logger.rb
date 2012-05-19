require 'rubygems'
require 'blather/client/dsl'
require 'mongo'

$: << 'sail.rb/lib'
require 'sail/agent'

class EventLogger < Sail::Agent
  def behaviour
    when_ready do
      @mongo = Mongo::Connection.new.db(config[:database])
      
      join_room
      #join_log_room
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end
    
    # we don't specify an event type, so this will catch ALL events
    event do |stanza, data|
      log "Storing event: #{data.inspect}"
      @mongo.collection(:events).save(data)
    end
    
    # event :check_in? do |stanza, data|
    #   iq = Sail::Query.new(:get)
    #   iq.query << "latest_user_locations"
    #   #iq.from = agent_jid_in_room
    #   iq.to = room_jid + "/LocationTracker"
    #   
    #   log "SENDING REQUEST #{client.object_id}: " + iq.inspect
    #   
    #   client.write_with_handler(iq) do |stanza|
    #     log "GOT RESPONSE #{client.object_id}: " + stanza.inspect
    #   end
    #   
    #   log client.instance_variable_get(:@tmp_handlers).inspect
    # end
  end
end