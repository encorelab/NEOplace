#!/usr/bin/env ruby
require 'mongo'

ARGV.each do|a|
  puts "Argument: #{a}"
end

@mongo = Mongo::Connection.new.db(ARGV[0])
#@mongo = Mongo::Connection.new.db('neo-cd')


def clear_data()
  puts "Clearing events"
  @mongo.collection(:events).remove()
  puts "Clearing observations"
  @mongo.collection(:observations).remove()
  puts "Clearing states"
  @mongo.collection(:states).remove()
  puts "Clearing problem_assignments"
  @mongo.collection(:problem_assignments).remove()
  puts "Clearing active_users"
  @mongo.collection(:active_users).remove()
  puts "Clearing aggregated_homework"
  @mongo.collection(:aggregated_homework).remove()
end

clear_data()