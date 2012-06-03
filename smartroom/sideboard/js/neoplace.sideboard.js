/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace, MD5 */

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

        app.loadEquations();
        app.loadProblems();
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

    app.loadVideo = function (key) {
        jQuery.ajax(Sail.app.config.assets.url + '/videos.html', {
            success: function (html) {
                var iframe = jQuery(html).filter('iframe#'+key);
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

    app.loadChallengeQuestion = function (key) {
        jQuery.ajax(Sail.app.config.assets.url + '/challenge_questions.json', {
            dataType: 'json',
            success: function (data) {
                var cq = jQuery('#challenge-question');
                if (cq.length === 0) {
                    cq = jQuery('<div id="challenge-question" class="widget-box"></div>');
                    cq.css('top', '-100px');
                    jQuery('#right-half').prepend(cq);
                    setTimeout(function () {
                        cq.css('top', '0px');
                    }, 1000);
                    
                }

                if (data[key])
                    cq.text(data[key]);
                else
                    console.log("No challenge question found under key '"+key+"'!", data);
            }
        });
    };

    app.loadEquations = function () {
        jQuery.ajax(Sail.app.config.assets.url + '/equations.json', {
            dataType: 'json',
            success: function (data) {
                app.equations = data;
                jQuery(app).trigger('equations_loaded');
            }
        });
    };

    app.loadProblems = function () {
        jQuery.ajax(Sail.app.config.assets.url + '/problems.json', {
            dataType: 'json',
            success: function (data) {
                app.problems = data;
                jQuery(app).trigger('problems_loaded');
            }
        });
    };

    // not really used right now
    app.loadPrinciples = function () {
        jQuery.ajax(Sail.app.config.assets.url + '/principles.json', {
            dataType: 'json',
            success: function (data) {
                app.principles = data;
                jQuery(app).trigger('principles_loaded');
            }
        });
    };


    /*** STATES *****/

    app.restoreState = function () {
        app.balloons = new app.model.TagBalloons();
        app.committed = new app.model.TagBalloons();

        // FIXME: kind of an odd place to put this
        app.committed.on('add', function (b) {
            new app.view.CommittedBalloonView({model: b})
                        .render();
        });

        if (!app.location)
            throw "Cannot restore state because this board's location has not yet been set!";

        var restore = function (state) {
            switch (state.get('step')) {
                case 'principle-tagging': // default state
                case null:
                case undefined:
                    app.restoreToPrincipleTagging();
                    break;
                case 'principle-sorting':
                    app.restoreToPrincipleSorting();
                    break;
                case 'problem-tagging':
                    app.restoreToProblemTagging();
                    break;
                case 'problem-sorting':
                    app.restoreToProblemSorting();
                    break;
                case 'equation-tagging':
                    app.restoreToEquationTagging();
                    break;
                case 'equation-sorting':
                    app.restoreToEquationSorting();
                    break;
                case 'assvar-tagging':
                    app.restoreToAssvarTagging();
                    break;
                case 'assvar-sorting':
                    app.restoreToAssvarTagging();
                    break;
            }
        };

        new app.model.BoardStates().fetch({
            data: {selector: JSON.stringify({location: app.location})},
            success: function (states) {
                var state = states.first();
                if (!state) {
                    console.log("No state found for board '"+app.location+"'...");
                    state = new app.model.BoardState({location: app.location});
                } else {
                    console.log("Restoring board '"+app.location+"' with state: ", state);
                }
                
                app.state = state;

                restore(state);
            }
        });
    };

    app.restoreBalloons = function () {
        this.balloons.fetch({
            data: { 
                selector: JSON.stringify({
                    '$or': [
                        {committed: {'$exists': false}},
                        {committed: false}
                    ],
                    location: app.location
                }) 
            },
            success: function (balloons) {
                balloons.each(function (b) {
                    new app.view.TagBalloonView({model: b})
                        .render();
                });
            }
        });
    };

    app.restoreCommitted = function () {
        this.committed.fetch({
            data: { 
                selector: JSON.stringify({
                    sorted_as: 'accepted',
                    committed: true,
                    location: app.location
                }) 
            },
            success: function (balloons) {
                balloons.each(function (b) {
                    new app.view.CommittedBalloonView({model: b})
                        .render();
                });
            }
        });
    };

    app.restoreToPrincipleTagging = function () {
        console.log("Restoring to principle tagging activity...");
        app.restoreBalloons();
    };

    app.restoreToPrincipleSorting = function () {
        console.log("Restoring to principle sorting activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-principle-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingPrinciples); 
        app.loadChallengeQuestion(app.location);
    };

    app.restoreToProblemTagging = function () {
        console.log("Restoring to problem tagging activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-problem-tagging');
        app.view.unmakeSortingSpaceDroppable();
        app.loadChallengeQuestion(app.location);
        app.restoreCommitted();
    };

    app.restoreToProblemSorting = function () {
        console.log("Restoring to problem sorting activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-problem-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingProblems); 
        app.loadChallengeQuestion(app.location);
        app.restoreCommitted();
    };

    app.restoreToEquationTagging = function () {
        console.log("Restoring to equation tagging activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-equation-tagging');
        app.view.unmakeSortingSpaceDroppable();
        app.loadChallengeQuestion(app.location);
        app.restoreCommitted();
    };

    app.restoreToEquationSorting = function () {
        console.log("Restoring to equation sorting activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-equation-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingEquations); 
        app.loadChallengeQuestion(app.location);
        app.restoreCommitted();
    };

    app.restoreToAssvarTagging = function () {
        console.log("Restoring to assvar tagging activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-assvar-tagging');
        app.view.unmakeSortingSpaceDroppable();
        app.loadChallengeQuestion(app.location);
        app.restoreCommitted();
    };

    app.restoreToAssvarSorting = function () {
        console.log("Restoring to assvar sorting activity...");
        app.restoreBalloons();
        jQuery('#sideboard').attr('class', 'step-assvar-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingAssvars); 
        app.loadChallengeQuestion(app.location);
        app.restoreCommitted();
    };



    /*** TRANSITIONS *****/

    app.switchToPrincipleSorting = function () {
        console.log("Switching to principle sorting activity...");

        // TODO: move this to app.view
        jQuery('.balloon').each(function () {
            var balloon = jQuery(this);
            balloon.css({
                '-moz-transition': 'all 1s ease-out',
                '-webkit-transition': 'all 1s ease-out',
                'transition': 'all 1s ease-out'
            });
            balloon.css('left', ((balloon.position().left - balloon.width()/2) * 0.5) + 'px');

            setTimeout(function () {
                balloon.css({
                    '-moz-transition': '',
                    '-webkit-transition': '',
                    'transition': ''
                });

                balloon.data('view').model.save({pos: balloon.position()});
            }, 1500);
        });

        setTimeout(function () {
            app.loadChallengeQuestion(app.location);
        }, 2000);

        jQuery('#sideboard').attr('class', 'step-principle-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingPrinciples);
        
        app.state.save({step: 'principle-sorting'});

    };

    app.switchToProblemTagging = function () {
        console.log("Switching to problem tagging activity...");

        app.restoreBalloons(); // won't fetch committed balloons, so we start fresh

        jQuery('#sideboard').attr('class', 'step-problem-tagging');
        app.view.unmakeSortingSpaceDroppable();
        
        app.state.save({step: 'problem-tagging'});
    };

    app.switchToProblemSorting = function () {
        console.log("Switching to problem sorting activity...");

        jQuery('#sideboard').attr('class', 'step-problem-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingProblems);
        
        app.state.save({step: 'problem-sorting'});

    };

    app.switchToEquationTagging = function () {
        console.log("Switching to equation tagging activity...");

        app.restoreBalloons(); // won't fetch committed balloons, so we start fresh

        jQuery('#sideboard').attr('class', 'step-equation-tagging');
        app.view.unmakeSortingSpaceDroppable();
        
        app.state.save({step: 'equation-tagging'});
    };

    app.switchToEquationSorting = function () {
        console.log("Switching to problem sorting activity...");

        jQuery('#sideboard').attr('class', 'step-equation-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingEquations);
        
        app.state.save({step: 'equation-sorting'});
    };

    app.switchToAssvarTagging = function () {
        console.log("Switching to assvar tagging activity...");

        app.restoreBalloons(); // won't fetch committed balloons, so we start fresh

        jQuery('#sideboard').attr('class', 'step-assvar-tagging');
        app.view.unmakeSortingSpaceDroppable();
        
        app.state.save({step: 'assvar-tagging'});
    };

    app.switchToAssvarSorting = function () {
        console.log("Switching to assvar sorting activity...");

        jQuery('#sideboard').attr('class', 'step-assvar-sorting');
        app.view.makeSortingSpaceDroppable(app.events.doneSortingAssvars);
        
        app.state.save({step: 'assvar-sorting'});
    };

    
    
    return app;
})();
