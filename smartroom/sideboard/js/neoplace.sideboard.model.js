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

        var DrowsyModel = Backbone.Model.extend({
            idAttribute: '_id',
            parse: function(data) {
                data._id = data._id.$oid;
                return data;
            },
            initialize: function () {
                if (!this.get(this.idAttribute)) {
                    this.set(this.idAttribute, model.generateMongoObjectId());
                }
            }
        });

        var DrowsyCollection = Backbone.Collection.extend({

        });
        
        model.Tag = DrowsyModel.extend({
            urlRoot: app.drowsyURL + "/sideboard_video_tags",
            getType: function () {
                if (this.has('principle')) {
                    return 'principle';
                } else {
                    var err = "Invalid tag data!";
                    console.error(err, this.toJSON());
                    throw err;
                }
            }
        });

        model.Tags = DrowsyCollection.extend({
            model: model.Tag,
            url: app.drowsyURL + "/sideboard_video_tags"
        });

        model.BoardState = DrowsyModel.extend({
            urlRoot: app.drowsyURL + "/sideboard_states"
        });

        model.BoardStates = DrowsyCollection.extend({
            model: model.BoardState,
            url: app.drowsyURL + "/sideboard_states"
        });

        createNecessaryCollections([
            'sideboard_video_tags',
            'sideboard_states'
        ]);
    }

    jQuery(app).bind('authenticated', init);

    model.generateMongoObjectId = function () {
        var base = 16; // hex
        var randLength = 13;
        // timeLength is 11
        var time = (new Date().getTime()).toString(base);
        var rand = Math.ceil(Math.random() * (Math.pow(base, randLength)-1)).toString(base);
        return time + (Array(randLength+1).join("0") + rand).slice(-randLength);
    };

    app.model = model;
})(NEOplace.SideBoard);