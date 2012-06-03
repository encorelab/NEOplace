/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */
(function(app) {
    var events = {};
    events.sail = {};
    app.events = events;
    
    var localeMapper = {};
    localeMapper["A"] = 1;
    localeMapper["B"] = 2;
    localeMapper["C"] = 3;
    localeMapper["D"] = 4;
    
    var activityMapper = {};
    activityMapper["video_tagging"] = 1;
    activityMapper["principle_sorting"] = 2;
    activityMapper["equation_adding"] = 3;
    activityMapper["video_answer"] = 4;
    
    
    
    app.events = {
      initialized: function (ev) {
            app.authenticate();
        },
        
        // triggered when the user has authenticated and connected to the XMPP chat channel
        connected: function (ev) {
        jQuery("#location-environment").fadeIn('slow', function() {
           
            /*app.testSpawnPlayers();
            app.setCurrentTask(1);
            app.frontboardTrackerProcessor();
    
            app.animateTaskCompletion(1, 1);*/
            app.showWelcomeScreen();
            app.frontboardTrackerProcessor();
            
        });
        }  
    };
    
    /* INCOMING SAIL EVENTS */
    
    app.events.sail = {

        // testing event for debugging
        test_event: function(sev) {
            alert('heard the event');
        },
        // user has checked into the 
       check_in: function(sev) {
            var locale = sev.payload.location.toUpperCase(); //A,B,C,D
            var playerID = sev.origin;

            app.hideWelcomeScreen();
            app.addPlayer(playerID, localeMapper[locale]);
       },
       location_assignment: function(sev) {
            var playerID = sev.payload.student;
            var locale = sev.payload.location.toUpperCase(); //A,B,C,D
            
            app.stopTask();
            app.hideWelcomeScreen();
            app.addPlayer(playerID, localeMapper[locale]);   
       },
       activity_started: function(sev) {
            var activity = sev.payload.activity_name.toLowerCase();
            app.hideGameOverScreen();
            app.setCurrentTask(activityMapper[activity]);
       },
       next_video: function(sev) {
            app.stopTask();
            app.hideGameOverScreen();
       },
       start_sort: function(sev) {
            if (app.localeHasPlayers(localeMapper['A'])) {
                app.animateTaskCompletion(localeMapper['A'], 1);
            }
            
            if (app.localeHasPlayers(localeMapper['B'])) {
                app.animateTaskCompletion(localeMapper['B'], 1);
            }
            
            if (app.localeHasPlayers(localeMapper['C'])) {
                app.animateTaskCompletion(localeMapper['C'], 1);
            }
            
            if (app.localeHasPlayers(localeMapper['D'])) {
                app.animateTaskCompletion(localeMapper['D'], 1);
            }
       },
       videowall_principles_commit: function(sev) {
            var locale = sev.payload.origin.toUpperCase(); //A,B,C,D;
            app.animateTaskCompletion(localeMapper[locale], 2);
       },
       videowall_problems_commit: function(sev) {
            var locale = sev.payload.origin.toUpperCase(); //A,B,C,D;
            app.animateTaskCompletion(localeMapper[locale], 3);
       },
       videowall_equations_commit: function(sev) {
            var locale = sev.payload.origin.toUpperCase(); //A,B,C,D;
            app.animateTaskCompletion(localeMapper[locale], 4);
       },
       videowall_assumptions_variables_commit: function(sev) {
            var locale = sev.payload.origin.toUpperCase(); //A,B,C,D;
            app.animateTaskCompletion(localeMapper[locale], 5);
       },
       video_answer_complete: function(sev) {
            var locale = sev.payload.origin.toUpperCase(); //A,B,C,D;
            app.animateTaskCompletion(localeMapper[locale], 6);
       }
    };


   
})(NEOplace.FrontWall);