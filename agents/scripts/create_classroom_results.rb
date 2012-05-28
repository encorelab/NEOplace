#!/usr/bin/env ruby
require 'mongo'

# ARGV.each do|a|
#   puts "Argument: #{a}"
# end

#@mongo = Mongo::Connection.new.db(ARGV[0])
@mongo = Mongo::Connection.new.db('neo-ab')


def create_results()
  puts "Reading homework array"
  homework_problems = @mongo.collection(:aggregated_homework).find().to_a
  puts "Homework problems #{homework_problems.inspect}"
  puts "Homework size #{homework_problems.length}"

  events = @mongo.collection(:events).find("eventType" => "quorum_reached").to_a
  puts "Events size #{events.length}"
end

create_results()
