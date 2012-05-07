/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);


    /** private function **/
    var foo = function () {

    };

    /** public function **/
    self.bar = function () {

    };

    /** local event wiring **/

    self.events = {
        // triggered when Sail.app.init() is done
        initialized: function(ev) {
            // we're initialized sto start the authentication process
            Sail.app.authenticate();
        },

        // triggered when the UI is ready
        'ui.initialized': function(ev) {
            // set up any UI stuff here
        },

        // triggered when the user has authenticated but is not yet in the XMPP chat channel
        authenticated: function(ev) {

        },

        // triggered when the user has authenticated and connected to the XMPP chat channel
        connected: function(ev) {

            // request detailed data about current user from Rollcall
            Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
                console.log("Authenticated user is: ", data);
                // user's metadata is in data.metadata
            });
        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
        }
    };

    /** sail event wiring (i.e. XMPP events) **/

    self.events.sail = {
        some_sail_event: function (sev) {

        }
    };

    // only users matching this filter will be shown in the account picker
    self.userFilter = function (u) {
        return u.kind === "Student";
    };

    
    return self;
})(NEOplace.Tablet);
