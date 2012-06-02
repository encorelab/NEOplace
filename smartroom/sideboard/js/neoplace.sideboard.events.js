/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

(function(app) {
    var events = {};
    events.sail = {};

    /* INCOMING SAIL EVENTS */

    var forMe = function (sev) {
        return sev.payload.location === app.location;
    };

    events.sail.student_principle_submit = function(sev) {
        if (!forMe(sev)) return;

        var tag = new app.model.Tag({
            location: sev.payload.location,
            principle: sev.payload.principle,
            video_url: jQuery('#video-screen iframe').attr('src'),
            author: sev.origin
        });
        tag.save();

        app.addTag(tag);

        // TODO: consider only creating the balloon after the tag
        //       has been successfully saved (delay might be annoying though)
        
    };

    events.sail.start_sort = function (sev) {
        if (!forMe(sev)) return;

        switch (sev.payload.step) {
            case 'principle_sort':
                app.switchToSortingPrinciples();
                break;
        }
    };

    /* METHODS THAT TRIGGER OUTGOING SAIL EVENTS */

    app.submitLogin = function(userName, groupName) {
        var sev = new Sail.Event('login', {
            user_name:userName,
            group_name:groupName
        });
        Sail.app.groupchat.sendEvent(sev);
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
        jQuery('#auth-indicator').addClass('widget-box');

        app.rollcall.fetchUser(app.session.account.login, {}, 
            function (data) {
                app.user = data;
                app.location = data.metadata.location;
                jQuery(app).trigger('location_set');
            },
            function () {
                var err = "Couldn't get user information for '"+app.session.account.username+"'!";
                console.error(err);
                alert(err);
                Rollcall.Authenticator.unauthenticate();
            }
        );
    };

    // triggered when the user has authenticated and connected to the XMPP chat channel
    events.connected = function (ev) {

    };

    events.unauthenticated = function (ev) {
    };

    events.location_set = function (ev) {
        app.loadVideo(app.location);
        app.identifyBoard(app.location);
        app.restoreState();
    };

    app.events = events;
})(NEOplace.SideBoard);