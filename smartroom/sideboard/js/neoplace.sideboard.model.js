/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Backbone, Rollcall, NEOplace */

(function(app) {
    var model = {};

    function createNecessaryCollections (requiredCollections) {
        jQuery.ajax(app.drowsyURL, {
            type: 'get',
            dataType: 'json',
            success: function (existingCollections) {
                _.each(requiredCollections, function (col) {
                    if(!_.include(existingCollections, col)) {
                        console.log("Creating collection '"+col+"' under "+app.drowsyURL);
                        jQuery.post(app.drowsyURL, {collection: col});
                    }
                });
            },
            error: function (err) {
                console.error("Couldn't fetch list of collections from because: ", err);
                throw err;
            }
        });
        
    }

    function init () {
        if (!app.run || !app.run.name)
            throw "Cannot init NeoPlace.SideBoard.model because we authenticated without an app.run.name!";

        app.drowsyURL = app.config.mongo.url + "/" + app.run.name;

        
        model.Tag = Backbone.Model.extend({
            urlRoot: app.drowsyURL + "/video_tags",
            idAttribute: '_id',
            parse: function(data) {
                data._id = data._id.$oid;
                return data;
            },
            initialize: function () {
                if (!this.get(this.idAttribute)) {
                    this.set(this.idAttribute, model.generateMongoObjectId());
                }
            },
            getType: function () {
                if (this.has('principle')) {
                    return 'principle';
                } else {
                    err = "Invalid tag data!"
                    console.error(err, this.toJSON());
                    throw err;
                }
            }
        });

        model.Tags = Backbone.Collection.extend({
            model: model.Tag,
            url: app.drowsyURL + "/video_tags"
        });

        createNecessaryCollections(['video_tags']);
    }

    jQuery(app).bind('authenticated', init);

    model.generateMongoObjectId = function () {
        var base = 16; // hex
        var time = (new Date().getTime()).toString(base)
        var rand = Math.ceil(Math.random() * (Math.pow(base, 13)-1)).toString(base);
        return time + ("0000000000000" + rand).slice(-13);
    };

    app.model = model;
})(NEOplace.SideBoard);