#!/usr/bin/env ruby
require 'mongo'

ARGV.each do|a|
  puts "Argument: #{a}"
end

@mongo = Mongo::Connection.new.db(ARGV[0])
#@mongo = Mongo::Connection.new.db('neo-cd')


def clear_data()
  # Classroom run
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
  # Smartroom run
  puts "Clearing restore_states (tablet restore states)"
  @mongo.collection(:restore_states).remove()
  puts "Clearing frontboard_aggregator (Antonio's board)"
  @mongo.collection(:frontboard_aggregator).remove()
  puts "Clearing frontboard_aggregator_states (Antonio's board)"
  @mongo.collection(:frontboard_aggregator_states).remove()
  puts "Clearing user_wall_assignments (Agent)"
  @mongo.collection(:user_wall_assignments).remove()
  puts "Clearing user_wall_assignments_equation (Agent)"
  @mongo.collection(:user_wall_assignments_equation).remove()
  puts "Clearing user_wall_assignments_principle (Agent)"
  @mongo.collection(:user_wall_assignments_principle).remove()
  puts "Clearing vidwall_user_tag_counts (Agent)"
  @mongo.collection(:vidwall_user_tag_counts).remove()
  puts "Clearing events"
  @mongo.collection(:events).remove()
  puts "Clearing sideboard_states (Matt's board)"
  @mongo.collection(:sideboard_states).remove()
  puts "Clearing sideboard_tag_balloons (Matt's board)"
  @mongo.collection(:sideboard_tag_balloons).remove()
  puts "Clearing sideboard_tags (Matt's board)"
  @mongo.collection(:sideboard_tags).remove()
end

clear_data()
