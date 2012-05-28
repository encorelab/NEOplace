/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    self.userData;
    self.userId;
    self.groupData = {
        members:[]
    };

    var TOTAL_VIDEO_BOARDS = 4;
    self.visitedVideoBoards = []; //nb: current video board is visitedVideoBoards[ visitedVideoBoards.length-1 ];

    self.studentPrinciples = [];

    self.problemSet = [];

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = true;
    console.log( "ATTN: UI_TESTING_ONLY is set to " + !UI_TESTING_ONLY );

    var YES = '<div class="checklist_icon yes_icon"></div>';
    var NO = '<div class="checklist_icon no_icon"></div>';

    /** private functions **/

    var currentDb = function () {
        return Sail.app.run.name;  
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

    self.updateProblemPickerPage = function(problemSet) {

    //                         // grab problem from json files
    //                 $.ajax({
    //                     url: '/assets/problems/'+Sail.app.currentProblem.name+'.html',
    //                     success: function(data, textStatus, jqXHR){

    //                         //save the html for later
    //                         Sail.app.currentProblem.htmlContent += data;


    //                     },
    //                     dataType: 'html'
    //                 });
    }

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
            $( '#loginScreen' ).live( 'pageinit',function(event){
                console.log("#loginScreen pageinit");
                if ( !UI_TESTING_ONLY ) {
                    // request detailed data about current user from Rollcall
                    Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
                        console.log("Authenticated user is: ", data);

                        if (data.groups[1]) {
                            console.log('WARNING: user has been assigned to more than one group, chosing first group in the list');
                        }

                        //save their principles for videoTagging page
                        self.studentPrinciples = data.metadata.principles;

                        // automatically goto the next page
                        $.mobile.loadPage( 'p-chooseVideoBoard.html');

                    });
                }else{

                    //dummy principles for videoTagging page
                    self.studentPrinciples = ["Newton's First Law", "Newton's Second Law", "Newton's Third Law"];
                    
                    //start button for testing only
                    $("#loginScreen #signInStartButton").css("display","block");
                }
            });


            // ****************
            // PAGE: Students have logged in
            // They can now go to any video board and log in
            $( '#chooseVideoBoard' ).live( 'pageinit',function(event){
                console.log("#chooseVideoBoard pageinit");

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
                $("#chooseVideoBoard .message").html(message);

                // add event handlers to sign in buttons
                $("#chooseVideoBoard .videoBoardSignInButton").die();
                $("#chooseVideoBoard .videoBoardSignInButton").each( function(index) {
                    var alreadyVisited = false;
                    var elementValue = $(this).attr("value");
                    _.each( self.visitedVideoBoards, function(boardNumber){
                        if ( elementValue == boardNumber ) {
                            alreadyVisited = true;
                            return; //break out of loop early
                        }
                    });

                    if (alreadyVisited) {
                        $(this).addClass("ui-disabled");
                    }else{
                        $(this).bind('click', function(event,ui) {
                            //console.log( "clicked ", $(this).attr("value") );
                            var currentBoard = parseInt( $(this).attr("value") );
                            self.visitedVideoBoards.push( currentBoard );

                            //deactivate all the buttons while backend call is happening
                            $(this).addClass("ui-disabled");
                            $("#chooseVideoBoard .videoBoardSignInButton").die();

                            if ( !UI_TESTING_ONLY ) {
                                //TODO: backend call
                                Sail.app.submitVideoBoardLogin(data.account.login, currentBoard);
                            }else{
                                //fake it
                                self.events.sail.video_board_checkin();
                            }

                        });
                    }
                });

            });


            // ****************
            // PAGE: Students are asked to watch the video on the smartboard
            // Individually they drag and drop related principles on the tablet
            // (but negotiate final principles together on the smartboard)
            $( '#videoTagging' ).live( 'pageinit',function(event){
                console.log("#videoTagging pageinit");

                // update behaviour of done button
                var nextPage = "p-chooseVideoBoard.html";
                if ( self.visitedVideoBoards.length == TOTAL_VIDEO_BOARDS ) {
                    nextPage = "p-finishedTagging.html";
                }

                $('#videoTagging #videoTaggingDoneButton').die();
                $('#videoTagging #videoTaggingDoneButton').live("click", function(){
                    $.mobile.changePage(nextPage);
                });

                //output draggable buttons onto the videoTagging page
                var output = '';
                _.each( self.studentPrinciples, function(principleName){ 
                    output += '<div data-role="button" data-inline="true" class="draggable" \
                        id="drag-'+principleName+'" \
                        value="'+principleName+'" \
                        >' 
                        + principleName 
                        +'</div>';
                });
                $("#videoTagging #draggableTags").html(output).trigger("create");
                $("#videoTagging #draggableTags .draggable").draggable({containment:"#principleDragging"});
                $("#tagDropArea").droppable();

                // Drag events on button
                $('#videoTagging #draggableTags .draggable').die();
                $('#videoTagging #draggableTags .draggable').live('dragstart', function(event,ui) {
                    // use css to bring more attention to drop area
                    $("#principleDragging #tagDropArea").removeClass("idle");
                    $("#principleDragging #tagDropArea").addClass("attention");

                    // shouldn't need this but can be used for debugging
                    //$(this).removeClass("dropped");
                }); 
                $('#videoTagging #draggableTags .draggable').live('dragstop', function(event,ui) {
                    // remove the css added to drop area in 'dragstart' event
                    $("#principleDragging #tagDropArea").removeClass("attention");
                    $("#principleDragging #tagDropArea").addClass("idle");
                }); 
                // $('#videoTagging #draggableTags .draggable').live('drag', function(event,ui) {
                //     console.log("dragging ", event.target.getAttribute("value"));
                // });

                // Drop events on portal
                $("#tagDropArea").die();
                $("#tagDropArea").live('drop', function(event,ui) {
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
            $( '#finishedTagging' ).live( 'pageinit',function(event){
                console.log("#finishedTagging pageinit");

                if ( !UI_TESTING_ONLY ) {
                    //nothing here really...
                }else{
                    // testing button, will actually be 
                    //self.events.sail.classmates_done_tagging();
                    $( '#finishedTagging #finishedTaggingContinueButton').css("display","block");
                }

            });


            // ****************
            // PAGE: Students have logged in and have been assigned to a group/videoboard
            // They are being asked to gather in front of board and check in
            $( '#videoBoardAssignment' ).live( 'pageinit',function(event){
                console.log("#videoBoardAssignment pageinit");

                $("#videoBoardAssignment #boardAssignmentSignInButton").die();
                $("#videoBoardAssignment #boardAssignmentSignInButton").live('click', function(){
                    $(this).addClass("ui-disabled");
                    $("#videoBoardAssignment #signInInstructions").css("opacity","0.3");

                    if ( !UI_TESTING_ONLY ) {
                        //TODO: backend call
                        Sail.app.submitVideoBoardLogin(data.account.login, currentBoard);
                    }else{
                        //fake it
                        self.events.sail.group_video_board_checkin();
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
                    self.events.sail.principles_sorted();
                }

            });


            // ****************
            // PAGE: Students get 4-5 questions from a batch of 12 or so problems
            // They are asked to flip through all of them and attach ones that are relevant
            $( '#problemPicker' ).live( 'pageinit',function(event){
                console.log("#problemPicker pageinit");

                //TODO: show loading animation

                if ( !UI_TESTING_ONLY ) {

                    Sail.app.getProblemSetRelatedToVideo();

                }else{
                    //fake it
                    var fakeProblemSet = ["BowlingBall","BumperCars"]; //TODO: more complex than this
                    self.updateProblemPickerPage(fakeProblemSet);
                }

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

    self.submitVideoBoardLogin = function(userName, videoBoard) {
        //TODO: test this
        var sev = new Sail.Event('checkin', {
            user_name:userName,
            video_board:videoBoard
        });
        Sail.app.groupchat.sendEvent(sev);
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

        video_board_checkin: function(sev) {
            //TODO: 
            $.mobile.changePage('p-videoTagging.html');
        },

        classmates_done_tagging: function(sev) {
            //TODO: 
            $.mobile.changePage('p-videoBoardAssignment.html');
        },

        group_video_board_checkin: function(sev) {
            //TODO: 

            //Enable the continue button
            $("#videoBoardAssignment #boardAssignmentContinueButton").removeClass("ui-disabled");
            //or automatically go to next screen
            //$.mobile.changePage('p-sortPrinciples.html');
        },

        principles_sorted: function(sev) {
            //TODO: 

            //Enable the continue button
            $("#sortPrinciples #doneSortingPrinciplesButton").css("display","block");
            //or automatically go to next screen
            //$.mobile.changePage('p-problemPicker.html');
        },

        problem_set_received: function(sev) {
            //TODO: 
            Sail.app.problemSet = sev.payload.problem_set;
            Sail.app.updateProblemPickerPage();
        }

    };

    // For testing only, without authenticating
    if ( UI_TESTING_ONLY ) {
        self.events.connected();
    }
    
    return self;
})(NEOplace.Tablet);
