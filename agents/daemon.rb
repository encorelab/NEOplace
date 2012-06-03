$: << File.dirname(__FILE__)+"/sail.rb/lib"
$: << File.dirname(__FILE__)
require 'sail/daemon'

# "agent" users on Rollcall must be given the password "s3agent!"
# which is hashed to AGENT_PASSWORD in XMPP
AGENT_PASSWORD = "9186ebc4790dfba833826e13c42c885f6f847274" # s3agent!

#RUNS = ['ab', 'cd', 'a','b','c','d'].collect{|alph| "neo-#{alph}"}
# RUNS = ['a'].collect{|alph| "neo-#{alph}"}
# RUNS = ['b'].collect{|alph| "neo-#{alph}"}
# RUNS = ['c'].collect{|alph| "neo-#{alph}"}
# RUNS = ['d'].collect{|alph| "neo-#{alph}"}

@daemon = Sail::Daemon.spawn(
  :name => "neo",
  :path => '.',
  :verbose => true
)

@daemon.load_config("../config.json")
ENV['ROLLCALL_URL'] = @daemon.config[:rollcall][:url]

require 'event_logger'
#require 'location_tracker'
require 'smartroom_choreographer'

RUNS.each do |run|
  @daemon << EventLogger.new(:room => run, :password => AGENT_PASSWORD, :database => run)
  @daemon << SmartroomChoreographer.new(:room => run, :password => AGENT_PASSWORD, :database => run)
end


@daemon.start
