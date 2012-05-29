/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    self.userData = {
        name:null,
        id:null,
        group:null,
        members:[]
    }

    self.currentBoard = null;

    var TOTAL_VIDEO_BOARDS = 4;
    self.visitedVideoBoards = []; //nb: current video board is visitedVideoBoards[ visitedVideoBoards.length-1 ];

    self.studentPrinciples = [];

    self.problemSet = [];

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = true;
    console.log( "ATTN: UI_TESTING_ONLY is set to " + UI_TESTING_ONLY );
    // If set to false, remember to uncomment this line from the .html files
    //.thenRun(function() { return Sail.init(NEOplace.Tablet.Student); });  

    var YES = '<div class="checklist_icon yes_icon"></div>';
    var NO = '<div class="checklist_icon no_icon"></div>';

    /** private functions **/

    var currentDb = function () {
        if ( !UI_TESTING_ONLY ) {
            return Sail.app.run.name;    
           }
    };

    /** public functions **/

    // self.returnEquationName = function(EQ_ID) {
    //     return _.find(Sail.app.allEquations, function(eq) {
    //         return eq.EQ_ID == EQ_ID;
    //     }).name;
    // }

    self.escapeSelectorString = function(str) {
        if(str)
            //return str.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g,'\\\\$1');
            return str.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
        else
            return str;
    };

    self.updatetaggingProblemsPage = function(problemSet) {

    //                         // grab problem from json files
    //                 $.ajax({
    //                     url: '/assets/problems/'+Sail.app.currentProblem.name+'.html',
    //                     success: function(data, textStatus, jqXHR){

    //                         //save the html for later
    //                         Sail.app.currentProblem.htmlContent += data;


    //                     },
    //                     dataType: 'html'
    //                 });
    };

    self.restoreState = function() {
        // set Sail.app.visitedVideoBoards to stored visitedboards (from Rollcall)
        var selector = {"user_name":self.userData.name};
        $.ajax(self.drowsyURL + '/' + currentDb() + '/states_completed_boards', {        // might want to limit this more (different types of states?)
            type: 'get',
            data: { selector: JSON.stringify(selector) },
            success: function (boards) {
                console.log(boards);
                Sail.app.visitedVideoBoards = _.map(boards, function(i) { return i.board });
                $.mobile.loadPage('p-taggingPrinciplesBoard.html');
            }
        });

    };

    /** local event wiring **/

    self.events = {
        // triggered when Sail.app.init() is done
        initialized: function(ev) {

            // we're initialized sto start the authentication process
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

            // ****************
            //PAGE: By default, on login screen ('#loginScreen')
            //$( '#loginScreen' ).live( 'pageinit',function(event){             // this shouldbe commented out right,? Not sure how .live would be triggered?
            //console.log("#loginScreen pageinit");
            if ( !UI_TESTING_ONLY ) {

                // request detailed data about current user from Rollcall
                Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
                    console.log("Authenticated user is: ", data);

                    if (data.groups[1]) {
                        console.log('WARNING: user has been assigned to more than one group, chosing first group in the list');
                    }

                    // save their principles for taggingPrinciples page
                    self.studentPrinciples = JSON.parse(data.metadata.principles);

                    self.userData.name = data.account.login;
                    self.userData.id = data.account.id;              // is this the right id? Do we even need id?

                    // restore state and goto taggingPrinciplesBoard page if successful
                    self.restoreState();

                });

            }else{

                //dummy userData and principles for rest of session
                self.studentPrinciples = ["Newton's First Law", "Newton's Second Law", "fnet = 0"];
                self.userData.name = "Colin";
                self.userData.id = 23;

                //fake self.restoreState();
                self.visitedVideoBoards = [];
                
                //skip button for testing only
                $("#loginScreen .skipButton").css("display","block");
            }
            //});

            // ****************
            // PAGE: Students have logged in
            // They can now go to a video board and log in
            $( '#taggingPrinciplesBoard' ).live( 'pageinit',function(event){
                console.log("#taggingPrinciplesBoard pageinit");

                // change instruction message to better reflect how far they've gone
                var message = "";
                switch( self.visitedVideoBoards.length ) {
                    case (TOTAL_VIDEO_BOARDS - 1):
                        message = "Walk over to your last remaining video board.";
                        break;
                    case 0:
                        message = "Walk over to any video board.";
                        break;
                    default:
                        message = "Walk over to a new video board.";
                        break;
                }
                $("#taggingPrinciplesBoard .message").html(message);

                // add event handlers to sign in buttons
                $("#taggingPrinciplesBoard .videoBoardSignInButton").die();
                $("#taggingPrinciplesBoard .videoBoardSignInButton").each( function(index) {
                    var alreadyVisited = false;
                    var elementValue = $(this).attr("value");
                    //_.filter
                    //TODO: http://stackoverflow.com/questions/8779799/how-to-break-the-each-function-in-underscore-js
                    _.each( self.visitedVideoBoards, function(boardNumber){
                        if ( elementValue == boardNumber ) {
                            alreadyVisited = true;
                        }
                    });

                    if (alreadyVisited) {
                        $(this).addClass("ui-disabled");
                    }else{
                        $(this).bind('click', function(event,ui) {
                            //console.log( "clicked ", $(this).attr("value") );
                            self.currentBoard = parseInt( $(this).attr("value") );
                            // self.visitedVideoBoards.push( currentBoard );                // this should be done onClick '#taggingPrinciples .doneButton', right? What if they crash before the video is done?
                                                                                            // Have made currentBoard a global for now to access it in #taggingPrinciples

                            //deactivate all the buttons while backend call is happening
                            $(this).addClass("ui-disabled");
                            $("#taggingPrinciplesBoard .videoBoardSignInButton").die();

                            if ( !UI_TESTING_ONLY ) {
                                // send out check_in (which sends to wait screen)
                                // go to wait screen
                                Sail.app.submitCheckIn(self.userData, self.currentBoard);
                            }else{
                                //fake it
                                self.events.sail.activity_started({payload:{activity_name:"video_tagging"}})
                            }

                        });
                    }
                });

                if ( UI_TESTING_ONLY ) {
                    //skip over video tagging section
                    $("#taggingPrinciplesBoard .skipButton").css("display","block");
                }

            });


            // ****************
            // PAGE: Students are asked to watch the video on the smartboard
            // Individually they drag and drop related principles on the tablet
            // (but negotiate final principles together on the smartboard)
            $( '#taggingPrinciples' ).live( 'pageinit',function(event){
                console.log("#taggingPrinciples pageinit");

                $('#taggingPrinciples .doneButton').die();
                $('#taggingPrinciples .doneButton').live("click", function(){

                    //save board so button won't be active later
                    self.visitedVideoBoards.push(self.currentBoard);

                    // update behaviour of done button
                    var nextPage = "p-taggingPrinciplesBoard.html";
                    if ( self.visitedVideoBoards.length == TOTAL_VIDEO_BOARDS ) {
                        nextPage = "p-taggingPrinciplesFinished.html";
                    }

                    if ( !UI_TESTING_ONLY ) {

                        //deactive button so only one backend call is made
                        var doneBtn = $(this);
                        doneBtn.addClass("ui-disabled");

                        // writing the array to Mongo to allow future restores
                        var boards = {
                            user_name:self.userData.name,
                            board:self.currentBoard
                        }

                        $.ajax(self.drowsyURL + '/' + currentDb() + '/states_completed_boards', {
                            type: 'post',
                            data: boards,
                            success: function () {
                                console.log("Observation saved: ", boards);
                                $.mobile.changePage(nextPage);
                            },
                            error: function(jqXHR, textStatus, errorThrown) {
                                alert( textStatus + 'Please try again.' ); //TODO: untested....
                                doneBtn.removeClass("ui-disabled");
                            }
                        });
                    }else{
                        //skip saving
                        $.mobile.changePage(nextPage);
                    }
                });

                //output draggable buttons onto the taggingPrinciples page... need to use for loop here (see Colin for expl.)
                var output = '';
                _.each( self.studentPrinciples, function(principleName){ 
                    output += '<div data-role="button" data-inline="true" class="draggable" \
                        id="drag-'+principleName+'" \
                        value="'+principleName+'" \
                        >' 
                        + principleName 
                        +'</div>';
                });

                $("#taggingPrinciples .draggableTags").html(output).trigger("create");
                $("#taggingPrinciples .draggableTags .draggable").draggable({containment:"#taggingPrinciples .dragAndDropContainer"});
                $(".tagDropArea").droppable();

                // Drag events on button
                $('#taggingPrinciples .draggableTags .draggable').die();
                $('#taggingPrinciples .draggableTags .draggable').live('dragstart', function(event,ui) {
                    // use css to bring more attention to drop area
                    $("#dragAndDropContainer .tagDropArea").removeClass("idle");
                    $("#dragAndDropContainer .tagDropArea").addClass("attention");
                }); 
                $('#taggingPrinciples .draggableTags .draggable').live('dragstop', function(event,ui) {
                    // remove the css added to drop area in 'dragstart' event
                    $("#dragAndDropContainer .tagDropArea").removeClass("attention");
                    $("#dragAndDropContainer .tagDropArea").addClass("idle");
                }); 
                // $('#taggingPrinciples ,draggableTags .draggable').live('drag', function(event,ui) {
                //     console.log("dragging ", event.target.getAttribute("value"));
                // });

                // Drop events on portal
                $(".tagDropArea").die();
                $(".tagDropArea").live('drop', function(event,ui) {
                    console.log("drop ", ui.draggable.attr("value"));

                    if ( !UI_TESTING_ONLY ) {
                        //TODO: Some sort of backend call would go here using the value attribute

                    }else{
                        //note: don't need to want for response so no need to fake it
                    }

                    // use css to animate/hide the button
                    ui.draggable.addClass("dropped");
                });
                
            });


            // ****************
            // PAGE: Students have individually finished tagging so now they are waiting
            // for the rest of the class to finish
            $( '#taggingPrinciplesFinished' ).live( 'pageinit',function(event){
                console.log("#taggingPrinciplesFinished pageinit");

                if ( !UI_TESTING_ONLY ) {
                    //nothing here really...
                }else{
                    // testing button, will actually be 
                    //self.events.sail.classmates_done_tagging();
                    $( '#taggingPrinciplesFinished .skipButton').css("display","block");
                }

            });


            // ****************
            // PAGE: Students have been assigned to a group/videoboard for tagging problems
            // They are being asked to gather in front of board and check in
            $( '#sortPrinciplesBoard' ).live( 'pageinit',function(event){
                console.log("#sortPrinciplesBoard pageinit");

                $("#sortPrinciplesBoard .videoBoardSignInButton").die();
                $("#sortPrinciplesBoard .videoBoardSignInButton").live('click', function(){
                    $(this).addClass("ui-disabled");
                    $("#sortPrinciplesBoard .signInInstructions").css("opacity","0.3");

                    if ( !UI_TESTING_ONLY ) {
                        // send out check_in (which sends to wait screen)
                        Sail.app.submitCheckIn(self.userData, self.currentBoard);
                    }else{
                        //fake it
                        self.events.sail.activity_started({payload:{activity_name:"principle_sorting"}});
                    }
                });

            });


            // ****************
            // PAGE: This is an instructional page that only has instructions
            // Will need an event from the video board in order to continue
            $( '#sortPrinciples' ).live( 'pageinit',function(event){
                console.log("#sortPrinciples pageinit");

                if ( !UI_TESTING_ONLY ) {
                    //nothing here really...
                }else{
                    //fake it
                    $('#sortPrinciples .skipButton').css('display','block');
                    $('#sortPrinciples .skipButton').die();
                    $('#sortPrinciples .skipButton').live('click', function(){
                        self.events.sail.activity_started({payload:{activity_name:"problem_tagging"}});
                    });
                }

            });


            // ****************
            // PAGE: Students get 4-5 questions from a batch of 12 or so problems
            // They are asked to flip through all of them and attach ones that are relevant
            $( '#taggingProblems' ).live( 'pageinit',function(event){
                console.log("#taggingProblems pageinit");

                //TODO: show loading animation

                if ( !UI_TESTING_ONLY ) {

                    Sail.app.getProblemSetRelatedToVideo();

                }else{
                    //fake it
                    var fakeProblemSet = ["BowlingBall","BumperCars"]; //TODO: more complex than this
                    self.updatetaggingProblemsPage(fakeProblemSet);

                    //fake it
                    $('#taggingProblems .skipButton').css('display','block');
                    $('#taggingProblems .skipButton').die();
                    $('#taggingProblems .skipButton').live('click', function(){
                        self.events.sail.activity_started({payload:{activity_name:"done_problem_tagging"}});
                    });
                }



            });

            
            // ****************
            // PAGE: Students have logged in and have been assigned to a group/videoboard
            // They are being asked to gather in front of board and check in
            $( '#sortPrinciplesBoard' ).live( 'pageinit',function(event){
                console.log("#sortPrinciplesBoard pageinit");

                $("#sortPrinciplesBoard .boardSignInButton").die();
                $("#sortPrinciplesBoard .boardSignInButton").live('click', function(){
                    $(this).addClass("ui-disabled");
                    $("#sortPrinciplesBoard .signInInstructions").css("opacity","0.3");

                    if ( !UI_TESTING_ONLY ) {
                        //TODO: backend call
                        //Sail.app.submitVideoBoardLogin(data.account.login, currentBoard);
                    }else{
                        //fake it
                        //self.events.sail.group_video_board_checkin();

                        $("#videoBoardAssignment .doneButton").removeClass("ui-disabled");
                        
                    }
                });


            });
            
        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
        }
    };

    /************************ OUTGOING EVENTS ******************************/

    self.submitLogin = function(userData) {
        var sev = new Sail.Event('login', {
            user_name:userData.name,
            group_name:userData.group,
        });
        Sail.app.groupchat.sendEvent(sev);
    }

    self.submitCheckIn = function(userData, videoBoard) {
        var sev = new Sail.Event('check_in', {
            user_name:userData.name,
            group_name:userData.group,
            location:videoBoard
        });
        Sail.app.groupchat.sendEvent(sev);

        $.mobile.changePage('p-wait-screen.html');
    }

    self.getProblemSetRelatedToVideo = function(userName, videoBoard) {
        //TODO: test this
        var sev = new Sail.Event('get_problems', {
            user_name:userName,
            video_board:videoBoard
        });
        Sail.app.groupchat.sendEvent(sev);
    }

    /************************ INCOMING EVENTS ******************************/

    self.events.sail = {

        // testing event for debugging
        test_event: function(sev) {
            alert('heard the event');
        },

        // will always be trigger by teacher (while tablet is sitting on wait screen)
        activity_started: function(sev) {
            if (sev.payload.activity_name === "video_tagging") {
                $.mobile.changePage('p-taggingPrinciples.html');
            } else if (sev.payload.activity_name === "principle_sorting") {
                // do something, go somewhere
                $.mobile.changePage('p-sortPrinciples.html');
            } else if (sev.payload.activity_name === "problem_tagging") {
                // do something, go somewhere
                $.mobile.changePage('p-taggingProblems.html'); 
            } else if (sev.payload.activity_name === "done_problem_tagging") {
                // do something, go somewhere
                $.mobile.changePage('p-wait-screen.html'); 
            } else if (sev.payload.activity_name === "equation_adding") {
                // do something, go somewhere else
            } else {
                console.log('ignoring activity_started, wrong activity');
            }
        },

        classmates_done_tagging: function(sev) {
            //TODO: 
            $.mobile.changePage('p-videoBoardAssignment.html');
        },

        principles_sorted: function(sev) {
            //TODO: 

            //Enable the continue button
            $("#sortPrinciples #doneSortingPrinciplesButton").css("display","block");
            //or automatically go to next screen
            //$.mobile.changePage('p-taggingProblems.html');
        },

        problem_set_received: function(sev) {
            //TODO: 
            Sail.app.problemSet = sev.payload.problem_set;
            Sail.app.updatetaggingProblemsPage();
        }

    };

    // For testing only, without authenticating
    if ( UI_TESTING_ONLY ) {
        self.events.connected();

    }

    // self.restoreState = restoreState;
    
    return self;
})(NEOplace.Tablet);
