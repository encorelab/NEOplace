/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    // self.drowsyURL = "http://drowsy.badger.encorelab.org";
    self.userData;
    self.userId;
    self.groupData = {
        members:[]
    };            // why does this need to be public?!
    self.currentProblem = {};
    self.principleHomeworkResults = [];
    self.equationHomeworkResults = [];

    self.allEquations = [
    {
        "EQ_ID": 1,
        "name": "\\vec{\\Delta d}=\\vec{d_{2}}-\\vec{d_{1}}"
    },

    {
        "EQ_ID": 2,
        "name": "\\vec{v}=\\vec{d}/\\Delta t"
    },

    {
        "EQ_ID": 3,
        "name": "v_{average}=\\Delta d_{total}/\\Delta t"
    },

    {
        "EQ_ID": 4,
        "name": "\\boldsymbol{f}=1/\\boldsymbol{T}"
    },

    {
        "EQ_ID": 5,
        "name": "\\vec{\\Delta v}=\\vec{v_{2}}-\\vec{v_{1}}"
    },

    {
        "EQ_ID": 6,
        "name": "\\vec{a}=\\vec{\\Delta v}/\\Delta{t}"
    },

    {
        "EQ_ID": 7,
        "name": "\\vec{v_{2}}=\\vec{v_{1}}+\\vec{a}\\Delta{t}"
    },

    {
        "EQ_ID": 8,
        "name": "\\vec{\\Delta d}=\\vec{v_{1}}\\Delta{t}+1/2\\vec{a}(\\Delta{t})^{2}"
    },

    {
        "EQ_ID": 9,
        "name": "\\vec{\\Delta d}=\\vec{v_{2}}\\Delta{t}-1/2\\vec{a}(\\Delta{t})^{2}"
    },

    {
        "EQ_ID": 10,
        "name": "\\vec{\\Delta d}=\\frac{(\\vec{v_{2}}+\\vec{v_{1}})}{2}\\Delta{t}"
    },

    {
        "EQ_ID": 11,
        "name": "{v_{2}}^{2}={v_{1}}^{2}+2a\\Delta d"
    },

    {
        "EQ_ID": 12,
        "name": "{_{A}\\vec{v}_{C}} ={_{A}\\vec{v}_{B}} + {_{B}\\vec{v}_{C}}"
    },

    {
        "EQ_ID": 13,
        "name": "F_{g}=mg"
    },

    {
        "EQ_ID": 14,
        "name": "F_{g}=\\frac{Gm_{1}m_{2}}{R^{2}}"
    },

    {
        "EQ_ID": 15,
        "name": "F_{f}=\\mu _{k}F_{N}"
    },

    {
        "EQ_ID": 16,
        "name": "F_{f}=\\mu _{s}F_{N}"
    },

    {
        "EQ_ID": 17,
        "name": "\\vec{F_{net}}=\\vec{F_{1}}+\\vec{F_{2}}+\\vec{F_{3}}+\\cdots"
    },

    {
        "EQ_ID": 18,
        "name": "\\vec{F_{net}}=m\\vec{a}"
    },

    {
        "EQ_ID": 19,
        "name": "\\vec{_{A}F_{B}}=-\\vec{_{B}F_{A}}"
    },

    {
        "EQ_ID": 20,
        "name": "W=\\vec{F}\\cdot \\Delta \\vec{d}"
    },

    {
        "EQ_ID": 21,
        "name": "W=F\\Delta cos(\\theta )"
    },

    {
        "EQ_ID": 22,
        "name": "P=\\frac{W}{\\Delta t}"
    },

    {
        "EQ_ID": 23,
        "name": "W=\\Delta E"
    },

    {
        "EQ_ID": 24,
        "name": "\\Delta E=mg\\Delta h"
    },

    {
        "EQ_ID": 25,
        "name": "E_{g}=mgh"
    },

    {
        "EQ_ID": 26,
        "name": "E_{k}=\\frac{1}{2}mv^{2}"
    },

    {
        "EQ_ID": 27,
        "name": "E_{T}=E_{g}+W_{k}"
    },

    {
        "EQ_ID": 28,
        "name": "E_{T(before)}=E_{T(after)}"
    },
    {
        "EQ_ID": 29,
        "name": "\\vec{A}_{(x/y)} = \\left |\\vec A \\right |(cos/sin)\\theta"
    }
    ]


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

    self.returnEquationName = function(EQ_ID) {
        return _.find(Sail.app.allEquations, function(eq) {
            return eq.EQ_ID == EQ_ID;
        }).name;
    }


    self.escapeSelectorString = function(str) {
        if(str)
            //return str.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g,'\\\\$1');
            return str.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
        else
            return str;
    };

    self.getCompletedHomeworkProblem = function(currentProblem) {
        Sail.app.currentProblem.name = currentProblem;
        Sail.app.currentProblem.htmlContent = '<h2>Problem</h2>';

        // mongo call to determine tag counts
        // first clear the results
        Sail.app.principleHomeworkResults = [];
        Sail.app.equationHomeworkResults = [];
        // then fill them from the DB
        $.ajax(self.drowsyURL + '/' + currentDb() + '/aggregated_homework', {
            type: 'get',
            success: function (homeworkCollection) {
                console.log(homeworkCollection);

                // I think I've got an unnecessary each in here, but brain is 1 am overloaded - look tomorrow
                _.each(homeworkCollection, function(homework) {
                    if (homework.problem_name === currentProblem) {
                        //console.log('problem object: '+homework.problem_name);

                        _.each(homework.principles, function(p) {
                            Sail.app.principleHomeworkResults.push({"name":p.name,"votes":p.count});
                        });
                        _.each(homework.equations, function(e) {
                            Sail.app.equationHomeworkResults.push({"id":e.EQ_ID,"name":e.name,"votes":e.count});
                        });
                        // break;
                    }
                });

                // grab problem from json files
                $.ajax({
                    url: '/assets/problems/'+Sail.app.currentProblem.name+'.html',
                    success: function(data, textStatus, jqXHR){

                    //save the html for later
                    Sail.app.currentProblem.htmlContent += data;

                    // load page principle review
                    $.mobile.changePage("p-principleReview.html");
                    },
                    dataType: 'html'
                });  

            },
            dataType: 'json'
        });


        //TODO: array needs to a result of a backend call (are we doing this with a REST call or through an agent?)
/*        Sail.app.principleHomeworkResults = [
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
        ];*/
      
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

                    $.ajax(self.drowsyURL + '/' + currentDb() + '/states', {
                        type: 'get',
                        success: function (results) {
                            console.log(results);

                            for (i=results.length-1;i>=0;i--) {
                                if (results[i].group_name === data.groups[0].name) {
                                    //Sail.app.currentProblem.name = results[i].problem;
                                    Sail.app.getCompletedHomeworkProblem(results[i].problem);
                                    //$.mobile.changePage("p-principleReview.html");
                                    break;
                                }
                            }
                        },
                        dataType: 'json'
                    });
               
                    Sail.app.groupData.name = data.groups[0].name;

                    Sail.app.userData = data;

                    Sail.app.userId = data.account.for_id;

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
                    var tag = Sail.app.principleHomeworkResults[i];
                    output += '<input type="checkbox" name="'+tag.name+'" id="principle-checkbox-'+i+'" /> \
                                <label for="principle-checkbox-'+i+'">'+tag.name+' \
                                <span class="peer-count">'+tag.votes+'</span> \
                                </label>';
                }
                $('#principleReview #peerTags').html(output).trigger("create");

                $('#principleReview .submit-guess').click(function() {
                    var principlesArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    var principlesArray = $('input:checkbox:checked').map(function() {return $(this).attr('name')}).toArray();
                    // for ( var c=0; c<checkedBoxes.length; c++ ) {
                    //     principlesArray.push(checkedBoxes[i].attr("name"));
                    // }

                    //principlesArray.push($('input:checkbox:checked').attr("name"));
                    
                    Sail.app.submitPrinciplesGuess(Sail.app.currentProblem.name, principlesArray);

                });
            });

            //PAGE: Students are working on tagging principles as a group and trying to come to a consensus
            $( '#principleConsensus' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#principleConsensus .paper').html(Sail.app.currentProblem.htmlContent);
                
                var principleConsensusArray = [];

                $('#principleConsensus input:checkbox').live('change', function() {
                    // this isn't the most efficient way to do this, but the line below wouldn't work, so... does someone else have a suggestion?
                    // Sail.app.toggleCheckbox($(this).attr("name"), $(this).attr("value"));

                    // iterate over all of the checked boxes and add principle names to the array
/*                            $('input:checkbox:checked').each(function(index) {
                        principleConsensusArray.push($(this).attr("name"));
                    });*/
                    principleConsensusArray = $('#principleConsensus input:checkbox:checked').map(function() {return $(this).attr('name')}).toArray();
                    
                    Sail.app.togglePrincipleCheckboxes(principleConsensusArray);      
                });

                // Mongo call to get set of principles to display
                //$.ajax(self.drowsyURL + '/' + currentDb() + '/observations?selector={"group_name":'Sail.app.groupData.name'}', {
                $.ajax(self.drowsyURL + '/' + currentDb() + '/observations?selector={"problem_name":"'+Sail.app.currentProblem.name+'","group_name":"'+Sail.app.groupData.name+'"}', {
                    type: 'get',
                    success: function (observations) {
                        console.log(observations);
                        var principlesArray = [];
                        _.each(observations, function(observation) {
                            if (observation.principles) {
                                _.each(observation.principles, function(p) {
                                    principlesArray.push(p);
                                });
                            }
                        });
                        var peerTagsResults = _.uniq(principlesArray);

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
                            output += '<tr><th class="tag-name">'+tag+'</th>';
                            output += '<td>'+'<input type="checkbox" name="'+tag+'" id="checkbox-'+i+'" ';
                            //output += (tag.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                            output += ' /><label for="checkbox-'+i+'" ></label>'+'</td>';

                            if ( !UI_TESTING_ONLY ) {
                                for (var j=0; j<numGroupMembers; j++){
                                    output += '<td class="teammate-'+Sail.app.groupData.members[j]+'" data="'+Sail.app.groupData.members[j]+'-'+tag+'">';
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
                        $("#principleConsensus #peerTags").html(output).trigger("create");




                        $('#principleContinueButton').click(function() {
                            Sail.app.submitPrinciplesQuorum(Sail.app.currentProblem.name, principleConsensusArray);
                        });                        
                    }
                });
/*                var peerTagsResults = [
                    {id:1, name:"Newton's Second Law", submitted:[]},
                    {id:2, name:"Acceleration", submitted:[]},
                    {id:4, name:"Fnet = 0", submitted:[]}
                ];*/
            });



/***********************************************************************************************************************/



            //PAGE: Students are working on tagging equations by themselves
            $( '#equationsReview' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#equationsReview .paper').html(Sail.app.currentProblem.htmlContent);

                //output the checkboxes for each tag
                var numTags = Sail.app.equationHomeworkResults.length;
                var output = "";
                for (var i=0; i<numTags; i++){
                    var tag = Sail.app.equationHomeworkResults[i];
                    output += '<input type="checkbox" name="'+tag.id+'" id="equation-checkbox-'+tag.id+'" class="eq-check-label" value='+tag.name+'/> \
                        <label for="equation-checkbox-'+tag.id+'">$$'+tag.name+'$$ \
                        <span class="peer-count">'+tag.votes+'</span> \
                        </label>';
                }
                $("#equationsReview #peerEquations").html(output).trigger("create");

                //update formatting of equations
                MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

                $('#equationsReview .submit-guess').click(function() {
                    var equationsArray = [];

                    // iterate over all of the checked boxes and add principle names to the array
                    $('input:checkbox:checked').each(function(index) {
                        var equation = {
                            EQ_ID:$(this).attr("name"),
                            name:$(this).val()
                        }
                        equationsArray.push(equation);
                    });
                    
                    Sail.app.submitEquationsGuess(Sail.app.currentProblem.name, equationsArray);
                });           

            });



