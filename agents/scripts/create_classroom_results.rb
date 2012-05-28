#!/usr/bin/env ruby
require 'mongo'

# ARGV.each do|a|
#   puts "Argument: #{a}"
# end

#@mongo = Mongo::Connection.new.db(ARGV[0])
@mongo = Mongo::Connection.new.db('neo-ab')


def create_results()
  exits_phrase = {'$exists' => true}

  puts "Reading homework array"
  homework_problems = @mongo.collection(:aggregated_homework).find().to_a
  puts "Homework problems #{homework_problems.inspect}"
  puts "Homework size #{homework_problems.length}"

  principle_events = @mongo.collection(:events).find("eventType" => "quorum_reached", "payload.principles" => exits_phrase.to_JSON).to_a
  puts "Events with principles size #{principle_events.length}"
  equation_events = @mongo.collection(:events).find("eventType" => "quorum_reached", "payload.equations" => exits_phrase.to_JSON).to_a
  puts "Events with equations size #{equation_events.length}"
end

create_results()
