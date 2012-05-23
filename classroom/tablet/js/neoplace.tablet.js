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

        Sail.modules
            .load('Rollcall.Authenticator', {
                mode: 'username-and-password', 
                askForRun: false, 
                curnit: 'NEOplace', 
                userFilter: self.userFilter
            })
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget', {indicatorContainer: 'body'})
            .thenRun(function () {
                Sail.autobindEvents(Sail.app);

                jQuery(Sail.app).trigger('initialized');
                return true;
            });
    };

    self.authenticate = function () {
        Sail.app.token = Sail.app.rollcall.getCurrentToken();

        // wrap Rollcall.Authenticator.loginFromSession so that we fetch the run first
        // based on user's data
        var origLoginFromSession = Rollcall.Authenticator.loginFromSession;
        Rollcall.Authenticator.loginFromSession = function(data) {
            Sail.app.rollcall.request(Sail.app.rollcall.url + '/users/'+data.account.login+'/runs.json', 
                'get', null, 
                function (runs) {
                    if (runs.length > 1) {
                        console.warn("'"+Sail.app.session.account.login+"' belongs to more than one run! Will use the first one...");
                    } else if (runs.length < 1) {
                        err = "'"+Sail.app.session.account.login+"' does not belong to any runs!";
                        console.error(err);
                        alert(err);
                    } else {
                        Sail.app.run = runs[0];
                        console.log("'"+data.account.login+"' is in run '"+Sail.app.run.name+"'...");
                        //$.cookie('run', JSON.stringify(Sail.app.run))
                        
                        origLoginFromSession(data);
                    }
                },
                function (error) {
                    console.error(error);
                    alert("Failed to retrieve the run for '"+Sail.app.session.account.login+"'!");
                }
            );

        };

        if (!Sail.app.token) {
            Rollcall.Authenticator.requestLogin();
        } else {
            Sail.app.rollcall.fetchSessionForToken(Sail.app.token, 
                Rollcall.Authenticator.loginFromSession,
                function(error) {
                    console.warn("Token '"+Sail.app.token+"' is invalid. Will try to re-authenticate...");
                    Rollcall.Authenticator.unauthenticate();
                }
            );
        }
    };
    
    return self;
})();