/*********************************************************************************************/




            //PAGE: Students are working on tagging equations as a group and trying to come to a consensus
            $( '#equationConsensus' ).live( 'pageinit',function(event){

                // update the page to display the problem question
                $('#equationConsensus .paper').html(Sail.app.currentProblem.htmlContent);

                //TODO: array needs to a result of a backend call
/*                var equationResults = [
                    {id:18, name:"\\vec{F_{net}}=m\\vec{a}", submitted:[2]},
                    {id:21, name:"W=F\\Delta cos(\\theta )", submitted:[1,2,3]},
                    {id:8, name:"\\vec{\\Delta d}=\\vec{v_{1}}\\Delta{t}+1/2\\vec{a}(\\Delta{t})^{2}", submitted:[1,3]}
                ];*/

                $.ajax(self.drowsyURL + '/' + currentDb() + '/observations?selector={"problem_name":"'+Sail.app.currentProblem.name+'","group_name":"'+Sail.app.groupData.name+'"}', {
                    type: 'get',
                    success: function (observations) {
                        console.log(observations);
                        var equationsArray = [];
                        _.each(observations, function(observation) {
                            if (observation.equations) {
                                _.each(observation.equations, function(e) {
                                    //e.name = e.name.replace(/\\/g,'\\\\');
                                    equationsArray.push(e.EQ_ID);
                                });
                            }
                        });
                        var equationResults = _.uniq(equationsArray);
                        //var equationResults = _.uniq(equationsArray, false, function(item) { return JSON.stringify(item) });


                        var numTags = equationResults.length;
                        var numGroupMembers = 0;

                        var output = '<table>';
                        output += '<tr><td width="200"></td>';
                        output += '<th width="100">&nbsp; you</th>';

                        numGroupMembers = Sail.app.groupData.members.length;
                        for (var i=0; i<numGroupMembers; i++){
                            output += '<th width="100">'+Sail.app.groupData.members[i]+'</th>';
                        }

                        output += '</tr>';
                       
                        for (var i=0; i<numTags; i++){
                            var equation = equationResults[i];
                            output += '<tr><th class="tag-name">$$'+Sail.app.returnEquationName(equation)+'$$</th>';
                            output += '<td>'+'<input type="checkbox" name="'+equation+'" id="checkbox-'+equation+'" ';
                            //output += (equation.submitted.indexOf(1) > -1) ? 'checked="checked"' : '';
                            output += ' /><label for="checkbox-'+equation+'"></label>'+'</td>';

                           
                            for (var j=0; j<numGroupMembers; j++){
                                output += '<td class="teammate-'+Sail.app.groupData.members[j]+'" data="'+Sail.app.groupData.members[j]+'-eq'+equation+'">';
                                output += NO //(tag.submitted.indexOf(j) > -1) ? YES : NO;
                                output += '</td>';
                            }
        

                            output += '</tr>';
                        }
                        output += "</table>";
                        $("#equationConsensus #submittedEquations").html(output).trigger("create");

                        //update formatting of equations
                        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);


                        var equationConsensusArray = [];

                        $('input:checkbox').click(function() {
                            // iterate over all of the checked boxes and add principle names to the array
                            $('input:checkbox:checked').each(function(index) {
                                equationConsensusArray.push($(this).attr("name"));
                            });
                            
                            Sail.app.toggleEquationCheckboxes(equationConsensusArray);      
                        });

                        $('#equationContinueButton').click(function() {
                            Sail.app.submitEquationsQuorum(Sail.app.currentProblem.name, equationConsensusArray);
                        });
                    }
                });

            });
        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
            window.location.href = window.location.pathname.replace(/\/[^\/]*$/,'/'); // send back to index page
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
            user_id:Sail.app.userId,
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
    };

    self.submitEquationsQuorum = function(problemName, equationsArray) {
        var obs = {
            user_id:Sail.app.userId,
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

        guess_submission: function(ev) {
            if (ev.payload.group_name === Sail.app.groupData.name) {
                if (ev.payload.principles) {
                    $.mobile.loadPage( 'p-principleConsensus.html', {reloadPage:true, loadMsgDelay:1000} );
                } else if (ev.payload.equations) {
                    $.mobile.loadPage( 'p-equationConsensus.html', {reloadPage:true, loadMsgDelay:1000} );
                } else {
                    console.alert('ignoring guess_submission');
                }
            }
        },

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
            var consensusReached = false;
            $('#principleConsensus #principleContinueButton').removeClass('ui-disabled');

            $('#principleConsensus tr').each(function(trIndex) {
                
                var checkCount = 0;
               
                if (trIndex === 0) {
                    return; //first header row so skip
                }
                else {

                    // for each column
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
                    if (checkCount == Sail.app.groupData.members.length + 1) { //members list does not include you
                        consensusReached = true;                       
                    }
                }
            });

            if (consensusReached === true) {
                $('#principleConsensus #principleContinueButton').removeClass('ui-disabled');
            } 

        },

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
        },

        // this event updates the group to include only present members (ie logged in users in group)
        group_presence: function(sev) {
            if ((sev.payload.group === Sail.app.groupData.name) && (sev.payload.members)) {
                // change ids to groupData.members (names)
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
                // saving the state
                var state = {"group_name":Sail.app.groupData.name,"problem":sev.payload.problem_name};
                jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/states', {
                    type: 'post',
                    data: state,
                    success: function () {
                        console.log("State saved at problem: ", state);
                    }
                });

                Sail.app.getCompletedHomeworkProblem(sev.payload.problem_name);
                
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
