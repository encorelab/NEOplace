require 'mongo'
require 'rest_client'
require 'json'

@mongo = Mongo::Connection.new.db('neo-ab')
@homework = {}


def retrieve_homework()
  RestClient.get("http://place.aardvark.encorelab.org/hwdata/?t=homework_aggregated") do |response, request, result, &block|
    case response.code
    when 200
      # puts "Result #{response.inspect}"
      aggregated_homeworks = JSON.parse(response)
      # puts "#{aggregated_homeworks.inspect}"
      aggregated_homeworks.each do |aggregated_homework|
      	@homework['problem_name'] = aggregated_homework['problemName']
      	@homework['principles'] = aggregated_homework['principles']
      	@homework['equations'] = aggregated_homework['equations']

      	@mongo.collection(:aggregated_homework).save(@homework)
      end

      return true
    else
      response.return!(request, result, &block)
      return nil
    end
  end
end

retrieve_homework()