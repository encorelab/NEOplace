/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.SideBoard = (function() {
    var app = {};

    app.curnit = 'NEOplace';
    app.name = "NEOplace.SideBoard";

    var requiredConfig = {
        xmpp: { 
            domain: "string", 
            port: "number" 
        },
        rollcall: {
            url: "string"
        },
        assets: {
            url: "string"
        },
        mongo: {
            url: "string"
        }
    };

    app.init = function() {
        Sail.verifyConfig(app.config, requiredConfig);
        console.log("Configuration is valid.");

        app.run = app.run || JSON.parse(jQuery.cookie('run'));
        if (app.run) {
            app.groupchatRoom = app.run.name + '@conference.' + app.xmppDomain;
        }

        var userFilter = function (u) { return u.account.login.match(/sideboard/); };

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: app.curnit, userFilter: userFilter})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget', {indicatorContainer: 'body', clickNameToLogout: true})
            .thenRun(function () {
                Sail.autobindEvents(app);

                jQuery(app).trigger('initialized');
                return true;
            });

        app.rollcall = new Rollcall.Client(app.config.rollcall.url);
    };

    app.authenticate = function () {
        app.token = app.rollcall.getCurrentToken();

        if (!app.run) {
            Rollcall.Authenticator.requestRun();
        } else if (!app.token) {
            Rollcall.Authenticator.requestLogin();
        } else {
            app.rollcall.fetchSessionForToken(app.token, function(data) {
                    app.session = data;
                    jQuery(app).trigger('authenticated');
                },
                function(error) {
                    console.warn("Token '"+app.token+"' is invalid. Will try to re-authenticate...");
                    Rollcall.Authenticator.unauthenticate();
                }
            );
        }
    };

    app.loadVideo = function (videoId) {
        jQuery.ajax('http://neoplace.aardvark.encorelab.org/assets/videos.html', {
            success: function (html) {
                var iframe = jQuery(html).filter('iframe#'+videoId);
                jQuery('#video-screen')
                    .append(iframe);
            }
        });
    };

    app.identifyBoard = function (board) {
        jQuery('#sideboard-label')
            .show()
            .text(board);
    };

    app.restoreState = function () {
        if (true /* initial */) {
            jQuery('.yup-nope-sorting').hide();
            var tags = new app.model.Tags();
            tags.on('reset', function (coll) {
                this.each(function (t) {
                    app.addTag(t, true);
                });
            });
            tags.fetch();
        } else if (false /* we're sorting */) {
            jQuery('.yup-nope-sorting').show();
        } 
    };

    app.positionTagBalloon = function (balloon) {
        var left, top;

        var boardWidth = jQuery("#sorting-space").width();
        var boardHeight = jQuery("#sorting-space").height();
        
        
        left = Math.random() * (boardWidth - balloon.width());
        top = Math.random() * (boardHeight - balloon.height());
        
        balloon.css({
            left: left + 'px',
            top: top + 'px'
        });
        
        var tags = balloon.data('tags');

        _.each(tags, function (t) {
            t.save({pos: {left: left, top: top}}); // TODO: do all of the updates in one request or save group positions instead of each individual tag position
        });
    };

    app.addTag = function (tag, restoring) {
        existingBalloon = jQuery("#principle-" + MD5.hexdigest(tag.get('principle')));
            
        if (existingBalloon.length == 0) {
            app.createTagBalloon(tag, restoring);
        } else {
            app.incrementTagBalloon(existingBalloon, tag, restoring);
        }
    };

    app.createTagBalloon = function (tag, restoring) {
        // this function creates the balloon, adds the text, positions it on the board
        var balloon = jQuery("<div class='balloon'></div>");

        balloon.data('tags', [tag]);
        balloon.addClass('author-' + tag.get('author'));
        balloon.addClass('tag-' + tag.id);

        // md5tags = _.map(contribution.tags, function(t) {return MD5.hexdigest(t);});
        // _.each(md5tags, function (t) {
        //     balloon.addClass('-' + t);
        // });

        balloon.hide(); // initially hidden, we call show() with an effect later

        // var author = jQuery("<div class='author'>");
        // author.text(tag.get('author'));
        // balloon.prepend(author);

        var labelText;
        switch(tag.getType()) {
            case 'principle':
                var principle = tag.get('principle');
                var label = jQuery("<div class='label'></div>");
                label.text(principle);
                balloon.append(label);

                balloon.attr('id', "principle-" + MD5.hexdigest(principle));
                break;
        }        

        balloon.draggable({
            stop: function (ev, ui) {
                _.each(jQuery(this).data('tags'), function (t) {
                    t.save({pos: ui.position}); // TODO: do all of the updates in one request or save group positions instead of each individual tag position
                });
            }
        });

        // BANDAID: For some reason in Chrome draggable() makes balloon's position 'relative'...
        //          Need to reset it back to absolute for proper positioning within the wall.
        balloon.css('position', 'absolute');

        // bring the balloon to the top when clicked
        balloon.mousedown(app.bringDraggableToFront);

        jQuery("#sorting-space").append(balloon);
        
        if (tag.has('pos')) {
            balloon.css({
                left: tag.get('pos').left + 'px',
                top: tag.get('pos').top + 'px'
            });
        } else { 
            app.positionTagBalloon(balloon);
        }
        
        if (!restoring)
            balloon.addClass('new');
        
        balloon.show();

        return balloon;
    };

    app.incrementTagBalloon = function (balloon, tag, restoring) {
        balloon.data('tags').push(tag);
        balloon.addClass('author-' + tag.get('author'));
        balloon.addClass('tag-' + tag.id);

        tag.save({pos: balloon.position()});

        var counter = balloon.find('.counter');
        if (counter.length == 0) {
            counter = jQuery("<div class='counter'></div>");
            counter.data('count', 1);
            balloon.append(counter);
        }

        if (!restoring)
            counter.effect('highlight', 'slow');
        
        counter.data('count', counter.data('count') + 1);
        counter.text(counter.data('count'));

    };

    app.bringDraggableToFront = function () {
        var zs = jQuery('.ui-draggable').map(function() {
            var z = jQuery(this).css('z-index'); 
            return z === 'auto' ? 100 : parseInt(z, 10);
        }).toArray();
        var maxZ = Math.max.apply(Math, zs);
        jQuery(this).css('z-index', maxZ + 1);
    };
    
    return app;
})();
