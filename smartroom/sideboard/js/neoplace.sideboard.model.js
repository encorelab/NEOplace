/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Backbone, Rollcall, NEOplace, MD5 */

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

                if (!this.get('timestamp')) {
                    this.set('timestamp', Date());
                }
            }
        });

        var DrowsyCollection = Backbone.Collection.extend({

        });
        
        model.Tag = DrowsyModel.extend({
            urlRoot: app.drowsyURL + "/sideboard_tags",
            getType: function () {
                if (this.has('principle')) {
                    return 'principle';
                } else if (this.has('problem')) {
                    return 'problem';
                } else if (this.has('equation')) {
                    return 'equation';
                } else if (this.has('assumption') || this.has('variable')) {
                    return 'assvar';
                } else {
                    var err = "Invalid tag data!";
                    console.error(err, this.toJSON());
                    return undefined;
                }
            },
            grouping: function () {
                var type = this.getType();

                if (type == 'assvar') {
                    if (this.has('assumption'))
                        return 'assumption-'+MD5.hexdigest(this.get('assumption'));
                    else
                        return 'variable-'+MD5.hexdigest(this.get('variable'));
                } else {
                    return type + '-' + 
                    MD5.hexdigest(
                        this.get('principle') || 
                        this.get('problem') ||
                        this.get('equation')
                    );
                }
            }
        });

        model.Tags = DrowsyCollection.extend({
            model: model.Tag,
            url: app.drowsyURL + "/sideboard_tags"
        });

        model.TagBalloon = DrowsyModel.extend({
            urlRoot: app.drowsyURL + "/sideboard_tag_balloons",
            addTag: function (tag) {
                if (!this.getType()) {
                    console.error("Cannot add tag to this balloon because the balloon does not have a valid type.", this);
                    return;
                } else if (!tag.getType()) {
                    console.error("Cannot add tag to this balloon because the tag does not have a valid type.", tag);
                    return;
                } else if (this.getType() !== tag.getType()) {
                    var err = "Cannot add '"+tag.getType()+"' tag to '"+this.getType()+"' balloon!";
                    console.error(err);
                }

                if (!this.get('tags'))
                    this.set('tags', []);

                var dbref = { '$ref': 'sideboard_tags', '$id': tag.id };
                this.get('tags').push(dbref);

                if (!this.get('contributors'))
                    this.set('contributors', []);

                this.get('contributors').push(tag.get('author'));
            },
            getType: function () {
                if (this.has('principle')) {
                    return 'principle';
                } else if (this.has('problem')) {
                    return 'problem';
                } else if (this.has('equation')) {
                    return 'equation';
                } else if (this.has('assumption') || this.has('variable')) {
                    return 'assvar';
                } else {
                    var err = "Invalid balloon data!";
                    console.error(err, this.toJSON());
                    return undefined;
                }
            },
            grouping: function () {
                var type = this.getType();

                if (type == 'assvar') {
                    if (this.has('assumption'))
                        return 'assumption-'+MD5.hexdigest(this.get('assumption'));
                    else
                        return 'variable-'+MD5.hexdigest(this.get('variable'));
                } else {
                    return type + '-' + 
                    MD5.hexdigest(
                        this.get('principle') || 
                        this.get('problem') ||
                        this.get('equation')
                    );
                }
                
            }
        });

        model.TagBalloons = DrowsyCollection.extend({
            model: model.TagBalloon,
            url: app.drowsyURL + "/sideboard_tag_balloons"
        });

        model.BoardState = DrowsyModel.extend({
            urlRoot: app.drowsyURL + "/sideboard_states"
        });

        model.BoardStates = DrowsyCollection.extend({
            model: model.BoardState,
            url: app.drowsyURL + "/sideboard_states"
        });

        createNecessaryCollections([
            'sideboard_tags',
            'sideboard_tag_balloons',
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