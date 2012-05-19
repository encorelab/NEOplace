/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = true; 

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
            console.log( "test: " + !UI_TESTING_ONLY );
            if ( !UI_TESTING_ONLY ) {
                Sail.app.authenticate();
            }
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
            if ( !UI_TESTING_ONLY ) {
                Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
                    console.log("Authenticated user is: ", data);
                    // user's metadata is in data.metadata
                });
            }

            //show the first screen
            $("#startButton").css("display","block");
            //element.webkitRequestFullScreen(); 
            //element.requestFullscreen();

            //
            $( '#groupPrincipleReview' ).live( 'pageinit',function(event){

                //TODO: part of dynamic call
                var problem = {
                    name: "TruckAndCrate"
                }

                //$("#problem").append(output);

                //TODO: array needs to a result of a backend call
                var peerTagsResults = [
                    {id:1, name:"Newton's Second Law", votes:2},
                    {id:2, name:"Acceleration", votes:7},
                    {id:3, name:"Static Friction", votes:4},
                    {id:4, name:"Fnet = 0", votes:5}
                ];

                var numTags = peerTagsResults.length;
                var output = "";
                var output2 = "";
                for (var i=0; i<numTags; i++){
                    var tag = peerTagsResults[i];
                    output += '<input type="checkbox" name="checkbox-'+tag.id+'" id="checkbox-'+tag.id+'" class="custom" /> \
                                <label for="checkbox-'+tag.id+'">'+tag.name+' \
                                <span class="ui-li-count ui-btn-up-c ui-btn-corner-all">'+tag.votes+'</span> \
                                </label>';
                    //output2 += tag.votes + '<br />';
                }
                $("#peerTags").append(output).trigger("create");
                //var checkboxes = $("#peerTags input[type='checkbox']"); //.checkboxradio("refresh");
                //checkboxes.checkboxradio("refresh");

                //$("#tagVotes").append(output2);

            });

            //
            $( '#equationOrdering' ).live( 'pageinit',function(event){

                //TODO: array needs to a result of a backend call
                var peerEquationResults = [
                    {id:1, name:"d=vt + 1/2at^2"},
                    {id:2, name:"v2 = v1 +a*t"},
                    {id:3, name:"d = (v1+v2)/2*t"},
                    {id:4, name:"Fnet = m*a"},
                    {id:5, name:"W = F*d*cosΘ"},
                    {id:6, name:"PE = m*g*h"},
                    {id:7, name:"KE = 1/2*m*v^2"},
                    {id:8, name:"P = W/t"},
                    {id:9, name:"d=vt"}
                ];

                var numTags = peerEquationResults.length;
                var halfway = Math.round(numTags/2);
                var output = "";
                for (var i=0; i<numTags; i++){
                    var tag = peerEquationResults[i];
                    output += '<input type="checkbox" name="checkbox-'+tag.id+'" id="checkbox-'+tag.id+'" class="custom" /><label for="checkbox-'+tag.id+'">'+tag.name+'</label>';
                    
                    //if halfway through list, create new column
                    if ( i == halfway-1 ) {
                        $("#peerEquations #eqCol1").append(output);
                        output = "";
                    }
                }
                $("#peerEquations #eqCol2").append(output)
                $("#peerEquations").trigger("create");

                var checkboxes = $("#peerEquations input[type='checkbox']"); //.checkboxradio("refresh");
                checkboxes.checkboxradio("refresh");

                //update formatting of equations
                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

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

    //TODO: remove, for testing only without authenticating
    if ( UI_TESTING_ONLY ) {
        self.events.connected();
    }
    
    return self;
})(NEOplace.Tablet);
