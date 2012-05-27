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

                        // Update the group name and their biggie concept
                        // then automatically goto the next page
                        $("#videoBoardAssignment .groupname").html(data.groups[0].name);
                        //$("#videoBoardAssignment .biggie-concept").html(data.metadata.biggie); //where will this come from??
                        $.mobile.loadPage( 'p-videoBoardAssignment.html');

                    });
                }else{
                    $("#loginScreen #signInStartButton").css("display","block");
                }
            });

            // ****************
            // PAGE: Students have logged in and have been assigned to a group/videoboard
            // They are being asked to gather in front of board and check in
            $( '#videoBoardAssignment' ).live( 'pageinit',function(event){
                console.log("#videoBoardAssignment pageinit");
                if ( !UI_TESTING_ONLY ) {
                    //TODO: When everyone in the group has checked in, using the teacher tablet, autoforward to the next screen
                    $.mobile.loadPage( 'p-videoTagging.html');
                }else{
                    $("#videoBoardAssignment #boardAssignmentContinueButton").css("display","block");
                }
            });

            // ****************
            // PAGE: Students are asked to watch the video on the smartboard
            // Individually they drag and drop related principles on the tablet
            // (but negotiate final principles together on the smartboard)
            $( '#videoTagging' ).live( 'pageinit',function(event){
                console.log("#videoTagging pageinit");

                if ( !UI_TESTING_ONLY ) {
                    var ajaxUrl = self.drowsyURL + '/' + currentDb() + '/states'; //TODO: is this from the db or from the agent?

                }else{
                    var ajaxUrl = "/assets/fakedata/principles.json";
                    $("#videoTagging #videoTaggingContinueButton").css("display","block");
                }

                // $.ajax( ajaxUrl, {
                //     type: 'get',
                //     data: null,
                //     success: function () {
                //         $("#tagDropArea").css("display","block");

                            var tempPrinciples = ["Newton's First Law", "Newton's Second Law", "Newton's Third Law"];

                            var output = '';
                            _.each(tempPrinciples, function(principleName){ 
                                output += '<div data-role="button" data-inline="true" class="draggable" id="drag-1">' 
                                    + principleName +'</div>';
                            });
                            $("#videoTagging #draggableTags").html(output).trigger("create");
                //     }, 
                //     dataType: 'json'
                // });
                
                $("#videoTagging .draggable").draggable();
                $("#tagDropArea").droppable({
                    drop: function( event, ui ) {
                      $( this )
                        .addClass( "ui-state-highlight" )
                        .find( "#dragReminder" )
                          .html( "Dropped!" );
                    }
                });

                
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

    /************************ INCOMING EVENTS ******************************/

    self.events.sail = {

        // testing event for debugging
        test_event: function(sev) {
            alert('heard the event');
        }

    };

    // For testing only, without authenticating
    if ( UI_TESTING_ONLY ) {
        self.events.connected();
    }
    
    return self;
})(NEOplace.Tablet);
