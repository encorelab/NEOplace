/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    self.userData;
    self.groupData = {};            // why does this need to be public?!
    var currentProblem;

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = false; 

    /** private function **/
    var foo = function () {

    };


    self.escapeSelectorString = function(str) {
        if(str)
            return str.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
        else
            return str;
    }    

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

                    if (data.groups[1]) {
                        console.log('WARNING: user has been assigned to more than one group, chosing first group in the list');
                    }
                    $("#loginScreen #statusMsg").html('You have been assigned to <strong>'+data.groups[0].name+'</strong>.<br /><br />');

                    Sail.app.groupData.name = data.groups[0].name;
                    Sail.app.groupData.members = ["joe","mike","colin"];              // TODO remove and wait for group_presence

                    Sail.app.userData = data;

                    Sail.app.submitLogin(data.account.login, data.groups[0].name);
                });
            }

            




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

                //TODO: part of dynamic call (make global?)
                var problem = {
                    name: "TruckAndCrate"
                }

                //$("#problem").append(output);

                //TODO: array needs to a result of a backend call (are we doing this with a REST call or through an agent?)
                var peerTagsResults = [
                    {id:1, name:"Newton's Second Law", votes:2},
                    {id:2, name:"Acceleration", votes:7},
                    {id:3, name:"Static Friction", votes:4},
                    {id:4, name:"Fnet = 0", votes:5}
                ];

                var numTags = peerTagsResults.length;                       // this checkbox-id setup is going to result in duplicate ids, no?
                var output = "";
                for (var i=0; i<numTags; i++){
                    var tag = peerTagsResults[i];
                    output += '<input type="checkbox" name="'+tag.name+'" id="checkbox-'+tag.id+'" class="custom" /> \
                                <label for="checkbox-'+tag.id+'">'+tag.name+' \
                                <span class="peer-count">'+tag.votes+'</span> \
                                </label>';
                }
                $('#principleReview #peerTags').append(output).trigger("create");

                $('#principleReview .submit-guess').click(function() {
                    var principlesArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        principlesArray.push($(this).attr("name"));
                    });
                    
                    Sail.app.submitPrinciplesGuess(problem.id, principlesArray);
                });

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
                    {id:1, name:"Newton's Second Law", submitted:[]},
                    {id:2, name:"Acceleration", submitted:[]},
                    {id:4, name:"Fnet = 0", submitted:[]}
                ];

                var numTags = peerTagsResults.length;
                var output = '<table>';
                output += '<tr><td width="200"></td><th width="100">&nbsp; you</th><th width="100">'+Sail.app.groupData.members[0]+'</th>';
                if (Sail.app.groupData.members[1]) {
                    output += '<th width="100">'+Sail.app.groupData.members[1]+'</th>';
                }
                if (Sail.app.groupData.members[2]) {
                    output += '<th width="100">'+Sail.app.groupData.members[2]+'</th>';
                }                
                output += '</tr>';
                var yes = "✔";
                var no = "x";
                for (var i=0; i<numTags; i++){
                    var tag = peerTagsResults[i];
                    output += '<tr><th>'+tag.name+'</th>';
                    output += '<td>'+'<input type="checkbox" name="'+tag.name+'" id="checkbox-'+tag.id+'" class="custom" ';
                    output += (tag.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                    output += ' /><label for="checkbox-'+tag.id+'"></label>'+'</td>';

                    if (Sail.app.groupData.members[0]) {
                        output += '<td class="teammate-'+Sail.app.groupData.members[0]+'" data="'+Sail.app.groupData.members[0]+'-'+tag.name+'">';
                        output += no //(tag.submitted.indexOf(2) > -1) ? yes : no;
                        output += '</td>';
                    }
                    if (Sail.app.groupData.members[1]) {
                        output += '<td class="teammate-'+Sail.app.groupData.members[1]+'" data="'+Sail.app.groupData.members[1]+'-'+tag.name+'">';
                        output += no //(tag.submitted.indexOf(3) > -1) ? yes : no;
                        output += '</td>';
                    }
                    if (Sail.app.groupData.members[2]) {
                        output += '<td class="teammate-'+Sail.app.groupData.members[2]+'" data="'+Sail.app.groupData.members[2]+'-'+tag.name+'">';
                        output += no //(tag.submitted.indexOf(3) > -1) ? yes : no
                        output += '</td>';
                    }

                    output += '</tr>';
                }
                output += "</table>";
                $("#principleConsensus #peerTags").append(output).trigger("create");

                $('input:checkbox').click(function() {
                    // this isn't the most efficient way to do this, but the line below wouldn't work, so... does someone else have a suggestion?
                    // Sail.app.toggleCheckbox($(this).attr("name"), $(this).attr("value"));

                    var principleConsensusArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        principleConsensusArray.push($(this).attr("name"));
                    });
                    
                    Sail.app.togglePrincipleCheckboxes(principleConsensusArray);      
                });

                // event to listen for updates from other tables on checkmarks for checkbox table
                self.events.sail = {
                    principle_checkbox_toggled: function(ev) {     
                        if ((ev.origin === Sail.app.groupData.members[0]) && ev.payload.checkedCheckboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the yeses
                            $('.teammate-'+Sail.app.groupData.members[0]).text(no);
                            _.each(ev.payload.checkedCheckboxes, function(principle) {
                                //$(td value="Sail.app.groupData.members[0]+'-'+'principle'").text(yes);
                                var dataValueStr = Sail.app.groupData.members[0] + '-' + Sail.app.escapeSelectorString(principle);
                                $("td[data='"+dataValueStr+"']").text(yes);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[1]) && ev.payload.checkedCheckboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the yeses
                            $('.teammate-'+Sail.app.groupData.members[1]).text(no);
                            _.each(ev.payload.checkedCheckboxes, function(principle) {
                                //$('.teammate-'+Sail.app.groupData.members[0]+'.principle-id-'+principle).text(yes);
                                var dataValueStr = Sail.app.groupData.members[1] + '-' + Sail.app.escapeSelectorString(principle);
                                $("td[data='"+dataValueStr+"']").text(yes);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[2]) && ev.payload.checkedCheckboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the yeses
                            $('.teammate-'+Sail.app.groupData.members[2]).text(no);
                            _.each(ev.payload.checkedCheckboxes, function(principle) {
                                //$('.teammate-'+Sail.app.groupData.members[2]+'.principle-id-'+principle).text(yes);
                                var dataValueStr = Sail.app.groupData.members[2] + '-' + Sail.app.escapeSelectorString(principle);
                                $("td[data='"+dataValueStr+"']").text(yes);
                            });
                        }
                        else {
                            console.log('ignoring principle_checkbox_toggled event - not relevant group member or bad payload');
                        }

                        // is this the best place to do this? Maybe filter out by group name?
                        var consensusReached = true;
                        $('#principleConsensus tr').each(function(trIndex) {
                            
                            var checkCount = 0;
                            // for each column
                            // skip first column
                            if (trIndex === 0) {
                                return;
                            }
                            else {
                                $(this).find('td').each(function(tdIndex){
                                    if ( tdIndex === 0 ){
                                        if ($(this).find(":checkbox").attr("checked") ){
                                             checkCount++;
                                        }
                                    } else {
                                        if ($(this).text() === yes ){
                                             checkCount++;
                                        }
                                    }
                                });
                                if ((checkCount != 0) && (checkCount != Sail.app.groupData.members.length)) {
                                    consensusReached = false;
                                    return false;                         
                                }
                            }
                        });
                        if (consensusReached === true) {
                            $('#principleConsensus #principleContinueButton').removeClass('ui-disabled');
                            alert('true');
                        } else {
                            $('#principleConsensus #principleContinueButton').addClass('ui-disabled');
                            alert('false');
                        }
                        
                    }
                };
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
                    
                    output += '<input type="checkbox" name="'+tag.name+'" id="checkbox-'+tag.id+'" class="custom" /> \
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

                $('#equationsReview .submit-guess').click(function() {
                    var equationsArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        equationsArray.push($(this).attr("name"));
                    });
                    
                    var problemId = "1";       // this will need to be set globally in principlesReview
                    Sail.app.submitEquationsGuess(problemId, equationsArray);
                });                

            });

            //equationConsensus
            $( '#equationConsensus' ).live( 'pageinit',function(event){

                //TODO: part of dynamic call
                var problem = {
                    name: "TruckAndCrate"
                }

                //$("#problem").append(output);

                //TODO: array needs to a result of a backend call
                var equationResults = [
                    {id:1, name:"d=vt + 1/2at^2", submitted:[2]},
                    {id:2, name:"Fnet = m*a", submitted:[1,2,3]},
                    {id:4, name:"KE = 1/2*m*v^2", submitted:[1,3]}
                ];

                var numTags = equationResults.length;
                var output = '<table>';
                output += '<tr><td width="200"></td><th width="100">&nbsp; you</th><th width="100">'+Sail.app.groupData.members[0]+'</th>';
                if (Sail.app.groupData.members[1]) {
                    output += '<th width="100">'+Sail.app.groupData.members[1]+'</th>';
                }
                if (Sail.app.groupData.members[2]) {
                    output += '<th width="100">'+Sail.app.groupData.members[2]+'</th>';
                }                
                output += '</tr>';                
                var yes = "✔";
                var no = "x";
                for (var i=0; i<numTags; i++){
                    var equation = equationResults[i];
                    output += '<tr><th>'+equation.name+'</th>';
                    output += '<td>'+'<input type="checkbox" name="'+equation.name+'" id="checkbox-'+equation.id+'" class="custom" ';
                    output += (equation.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                    output += ' /><label for="checkbox-'+equation.id+'"></label>'+'</td>';

                    if (Sail.app.groupData.members[0]) {
                        output += '<td class="teammate-'+Sail.app.groupData.members[0]+'" data="'+Sail.app.groupData.members[0]+'-'+equation.name+'">';
                        output += no //(tag.submitted.indexOf(2) > -1) ? yes : no;
                        output += '</td>';
                    }
                    if (Sail.app.groupData.members[1]) {
                        output += '<td class="teammate-'+Sail.app.groupData.members[1]+'" data="'+Sail.app.groupData.members[1]+'-'+equation.name+'">';
                        output += no //(tag.submitted.indexOf(3) > -1) ? yes : no;
                        output += '</td>';
                    }
                    if (Sail.app.groupData.members[2]) {
                        output += '<td class="teammate-'+Sail.app.groupData.members[2]+'" data="'+Sail.app.groupData.members[2]+'-'+equation.name+'">';
                        output += no //(tag.submitted.indexOf(3) > -1) ? yes : nooutput
                        output += '</td>';
                    }

                    output += '</tr>';
                }
                output += "</table>";
                $("#equationConsensus #peerTags").append(output).trigger("create");

                $('input:checkbox').click(function() {
                    var equationConsensusArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        equationConsensusArray.push($(this).attr("name"));
                    });
                    
                    Sail.app.toggleEquationCheckboxes(equationConsensusArray);      
                });

                self.events.sail = {
                    equation_checkbox_toggled: function(ev) {     
                        if ((ev.origin === Sail.app.groupData.members[0]) && ev.payload.checkedCheckboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the yeses
                            $('.teammate-'+Sail.app.groupData.members[0]).text(no);
                            _.each(ev.payload.checkedCheckboxes, function(equation) {
                                var dataValueStr = Sail.app.groupData.members[0] + '-' + Sail.app.escapeSelectorString(equation);
                                $("td[data='"+dataValueStr+"']").text(yes);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[1]) && ev.payload.checkedCheckboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the yeses
                            $('.teammate-'+Sail.app.groupData.members[1]).text(no);
                            _.each(ev.payload.checkedCheckboxes, function(equation) {
                                var dataValueStr = Sail.app.groupData.members[1] + '-' + Sail.app.escapeSelectorString(equation);
                                $("td[data='"+dataValueStr+"']").text(yes);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[2]) && ev.payload.checkedCheckboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the yeses
                            $('.teammate-'+Sail.app.groupData.members[2]).text(no);
                            _.each(ev.payload.checkedCheckboxes, function(equation) {
                                var dataValueStr = Sail.app.groupData.members[2] + '-' + Sail.app.escapeSelectorString(equation);
                                $("td[data='"+dataValueStr+"']").text(yes);
                            });
                        }
                        else {
                            console.log('ignoring equation_checkbox_toggled event - not relevant group member or bad payload');
                        }

                        // is this the best place to do this? Maybe filter out by group name?
                        var consensusReached = true;
                        $('#equationConsensus tr').each(function(trIndex) {
                            
                            var checkCount = 0;
                            // for each column
                            // skip first column
                            if (trIndex === 0) {
                                return;
                            }
                            else {
                                $(this).find('td').each(function(tdIndex){
                                    if ( tdIndex === 0 ){
                                        if ($(this).find(":checkbox").attr("checked") ){
                                             checkCount++;
                                        }
                                    } else {
                                        if ($(this).text() === yes ){
                                             checkCount++;
                                        }
                                    }
                                });
                                if ((checkCount != 0) && (checkCount != Sail.app.groupData.members.length)) {
                                    consensusReached = false;
                                    return false;                         
                                }
                            }
                        });
                        if (consensusReached === true) {
                            $('#equationConsensus #equationContinueButton').removeClass('ui-disabled');
                            alert('true');
                        } else {
                            $('#equationConsensus #equationContinueButton').addClass('ui-disabled');
                            alert('false');
                        }
                        
                    }
                };



            });
        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
        }
    };

    /************************ OUTGOING EVENTS ******************************/

    self.submitLogin = function(userName, groupName) {
        var sev = new Sail.Event('login', {
            user_name:userName,
            group_name:groupName,
        });
        Sail.app.groupchat.sendEvent(sev);
    }

    self.submitPrinciplesGuess = function(problemId, principlesArray) {
        var sev = new Sail.Event('guess_submission', {
            problem_id:problemId,
            principles:principlesArray,
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    self.submitEquationsGuess = function(problemId, equationsArray) {
        var sev = new Sail.Event('guess_submission', {
            problem_id:problemId,
            equations:equationsArray,
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    self.togglePrincipleCheckboxes = function(checkedCheckboxes) {
        var sev = new Sail.Event('principle_checkbox_toggled', {
            checkedCheckboxes:checkedCheckboxes,
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    self.toggleEquationCheckboxes = function(checkedCheckboxes) {
        var sev = new Sail.Event('equation_checkbox_toggled', {
            checkedCheckboxes:checkedCheckboxes,
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    /************************ INCOMING EVENTS ******************************/

    self.events.sail = {
        test_event: function(sev) {
            alert('heard the event');
        },

        // this event updates the group to include only present members (ie logged in users in group)
        group_presence: function(sev) {
            if ((sev.payload.group === Sail.app.groupData.name) && (sev.payload.members)) {
                Sail.app.groupData.members = sev.payload.members.slice();
                Sail.app.groupData.members = _.without(Sail.app.groupData.members, Sail.app.userData.account.login) 
                //Sail.app.groupData.members.splice(Sail.app.userData.account.login);
                $('#startButton').removeClass('ui-disabled');
            }
            else {
                console.log('ignoring group_presence event - either other group or bad payload');
            }
        },

        problem_assignment: function(sev) {
            if ((sev.payload.group === Sail.app.groupData.name) && (sev.payload.problem_name)) {
                Sail.app.currentProblem = sev.payload.problem_name;
            }
            else {
                console.log('ignoring problem_assignment event - either other group or bad payload');
            }
        }
    };

    // only users matching this filter will be shown in the account picker
    self.userFilter = function(u) {
        return u.kind === "Student";
    };

    //TODO: remove, for testing only without authenticating
    if ( UI_TESTING_ONLY ) {
        self.events.connected();
    }
    
    return self;
})(NEOplace.Tablet);
