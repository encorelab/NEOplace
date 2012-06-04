/*jshint browser: true, devel: true */
/*globals Sail, jQuery, Rollcall */
var NEOplace = window.NEOplace || {};

NEOplace.Tablet = (function() {
    "use strict";
    var self = {};

    /** The code below initializes this Sail.app and Sail.modules and takes care of authentication **/

    self.init = function() {
        Sail.app.rollcall = new Rollcall.Client(Sail.app.rollcallURL);

        Sail.app.run = Sail.app.run || JSON.parse(jQuery.cookie('run'));
        if (Sail.app.run) {
            Sail.app.groupchatRoom = Sail.app.run.name + '@conference.' + Sail.app.xmppDomain;
        }

        var userFilter = function (u) {
            return u.account.kind === 'Student';
        };

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'username-and-password', askForRun: true, curnit: 'NEOplace', userFilter: userFilter})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget')
            .thenRun(function () {
                Sail.autobindEvents(Sail.app);

                jQuery(Sail.app).trigger('initialized');
                return true;
            });
    };

    self.authenticate = function () {
        Sail.app.token = Sail.app.rollcall.getCurrentToken();

        if (!Sail.app.run) {
            Rollcall.Authenticator.requestRun();
        } else if (!Sail.app.token) {
            Rollcall.Authenticator.requestLogin();
        } else {
            Sail.app.rollcall.fetchSessionForToken(Sail.app.token, function(data) {
                    Sail.app.session = data;
                    jQuery(Sail.app).trigger('authenticated');
                },
                function(error) {
                    console.warn("Token '"+Sail.app.token+"' is invalid. Will try to re-authenticate...");
                    Rollcall.Authenticator.unauthenticate();
                }
            );
        }
    };
    
    return self;
})();
