require 'mongo'
require 'rest_client'
require 'json'

@mongo = Mongo::Connection.new.db('neo-ab')
@mongo2 = Mongo::Connection.new.db('neo-cd')
@homework = {}


def retrieve_homework()
  RestClient.get("http://place.aardvark.encorelab.org/hwdata/?t=homework_aggregated") do |response, request, result, &block|
    case response.code
    when 200
      # puts "Result #{response.inspect}"
      response.gsub!(/\\+'/,"'")
      aggregated_homeworks = JSON.parse(response)
      @mongo.collection(:aggregated_homework).remove()
      @mongo2.collection(:aggregated_homework).remove()
      # puts "#{aggregated_homeworks.inspect}"
      aggregated_homeworks.each do |aggregated_homework|
      	@mongo.collection(:aggregated_homework).save(aggregated_homework)
      	@mongo2.collection(:aggregated_homework).save(aggregated_homework)
      end

      return true
    else
      response.return!(request, result, &block)
      return nil
    end
  end
end

retrieve_homework()
