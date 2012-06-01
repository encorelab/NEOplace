/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, NEOplace */

NEOplace.Tablet.Teacher = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    var TOTAL_VIDEO_BOARDS = 4;
    self.currentBoard = 1;
    self.approvedBoards = 0;


    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = true;
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
                });

            }

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
        return u.kind === "Instructor";
    };

    self.updatePrincipleBoardButtons = function(){
        //console.log("updatePrincipleBoardButtons() " + self.currentBoard);
        $('#taggingPrinciples .startVideoButton[value="'+self.currentBoard+'"]').addClass('ui-disabled');
        self.currentBoard = self.currentBoard + 1;
        if ( self.currentBoard <= TOTAL_VIDEO_BOARDS ) {
            $('#taggingPrinciples .startVideoButton[value="'+self.currentBoard+'"]').removeClass('ui-disabled');
        }else{
            $('#taggingPrinciples .nextStepButton').removeClass('ui-disabled');
        }
    }

    // ****************
    //PAGE: By default, on login screen ('#loginScreen')
    $( '#loginScreen' ).live( 'pageinit',function(event){
        console.log("#loginScreen pageinit");
        if ( !UI_TESTING_ONLY ) {

        }else{

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

        $('#taggingPrinciples .startVideoButton[value="'+self.currentBoard+'"]').removeClass("ui-disabled");
        $('#taggingPrinciples .startVideoButton').click(function(){
            self.updatePrincipleBoardButtons();
        });

        $('#taggingPrinciples .nextStepButton').click(function(){
            $.mobile.changePage('p-sortPrinciples.html');
        });

        if ( !UI_TESTING_ONLY ) {

        }else{
                 //skip button for testing only
                $("#taggingPrinciples .skipButton").css("display","block");
                $("#taggingPrinciples .skipButton").die();
                $("#taggingPrinciples .skipButton").live("click", function(){
                    $.mobile.changePage('p-sortPrinciples.html');
                });
        }

    });

    // ****************
    // PAGE: Students sort principles on the video board from the previous step
    // Teacher will approve the group's board after it hears "done"  
    $( '#sortPrinciples' ).live( 'pageinit',function(event){
        console.log("#sortPrinciples pageinit");

        self.approvedBoards = 0;

        $('#sortPrinciples .startStepButton').click(function(){
            $(this).addClass("ui-disabled");
            $('#sortPrinciples .approveButton').removeClass("ui-disabled");
        });

        //TODO: when the tablet hears "done" from the video board, change the color of the button
        //$('#sortPrinciples .approveButton[value="A"]').addClass();
        $('#sortPrinciples .approveButton').click(function(){
            $(this).addClass("ui-disabled");
            self.approvedBoards = self.approvedBoards + 1;
            console.log( self.approvedBoards );
            if ( self.approvedBoards == TOTAL_VIDEO_BOARDS ) {
                $('#sortPrinciples .nextStepButton').removeClass('ui-disabled');
            }
        });

        $('#sortPrinciples .nextStepButton').click(function(){
            $.mobile.changePage('p-taggingEquations.html');
        });

        if ( !UI_TESTING_ONLY ) {

        }else{
                 //skip button for testing only
                $("#sortPrinciples .skipButton").css("display","block");
                $("#sortPrinciples .skipButton").die();
                $("#sortPrinciples .skipButton").live("click", function(){
                    $.mobile.changePage('p-taggingEquations.html');
                });
        }

    });

    // ****************
    // PAGE: 
    $( '#taggingEquations' ).live( 'pageinit',function(event){
        console.log("#taggingEquations pageinit");

        self.approvedBoards = 0;

        $('#taggingEquations .startStepButton').click(function(){
            $(this).addClass("ui-disabled");
            $('#taggingEquations .approveButton').removeClass("ui-disabled");
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

    
    return self;
})(NEOplace.Tablet);
