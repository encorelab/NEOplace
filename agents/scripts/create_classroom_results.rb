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

  puts "Reading quorum_reached events with principles"
  principle_events = @mongo.collection(:events).find("eventType" => "quorum_reached", "payload.principles" => {'$exists' => true}).to_a
  #puts "Principle events #{principle_events.inspect}"
  puts "Events with principles size #{principle_events.length}"

  puts "Reading quorum_reached events with equations"
  equation_events = @mongo.collection(:events).find("eventType" => "quorum_reached", "payload.equations" => {'$exists' => true}).to_a
  #puts "Equation events #{equation_events.inspect}"
  puts "Events with equations size #{equation_events.length}"

  aggregated_principles = {}
  principle_events.each do |principle|
    if principle['payload']['principles'].length > 0 then
      aggregated_principles[principle['payload']['problem_name']] = {'principles' => principle['payload']['principles']}
    end
  end
  puts "aggregated_principles: #{aggregated_principles.inspect}"
  puts "Length of aggregated_principles #{aggregated_principles.length}"

  aggregated_equations = {}
  equation_events.each do |equation|
    if equation['payload']['equations'].length > 0 then
      aggregated_equations[equation['payload']['problem_name']] = {'equations' => equation['payload']['equations']}
    end
  end
  puts "aggregated_equations: #{aggregated_equations.inspect}"
  puts "Length of aggregated_equations #{aggregated_equations.length}"
end

create_results()
