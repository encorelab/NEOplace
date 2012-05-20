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

            //TODO: I need to know what group they are in
            $("#loginScreen #statusMsg").html('You have been assigned to <strong>{group #2}</strong>.<br /><br />');

            //TODO:faked. This needs to be triggered by classroom_start event
            //setTimeout(classroomStart,5000);
            //function classroomStart(){
                //Note: could be better to maybe just go to the next page right away?
                //esp if they are seeing this because they had to refresh the app
                $("#loginScreen #statusMsg").append('<img src="/assets/img/group_gather.gif" width="300" height="208" alt="" /><br />When your group is together and ready to go, tap the Start button.');
                $("#startButton").css("display","block");
            //}

            //
            $( '#principleReview' ).live( 'pageinit',function(event){

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
                for (var i=0; i<numTags; i++){
                    var tag = peerTagsResults[i];
                    output += '<input type="checkbox" name="checkbox-'+tag.id+'" id="checkbox-'+tag.id+'" class="custom" /> \
                                <label for="checkbox-'+tag.id+'">'+tag.name+' \
                                <span class="peer-count">'+tag.votes+'</span> \
                                </label>';
                }
                $("#principleReview #peerTags").append(output).trigger("create");

            });

            //
            $( '#principleConsensus' ).live( 'pageinit',function(event){

                //TODO: part of dynamic call
                var problem = {
                    name: "TruckAndCrate"
                }

                //$("#problem").append(output);

                //TODO: array needs to a result of a backend call
                var peerTagsResults = [
                    {id:1, name:"Newton's Second Law", submitted:[1,2]},
                    {id:2, name:"Acceleration", submitted:[1,2,3]},
                    {id:4, name:"Fnet = 0", submitted:[2,3]}
                ];

                var numTags = peerTagsResults.length;
                var output = '<table>';
                output += '<tr><td width="200"></td><th width="100">&nbsp; you</th><th width="100">2</th><th width="100">3</th></tr>';
                var yes = "✔";
                var no = "x";
                for (var i=0; i<numTags; i++){
                    var tag = peerTagsResults[i];
                    output += '<tr><th>'+tag.name+'</th>';
                    output += '<td>'+'<input type="checkbox" name="checkbox-'+tag.id+'" id="checkbox-'+tag.id+'" class="custom" ';
                    output += (tag.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                    output += ' /><label for="checkbox-'+tag.id+'"></label>'+'</td>';
                    output += '<td>'
                    output += (tag.submitted.indexOf(2) > -1) ? yes : no;
                    output += '</td>';
                    output += '<td>';
                    output += (tag.submitted.indexOf(3) > -1) ? yes : no;
                    output += '</td>';
                    output += '</tr>';
                }
                output += "</table>";
                $("#principleConsensus #peerTags").append(output).trigger("create");

                //TODO: Client (not agent) will detect whether or not they are in agreement
                //$("#principleConsensus #continueButton").css({ opacity: 1 });

            });

            //equationsReview
            $( '#equationsReview' ).live( 'pageinit',function(event){

                //TODO: array needs to a result of a backend call
                var peerEquationResults = [
                    {id:1, name:"d=vt + 1/2at^2", votes:1},
                    {id:2, name:"v2 = v1 +a*t", votes:2},
                    {id:3, name:"d = (v1+v2)/2*t", votes:4},
                    {id:4, name:"Fnet = m*a", votes:2},
                    {id:5, name:"W = F*d*cosΘ", votes:1},
                    {id:6, name:"PE = m*g*h", votes:3},
                    {id:7, name:"KE = 1/2*m*v^2", votes:1},
                    {id:8, name:"P = W/t", votes:1},
                    {id:9, name:"d=vt", votes:6}
                ];

                var numTags = peerEquationResults.length;
                var halfway = Math.round(numTags/2);
                var output = "";
                for (var i=0; i<numTags; i++){
                    var tag = peerEquationResults[i];
                    
                    output += '<input type="checkbox" name="checkbox-'+tag.id+'" id="checkbox-'+tag.id+'" class="custom" /> \
                        <label for="checkbox-'+tag.id+'">'+tag.name+' \
                        <span class="peer-count">'+tag.votes+'</span> \
                        </label>';

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

            //equationConsensus
            $( '#equationConsensus' ).live( 'pageinit',function(event){

                //TODO: part of dynamic call
                var problem = {
                    name: "TruckAndCrate"
                }

                //$("#problem").append(output);

                //TODO: array needs to a result of a backend call
                var equationResultss = [
                    {id:1, name:"d=vt + 1/2at^2", submitted:[2]},
                    {id:2, name:"Fnet = m*a", submitted:[1,2,3]},
                    {id:4, name:"KE = 1/2*m*v^2", submitted:[1,3]}
                ];

                var numTags = equationResultss.length;
                var output = '<table>';
                output += '<tr><td width="200"></td><th width="100">&nbsp; you</th><th width="100">2</th><th width="100">3</th></tr>';
                var yes = "✔";
                var no = "x";
                for (var i=0; i<numTags; i++){
                    var equation = equationResultss[i];
                    output += '<tr><th>'+equation.name+'</th>';
                    output += '<td>'+'<input type="checkbox" name="checkbox-'+equation.id+'" id="checkbox-'+equation.id+'" class="custom" ';
                    output += (equation.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                    output += ' /><label for="checkbox-'+equation.id+'"></label>'+'</td>';
                    output += '<td>'
                    output += (equation.submitted.indexOf(2) > -1) ? yes : no;
                    output += '</td>';
                    output += '<td>';
                    output += (equation.submitted.indexOf(3) > -1) ? yes : no;
                    output += '</td>';
                    output += '</tr>';
                }
                output += "</table>";
                $("#equationConsensus #peerTags").append(output).trigger("create");

                //TODO: Client (not agent) will detect whether or not they are in agreement
                //$("#principleConsensus #continueButton").css({ opacity: 1 });

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
