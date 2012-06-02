/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Teacher = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    var TOTAL_VIDEO_BOARDS = 4;
    self.currentBoard = 1;
    self.approvedBoards = 0;

    //stuff about boards will be kept here
    self.boards = { 
        "A": { students:[], principles:[], problems:[] },
        "B": { students:[], principles:[], problems:[] },
        "C": { students:[], principles:[], problems:[] },
        "D": { students:[], principles:[], problems:[] }
    }

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = false;
    console.log( "ATTN: UI_TESTING_ONLY is set to " + UI_TESTING_ONLY );
    // If set to false, remember to uncomment this line from the .html files
    //.thenRun(function() { return Sail.init(NEOplace.Tablet.Student); });  


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

            if ( !UI_TESTING_ONLY ) {

                // request detailed data about current user from Rollcall
                Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
                    console.log("Authenticated user is: ", data);
                    // user's metadata is in data.metadata
                    $.mobile.changePage("p-taggingPrinciples.html");
                });

            }

        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
        }
    };

    /************************ OUTGOING EVENTS ******************************/

    self.submitStartVideo = function() {
        var sev = new Sail.Event('next_video', {}); //no payload
        Sail.app.groupchat.sendEvent(sev);
    }

    self.submitStartActivity = function(activityName) {
        var sev = new Sail.Event('activity_started', {
            activity_name:activityName,
        });
        Sail.app.groupchat.sendEvent(sev);

        //$.mobile.changePage('p-taggingPrinciples.html');
    }

    self.submitVideoAnswerComplete = function(videoBoardLetter, studentNames) {
        var sev = new Sail.Event('video_answer_complete', {
            location:videoBoardLetter,
            students:studentNames
        });
        Sail.app.groupchat.sendEvent(sev);

        //$.mobile.changePage('p-taggingPrinciples.html');
    }

    self.submitTeacherPrinciplesApprove = function(boardLetter) {
        console.log( "submitTeacherPrinciplesApprove()", boardLetter);
        var board = self.boards[boardLetter];
        console.log(board);
        var sev = new Sail.Event('teacher_principles_approve', {
            principles: board.principles,
            students: board.students
        });
    }

    /************************ INCOMING EVENTS ******************************/

    self.events.sail = {
        videowall_principles_commit: function (sev) {
            var boardLetter = sev.payload.videowall;
            console.log("Heard that board " + boardLetter + " is done sorting principles.")
            $('#sortPrinciples .approveButton[value="'+boardLetter+'"]').removeClass("ui-disabled");
            //save principles for this group
            self.boards[boardLetter].students = sev.payload.students;
            self.boards[boardLetter].principles = sev.payload.principles;
        }

    };

    /************************ PUBLIC METHODS ******************************/

    // only users matching this filter will be shown in the account picker
    self.userFilter = function (u) {
        return u.kind === "Instructor";
    };

    self.updatePrincipleBoardButtons = function(eventString, roundNum){
        console.log("updatePrincipleBoardButtons()", eventString, roundNum, self.currentBoard);
        var roundNum = parseInt(roundNum);
        if ( eventString === "allowSignIn" ) {
            self.currentBoard = roundNum; //self.currentBoard + 1;
            $('#taggingPrinciples .allowSignInButton[value="'+roundNum+'"]').addClass('ui-disabled');
            $('#taggingPrinciples .startVideoButton[value="'+roundNum+'"]').removeClass('ui-disabled');
        
        } else if ( eventString === "startVideo" ) {
            $('#taggingPrinciples .startVideoButton[value="'+roundNum+'"]').addClass('ui-disabled');
            if ( roundNum === TOTAL_VIDEO_BOARDS ) {
                $('#taggingPrinciples .nextStepButton').removeClass('ui-disabled');
            }else{
                $('#taggingPrinciples .allowSignInButton[value="'+(roundNum+1)+'"]').removeClass('ui-disabled');
            }

        }
    
    }

    // ****************
    //PAGE: By default, on login screen ('#loginScreen')
    $( '#loginScreen' ).live( 'pageinit',function(event){
        console.log("#loginScreen pageinit");
        if ( UI_TESTING_ONLY ) {
            //skip button for testing only
            $("#loginScreen .skipButton").css("display","block");
            $("#loginScreen .skipButton").die();
            $("#loginScreen .skipButton").live("click", function(){
                $.mobile.changePage('p-taggingPrinciples.html');
            });
        }
    });


    // ****************
    // PAGE: Students are asked to watch the video on the smartboard
    // Individually they drag and drop related principles on the tablet
    // (but negotiate final principles together on the smartboard)
    $( '#taggingPrinciples' ).live( 'pageinit',function(event){
        console.log("#taggingPrinciples pageinit");

        $('#taggingPrinciples .allowSignInButton[value="'+self.currentBoard+'"]').removeClass("ui-disabled");
        $('#taggingPrinciples .allowSignInButton').click(function(){
            var roundNum = $(this).attr("value");
            if ( !UI_TESTING_ONLY ) {
                self.submitStartVideo(); //xmpp msg
            }
            self.updatePrincipleBoardButtons("allowSignIn", roundNum);
        });
        $('#taggingPrinciples .startVideoButton').click(function(){
            var roundNum = $(this).attr("value");
            if ( !UI_TESTING_ONLY ) {
                self.submitStartActivity("video_tagging"); //xmpp msg
            }
            self.updatePrincipleBoardButtons("startVideo", roundNum);
        });

        $('#taggingPrinciples .nextStepButton').click(function(){
            $.mobile.changePage('p-sortPrinciples.html');
        });

        //if ( UI_TESTING_ONLY ) {
            //skip button for testing only
            $("#taggingPrinciples .skipButton").css("display","block");
            $("#taggingPrinciples .skipButton").die();
            $("#taggingPrinciples .skipButton").live("click", function(){
                $.mobile.changePage('p-sortPrinciples.html');
            });
        //}

    });

    // ****************
    // PAGE: Students sort principles on the video board from the previous step
    // Teacher will approve the group's board after it hears "done"  
    $( '#sortPrinciples' ).live( 'pageinit',function(event){
        console.log("#sortPrinciples pageinit");

        self.approvedBoards = 0;

        $('#sortPrinciples .startStepButton').click(function(){
            $(this).addClass("ui-disabled");
            if ( !UI_TESTING_ONLY ) {
                self.submitStartActivity("principle_sorting"); //xmpp msg
            }else{
                $('#sortPrinciples .approveButton').removeClass("ui-disabled");
            }
        });

        //When the tablet hears "done" from the video board, update the button
        //(see "videowall_principles_commit" event)
        //$('#sortPrinciples .approveButton[value="A"]').removeClass("ui-disabled");
        
        $('#sortPrinciples .approveButton').click(function(){
            $(this).addClass("ui-disabled");
            var boardLetter = $(this).attr("value");
            self.approvedBoards = self.approvedBoards + 1;
            if ( self.approvedBoards == TOTAL_VIDEO_BOARDS ) {
                $('#sortPrinciples .nextStepButton').removeClass('ui-disabled');
            }
            if ( !UI_TESTING_ONLY ) {
                self.submitTeacherPrinciplesApprove(boardLetter); //xmpp
            }
        });

        $('#sortPrinciples .nextStepButton').click(function(){
            $.mobile.changePage('p-taggingEquations.html');
        });

        //if ( UI_TESTING_ONLY ) {
            //skip button for testing only
            $("#sortPrinciples .skipButton").css("display","block");
            $("#sortPrinciples .skipButton").die();
            $("#sortPrinciples .skipButton").live("click", function(){
                $.mobile.changePage('p-taggingEquations.html');
            });
        //}

    });

    // ****************
    // PAGE: 
    $( '#taggingEquations' ).live( 'pageinit',function(event){
        console.log("#taggingEquations pageinit");

        self.approvedBoards = 0;

        $('#taggingEquations .startStepButton').click(function(){
            $(this).addClass("ui-disabled");
            if ( !UI_TESTING_ONLY ) {
                self.submitStartActivity("equation_tagging"); //xmpp msg
            }else{
                $('#taggingEquations .approveButton').removeClass("ui-disabled");
            }
        });

        $('#taggingEquations .approveButton').click(function(){
            $(this).addClass("ui-disabled");
            self.approvedBoards = self.approvedBoards + 1;
            console.log(self.approvedBoards);
            if ( self.approvedBoards == TOTAL_VIDEO_BOARDS ) {
                $('#taggingEquations .nextStepButton').removeClass('ui-disabled');
            }
        });

        $('#taggingEquations .nextStepButton').click(function(){
            $.mobile.changePage('p-recordVideo.html');
        });

        if ( !UI_TESTING_ONLY ) {

        }else{
            //skip button for testing only
            $("#taggingEquations .skipButton").css("display","block");
            $("#taggingEquations .skipButton").die();
            $("#taggingEquations .skipButton").live("click", function(){
                $.mobile.changePage('p-recordVideo.html');
            });
        }

    });

    // ****************
    // PAGE: 
    $( '#recordVideo' ).live( 'pageinit',function(event){
        console.log("#recordVideo pageinit");

        $('#recordVideo .startStepButton').click(function(){
            $(this).addClass("ui-disabled");
            if ( !UI_TESTING_ONLY ) {
                self.submitStartActivity("video_answer"); //xmpp msg
            }else{
                $('#recordVideo .doneButton').removeClass("ui-disabled");
            }
        });

        $('#recordVideo .doneButton').click(function(){
            $(this).addClass("ui-disabled");
            var videoBoardLetter = $(this).attr("value");
            if ( !UI_TESTING_ONLY ) {
                self.submitVideoAnswerComplete(videoBoardLetter,["slim","aho","sliu"]); //xmpp msg //TODO: get rid of hardcoded students
            }
        });
    });

    
    return self;
})(NEOplace.Tablet);
