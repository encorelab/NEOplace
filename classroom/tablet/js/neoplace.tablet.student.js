/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    // self.drowsyURL = "http://drowsy.badger.encorelab.org";
    self.userData;
    self.groupData = {
        members:[]
    };            // why does this need to be public?!
    self.currentProblem = {};
    self.principleHomeworkResults = [];
    self.equationHomeworkResults = [];

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = false; 

    var YES = '<div class="checklist_icon yes_icon"></div>';
    var NO = '<div class="checklist_icon no_icon"></div>';

    /** private function **/
    var foo = function () {

    };
    
    var currentDb = function () {
        return Sail.app.run.name;  
    };


    self.escapeSelectorString = function(str) {
        if(str)
            return str.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g,'\\\\$1');
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

            Sail.app.drowsyURL = Sail.app.config.mongo.url;
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
                    $("#loginScreen #statusMsg").html('You have been assigned to <strong>'+data.groups[0].name+'</strong>. \
                        <br /><br /> \
                        <img src="/assets/img/group_gather.png" width="300" height="200" alt="group huddle" /> \
                        <br />When your group is together and ready to go, let your teacher know.');
                    $("#startButton").css("display","block");
                
                    Sail.app.groupData.name = data.groups[0].name;
                    //Sail.app.groupData.members = ["joe","mike","colin"];

                    Sail.app.userData = data;

                    Sail.app.submitLogin(data.account.login, data.groups[0].name);
                });
            }else{
                //show start button when doing UI in order to get to next page w/o being logged in
                $("#loginScreen #statusMsg").html('You have been assigned to <strong>{group name}</strong>. \
                        <br /><br /> \
                        <img src="/assets/img/group_gather.png" width="300" height="200" alt="group huddle" /> \
                        <br />When your group is together and ready to go, let your teacher know.');
                $("#startButton").css("display","block");
                $('#startButton').removeClass('ui-disabled');
            }

            //PAGE: Students are working on tagging principles by themselves
            $( '#principleReview' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#principleReview .paper').html(Sail.app.currentProblem.htmlContent);

                var numTags = Sail.app.principleHomeworkResults.length;
                var output = "";
                for (var i=0; i<numTags; i++){
                    var tag = principleHomeworkResults[i];
                    output += '<input type="checkbox" name="'+tag.name+'" id="principle-checkbox-'+i+'" /> \
                                <label for="principle-checkbox-'+i+'">'+tag.name+' \
                                <span class="peer-count">'+tag.votes+'</span> \
                                </label>';
                }
                $('#principleReview #peerTags').append(output).trigger("create");

if ( !UI_TESTING_ONLY ) {
                    $('#principleReview .submit-guess').click(function() {
                        var principlesArray = [];

                        // iterate over all of the checked boxes and add principle names to the array
                        $('input:checkbox:checked').each(function(index) {
                            principlesArray.push($(this).attr("name"));
                        });
                        
                        Sail.app.submitPrinciplesGuess(Sail.app.currentProblem.name, principlesArray);

                    });
}

            });

            //PAGE: Students are working on tagging principles as a group and trying to come to a consensus
            $( '#principleConsensus' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#principleConsensus .paper').html(Sail.app.currentProblem.htmlContent);

                //TODO: array needs to a result of a backend call
                var peerTagsResults = [
                    {id:1, name:"Newton's Second Law", submitted:[]},
                    {id:2, name:"Acceleration", submitted:[]},
                    {id:4, name:"Fnet = 0", submitted:[]}
                ];

                var numTags = peerTagsResults.length;
                var numGroupMembers = 0;

                var output = '<table>';
                output += '<tr><td width="200"></td>';
                output += '<th width="100">&nbsp; you</th>';
                if ( !UI_TESTING_ONLY ) {
                    numGroupMembers = Sail.app.groupData.members.length;
                    for (var i=0; i<numGroupMembers; i++){
                        output += '<th width="100">'+Sail.app.groupData.members[i]+'</th>';
                    }
                }else{
                    //fake group members
                    numGroupMembers = 3;
                    for (var i=0; i<numGroupMembers; i++){
                        output += '<th width="100">#'+i+'</th>';
                    }
                }
                output += '</tr>';

                for (var i=0; i<numTags; i++){
                    var tag = peerTagsResults[i];
                    output += '<tr><th class="tag-name">'+tag.name+'</th>';
                    output += '<td>'+'<input type="checkbox" name="'+tag.name+'" id="checkbox-'+tag.id+'" ';
                    output += (tag.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                    output += ' /><label for="checkbox-'+tag.id+'" ></label>'+'</td>';

                    if ( !UI_TESTING_ONLY ) {
                        for (var j=0; j<numGroupMembers; j++){
                            output += '<td class="teammate-'+Sail.app.groupData.members[j]+'" data="'+Sail.app.groupData.members[j]+'-'+tag.name+'">';
                            output += NO //(tag.submitted.indexOf(j) > -1) ? YES : NO;
                            output += '</td>';
                        }
                    }else{
                        //fake group members results
                        numGroupMembers = 3;
                        for (var j=0; j<numGroupMembers; j++){
                            output += '<td class="teammate-mike" data="mike-Newton\'s First Law">';
                            output += NO //(tag.submitted.indexOf(j) > -1) ? YES : NO;
                            output += '</td>';
                        }
                    }

                    output += '</tr>';
                }
                output += "</table>";
                $("#principleConsensus #peerTags").append(output).trigger("create");

if ( !UI_TESTING_ONLY ) {
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
}else{
                    $('#principleContinueButton').removeClass('ui-disabled');
}

                // event to listen for updates from other tables on checkmarks for checkbox table
                self.events.sail = {
                    principle_checkbox_toggled: function(ev) {     
                        if ((ev.origin === Sail.app.groupData.members[0]) && ev.payload.principle_checked_checkboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the YESes
                            $('.teammate-'+Sail.app.groupData.members[0]).html(NO);
                            _.each(ev.payload.principle_checked_checkboxes, function(principle) {
                                //$(td value="Sail.app.groupData.members[0]+'-'+'principle'").html(YES);
                                var dataValueStr = Sail.app.groupData.members[0] + '-' + Sail.app.escapeSelectorString(principle);
                                $("td[data='"+dataValueStr+"']").html(YES);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[1]) && ev.payload.principle_checked_checkboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the YESes
                            $('.teammate-'+Sail.app.groupData.members[1]).html(NO);
                            _.each(ev.payload.principle_checked_checkboxes, function(principle) {
                                //$('.teammate-'+Sail.app.groupData.members[0]+'.principle-id-'+principle).html(YES);
                                var dataValueStr = Sail.app.groupData.members[1] + '-' + Sail.app.escapeSelectorString(principle);
                                $("td[data='"+dataValueStr+"']").html(YES);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[2]) && ev.payload.principle_checked_checkboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the YESes
                            $('.teammate-'+Sail.app.groupData.members[2]).html(NO);
                            _.each(ev.payload.principle_checked_checkboxes, function(principle) {
                                //$('.teammate-'+Sail.app.groupData.members[2]+'.principle-id-'+principle).html(YES);
                                var dataValueStr = Sail.app.groupData.members[2] + '-' + Sail.app.escapeSelectorString(principle);
                                $("td[data='"+dataValueStr+"']").html(YES);
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
                                        if ($(this).html() === YES ){
                                             checkCount++;
                                        }
                                    }
                                });
                                if ((checkCount != 0) && (checkCount != (Sail.app.groupData.members.length + 1))) {
                                    consensusReached = false;
                                    return false;                         
                                }
                            }
                        });
                        if (consensusReached === true) {
                            $('#principleConsensus #principleContinueButton').removeClass('ui-disabled');
                        } else {
                            $('#principleConsensus #principleContinueButton').addClass('ui-disabled');
                        }
                        
                    }
                };
            });

            //PAGE: Students are working on tagging equations by themselves
            $( '#equationsReview' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#equationsReview .paper').html(Sail.app.currentProblem.htmlContent);

                //output the checkboxes for each tag
                var numTags = Sail.app.equationHomeworkResults.length;
                var output = "";
                for (var i=0; i<numTags; i++){
                    var tag = equationHomeworkResults[i];
                    output += '<input type="checkbox" name="'+tag.id+'" id="equation-checkbox-'+tag.id+'" class="eq-check-label" /> \
                        <label for="equation-checkbox-'+tag.id+'">$$'+tag.name+'$$ \
                        <span class="peer-count">'+tag.votes+'</span> \
                        </label>';
                }
                $("#equationsReview #peerEquations").append(output).trigger("create");

                //TODO: this should be a button instead
                var output2 = '<select name="select-choice-a" id="select-choice-a" data-native-menu="false" data-icon="plus" data-iconpos="left" tabindex="-1"> \
                        <option>Add an Equation not shown above</option> \
                        <option value="x">$$P=\\frac{W}{\\Delta t}$$</option> \
                        <option value="y">$$W=\\Delta E$$</option> \
                        <option value="z">$$\\Delta E=mg\\Delta h$$</option> \
                    </select>';

                $("#equationsReview #peerEquationsMore").append(output2).trigger("create");

                //update formatting of equations
                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

if ( !UI_TESTING_ONLY ) {
                $('#equationsReview .submit-guess').click(function() {
                    var equationsArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        equationsArray.push($(this).attr("name"));
                    });
                    
                    var problemId = "1";       // this will need to be set globally in principlesReview
                    Sail.app.submitEquationsGuess(problem.name, equationsArray);
                }); 
}              

            });

            //PAGE: Students are working on tagging equations as a group and trying to come to a consensus
            $( '#equationConsensus' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#equationConsensus .paper').html(Sail.app.currentProblem.htmlContent);

                //TODO: array needs to a result of a backend call
                var equationResults = [
                    {id:18, name:"\\vec{F_{net}}=m\\vec{a}", submitted:[2]},
                    {id:21, name:"W=F\\Delta cos(\\theta )", submitted:[1,2,3]},
                    {id:8, name:"\\vec{\\Delta d}=\\vec{v_{1}}\\Delta{t}+1/2\\vec{a}(\\Delta{t})^{2}", submitted:[1,3]}
                ];

                var numTags = equationResults.length;
                var numGroupMembers = 0;

                var output = '<table>';
                output += '<tr><td width="200"></td>';
                output += '<th width="100">&nbsp; you</th>';
                if ( !UI_TESTING_ONLY ) {
                    numGroupMembers = Sail.app.groupData.members.length;
                    for (var i=0; i<numGroupMembers; i++){
                        output += '<th width="100">'+Sail.app.groupData.members[i]+'</th>';
                    }
                }else{
                    //fake group members
                    numGroupMembers = 3;
                    for (var i=0; i<numGroupMembers; i++){
                        output += '<th width="100">#'+i+'</th>';
                    }
                }
                output += '</tr>';
               
                for (var i=0; i<numTags; i++){
                    var equation = equationResults[i];
                    output += '<tr><th class="tag-name">$$'+equation.name+'$$</th>';
                    output += '<td>'+'<input type="checkbox" name="'+equation.id+'" id="checkbox-'+equation.id+'" ';
                    output += (equation.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                    output += ' /><label for="checkbox-'+equation.id+'"></label>'+'</td>';

                    if ( !UI_TESTING_ONLY ) { 
                        for (var j=0; j<numGroupMembers; j++){
                            output += '<td class="teammate-'+Sail.app.groupData.members[j]+'" data="'+Sail.app.groupData.members[j]+'-eq'+equation.id+'">';
                            output += NO //(tag.submitted.indexOf(j) > -1) ? YES : NO;
                            output += '</td>';
                        }
                     }else{
                        //fake group members results
                        numGroupMembers = 3;
                        for (var j=0; j<numGroupMembers; j++){
                            output += '<td class="teammate-mike" data="mike-eq8">';
                            output += NO //(tag.submitted.indexOf(j) > -1) ? YES : NO;
                            output += '</td>';
                        }
                    }

                    output += '</tr>';
                }
                output += "</table>";
                $("#equationConsensus #submittedEquations").append(output).trigger("create");

                //update formatting of equations
                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

if ( !UI_TESTING_ONLY ) {
                $('input:checkbox').click(function() {
                    var equationConsensusArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        equationConsensusArray.push($(this).attr("name"));
                    });
                    
                    Sail.app.toggleEquationCheckboxes(equationConsensusArray);      
                });
}else{
                $('#equationContinueButton').removeClass('ui-disabled');
}

                self.events.sail = {
                    equation_checkbox_toggled: function(ev) {     
                        if ((ev.origin === Sail.app.groupData.members[0]) && ev.payload.equation_checked_checkboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the YESes
                            $('.teammate-'+Sail.app.groupData.members[0]).html(NO);
                            _.each(ev.payload.equation_checked_checkboxes, function(equation) { 
                                var dataValueStr = Sail.app.groupData.members[0] + '-eq' + equation;
                                $("td[data='"+dataValueStr+"']").html(YES);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[1]) && ev.payload.equation_checked_checkboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the YESes
                            $('.teammate-'+Sail.app.groupData.members[1]).html(NO);
                            _.each(ev.payload.equation_checked_checkboxes, function(equation) {
                                var dataValueStr = Sail.app.groupData.members[1] + '-eq' + equation;
                                $("td[data='"+dataValueStr+"']").html(YES);
                            });
                        }
                        else if ((ev.origin === Sail.app.groupData.members[2]) && ev.payload.equation_checked_checkboxes) {
                            // for this teammate, set all the boxes to no, then traverse the array and find all the YESes
                            $('.teammate-'+Sail.app.groupData.members[2]).html(NO);
                            _.each(ev.payload.equation_checked_checkboxes, function(equation) {
                                var dataValueStr = Sail.app.groupData.members[2] + '-eq' + equation;
                                $("td[data='"+dataValueStr+"']").html(YES);
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
                                        if ($(this).html() === YES ){
                                             checkCount++;
                                        }
                                    }
                                });
                                if ((checkCount != 0) && (checkCount != (Sail.app.groupData.members.length + 1))) {
                                    consensusReached = false;
                                    return false;                         
                                }
                            }
                        });
                        if (consensusReached === true) {
                            $('#equationConsensus #equationContinueButton').removeClass('ui-disabled');
                        } else {
                            $('#equationConsensus #equationContinueButton').addClass('ui-disabled');
                        }
                    }
                };
            });
        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
            window.location.reload();
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

    self.submitPrinciplesGuess = function(problemName, principlesArray) {
        var obs = {
            user_name:Sail.app.userData.account.login,
            group_name:Sail.app.groupData.name,
            problem_name:problemName,
            principles:principlesArray
        };
        
        var sev = new Sail.Event('guess_submission', obs);
        
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/observations', {
            type: 'post',
            data: obs,
            success: function () {
                console.log("Observation saved: ", obs);
                Sail.app.groupchat.sendEvent(sev);
            }
        });
    };

    self.submitEquationsGuess = function(problemName, equationsArray) {
        var obs = {
            user_name:Sail.app.userData.account.login,
            group_name:Sail.app.groupData.name,
            problem_name:problemName,
            equations:equationsArray
        };
        
        var sev = new Sail.Event('guess_submission', obs);
        
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/observations', {
            type: 'post',
            data: obs,
            success: function () {
                console.log("Observation saved: ", obs);
                Sail.app.groupchat.sendEvent(sev);
            }
        });
    };

    self.togglePrincipleCheckboxes = function(checkedCheckboxes) {
        var obs = {
            user_name:Sail.app.userData.account.login,
            group_name:Sail.app.groupData.name,
            principle_checked_checkboxes:checkedCheckboxes
        };
        
        var sev = new Sail.Event('principle_checkbox_toggled', obs);
        
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/observations', {
            type: 'post',
            data: obs,
            success: function () {
                console.log("Observation saved: ", obs);
                Sail.app.groupchat.sendEvent(sev);
            }
        });
    };

    self.toggleEquationCheckboxes = function(checkedCheckboxes) {
        var obs = {
            user_name:Sail.app.userData.account.login,
            group_name:Sail.app.groupData.name,
            equation_checked_checkboxes:checkedCheckboxes
        };
        
        var sev = new Sail.Event('equation_checkbox_toggled', obs);
        
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/observations', {
            type: 'post',
            data: obs,
            success: function () {
                console.log("Observation saved: ", obs);
                Sail.app.groupchat.sendEvent(sev);
            }
        });
    };

    self.submitPrinciplesQuorum = function(problemName, principlesArray) {
        var obs = {
            user_name:Sail.app.userData.account.login,
            group_name:Sail.app.groupData.name,
            problem_name:problemName,
            principles:principlesArray
        };
        
        var sev = new Sail.Event('quorum_reached', obs);
        
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/observations', {
            type: 'post',
            data: obs,
            success: function () {
                console.log("Observation saved: ", obs);
                Sail.app.groupchat.sendEvent(sev);
            }
        });
    }

    self.submitEquationsQuorum = function(problemName, equationsArray) {
        var obs = {
            user_name:Sail.app.userData.account.login,
            group_name:Sail.app.groupData.name,
            problem_name:problemName,
            equations:equationsArray
        };
        
        var sev = new Sail.Event('quorum_reached', obs);
        
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/observations', {
            type: 'post',
            data: obs,
            success: function () {
                console.log("Observation saved: ", obs);
                Sail.app.groupchat.sendEvent(sev);
            }
        });
    };    

    /************************ INCOMING EVENTS ******************************/

    self.events.sail = {
        test_event: function(sev) {
            alert('heard the event');
        },

        // this event updates the group to include only present members (ie logged in users in group)
        group_presence: function(sev) {
            if ((sev.payload.group === Sail.app.groupData.name) && (sev.payload.members)) {
                // change groupData.members (ids) to groupData.members (names)
                _.each(sev.payload.members, function(memberId, i) {
                    Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/" + memberId + ".json", "GET", {}, function(data) {
                        Sail.app.groupData.members.push(data.account.login);
                        if (i === sev.payload.members.length - 1) {
                            Sail.app.groupData.members = _.without(Sail.app.groupData.members, Sail.app.userData.account.login);
                            $('#startButton').removeClass('ui-disabled');                            
                        }
                    });                    
                });
            }
            else {
                console.log('ignoring group_presence event - either other group or bad payload');
            }
        },

        problem_assignment: function(sev) {
            if ((sev.payload.group === Sail.app.groupData.name) && (sev.payload.problem_name)) {
                // set state here?

                Sail.app.currentProblem.name = sev.payload.problem_name;
                Sail.app.currentProblem.htmlContent = '<h2>Problem</h2>';

                // mongo call to determine tag counts

                //TODO: array needs to a result of a backend call (are we doing this with a REST call or through an agent?)
                Sail.app.principleHomeworkResults = [
                    {name:"Newton's Second Law", votes:2},
                    {name:"Acceleration", votes:7},
                    {name:"Static Friction", votes:4},
                    {name:"Fnet = 0", votes:5}
                ];

                //TODO: array needs to a result of a backend call
                Sail.app.equationHomeworkResults = [
                    {id:1, name:"\\vec{\\Delta d}=\\vec{d_{2}}-\\vec{d_{1}}", votes:1},
                    {id:2, name:"\\vec{v}=\\vec{d}/\\Delta t", votes:2},
                    {id:10, name:"\\vec{\\Delta d}=\\frac{(\\vec{v_{2}}+\\vec{v_{1}})}{2}\\Delta{t}", votes:4}, //tallest
                    {id:17, name:"\\vec{F_{net}}=\\vec{F_{1}}+\\vec{F_{2}}+\\vec{F_{3}}+\\cdots", votes:2}, //longest
                    {id:5, name:"\\vec{\\Delta v}=\\vec{v_{2}}-\\vec{v_{1}}", votes:1},
                    {id:6, name:"\\vec{a}=\\vec{\\Delta v}/\\Delta{t}", votes:3}
                ];


                // grab problem from json files
                $.ajax({
                  url: '/assets/problems/'+Sail.app.currentProblemName+'.html',
                  success: function(data, textStatus, jqXHR){

                    //save the html for later
                    Sail.app.currentProblem.htmlContent += data;

                    // load page principle review
                    $.mobile.changePage("p-principleReview.html");
                  },
                  dataType: 'html'
                });
                
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
