/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */
(function(app) {
    var events = {};
    events.sail = {};

    /* INCOMING SAIL EVENTS */


    events.sail.student_principle_submit = function(sev) {

        // TODO: consider only creating the balloon after the tag
        //       has been successfully saved (delay might be annoying though)
        
    };

    events.sail.start_sort = function (sev) {

    };

    /* METHODS THAT TRIGGER OUTGOING SAIL EVENTS */

    app.submitLogin = function(userName, groupName) {
    
    };

    /* LOCAL EVENTS */

    // triggered when Sail.app.init() is done
    events.initialized = function (ev) {
        app.authenticate();
    };

    events['ui.initialized'] = function (ev) {
    };

    // triggered when the user has authenticated but is not yet in the XMPP chat channel
    events.authenticated = function (ev) {
       
    };

    // triggered when the user has authenticated and connected to the XMPP chat channel
    events.connected = function (ev) {
        jQuery("#location-environment").fadeIn('slow', function() {
           
            app.spawnPlayers();
            app.setCurrentTask(1);
            app.frontboardTrackerProcessor();
    
            app.animateTaskCompletion(1, 1);
            
        });
    };

    events.unauthenticated = function (ev) {
    };

    events.location_set = function (ev) {
    };

    app.events = events;
})(NEOplace.FrontWall);