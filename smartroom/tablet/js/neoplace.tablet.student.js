/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.Tablet.Student = (function(Tablet) {
    "use strict";
    var self = _.extend(Tablet);

    self.userData = {
        name:null,
        id:null,
        problemSet:[]
    };

    self.currentBoard = null;

    var TOTAL_VIDEO_BOARDS = 4;
    self.visitedVideoBoards = []; //nb: current video board is visitedVideoBoards[ visitedVideoBoards.length-1 ], as long as the DB isn't full of junk;

    self.studentPrinciples = [];

    self.scrollingWidth = 0;
    self.currentlyAnimating = false;
    self.currentProblemIndex = 0;

    self.problemTemplate = "";
    self.equationDragDropTemplate = "";
    // self.problemSet = [];    // added to userData

    self.allEquations = {};
    self.allProblemSets = {};

    //set UI_TESTING_ONLY to true when developing the UI without backend integration, should be set to false when deploying
    var UI_TESTING_ONLY = false;
    console.log( "ATTN: UI_TESTING_ONLY is set to " + UI_TESTING_ONLY );
    // If set to false, remember to uncomment this line from the .html files
    //.thenRun(function() { return Sail.init(NEOplace.Tablet.Student); });  

    /****************************** private functions ********************************/

    var currentDb = function () {
        if ( !UI_TESTING_ONLY ) {
            return Sail.app.run.name;    
           }
    };

    /****************************** public functions ********************************/

    self.escapeSelectorString = function(str) {
        if(str)
            //return str.replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g,'\\\\$1');
            return str.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
        else
            return str;
    };

    self.enableDragAndDropPortal = function(pageScope,id) {

        console.log("enableDragAndDropPortal() on " + pageScope);

        var targetElement = pageScope;
        if ( id ) {
            targetElement += " #" + id;
        }

        console.log("enableDragAndDropPortal() on " + targetElement);

        jQuery(targetElement + " .draggable").draggable({containment: targetElement + " .dragAndDropContainer"});
        jQuery(targetElement + " .tagDropArea").droppable();

        // Drag events on button
        jQuery(targetElement + " .draggable").die();
        jQuery(targetElement + " .draggable").live('dragstart', function(event,ui) {
            // use css to bring more attention to drop area
            jQuery(targetElement + " .tagDropArea").removeClass("idle").addClass("attention");
        }); 
        jQuery(targetElement + " .draggable").live('dragstop', function(event,ui) {
            // remove the css added to drop area in 'dragstart' event
            jQuery(targetElement + " .tagDropArea").removeClass("attention").addClass("idle");
        }); 
        // jQuery(targetElement + " .draggable").live('drag', function(event,ui) {
        //     console.log("dragging ", event.target.getAttribute("value"));
        // });

        // Drop events on portal
        jQuery(targetElement + " .tagDropArea").die();
        jQuery(targetElement + " .tagDropArea").live('drop', function(event,ui) {
            console.log("drop ", ui.draggable.attr("value"));

            if ( !UI_TESTING_ONLY ) {
                if (pageScope === '#taggingEquations') {
                    self.submitEquation(ui.draggable.attr("value"));
                } else {    // this one is for submitting principles
                    self.submitPrinciple(ui.draggable.attr("value"));
                }
            }else{
                //note: don't need to want for response so no need to fake it
            }

            // use css to animate/hide the button
            ui.draggable.addClass("dropped");
        });
    };

    //called on app load
    self.loadProblemTemplate = function() {
        // grab template body for problem layout
        jQuery.ajax({
            url: 'template-problem.html',
            success: function(data, textStatus, jqXHR){
                self.problemTemplate = data;
                console.log("loaded problem template");
            },
            dataType: 'html'
        });
    };

    //called on app load
    self.loadEquationDragDropTemplate = function() {
        // grab template body for problem layout
        jQuery.ajax({
            url: 'template-equationdrop.html',
            success: function(data, textStatus, jqXHR){
                self.equationDragDropTemplate = data;
                console.log("loaded equation drag and drop template");
            },
            dataType: 'html'
        });
    };

    //called on app load
    self.loadAllEquations = function() {
        console.log("loadAllEquations");
        jQuery.ajax({
            url: '/assets/equations.json',
            success: function(data, textStatus, jqXHR){
                self.allEquations = data;
                console.log("loaded equations");
            },
            dataType: 'json'
        });
    };

    // called on app load
    self.loadAllClassroomProblems = function() {
        console.log("loadAllClassroomProblems");
        jQuery.ajax({
            url: '/assets/classroom.json',
            success: function(data, textStatus, jqXHR){
                self.allProblemSets = data;
                console.log("loaded problem sets");
            },
            dataType: 'json'
        });
    };    

    //helper method
    self.parseEquationIdsIntoString = function(equationIds){

        var equations = _.map( equationIds, function(id){
            var eq = {};
            eq.id = id;
            eq.name = '$$'+self.allEquations[id].name+'$$';
            return eq;
        });
        return equations;
    };

    //helper method
    self.parseEquationIdsIntoImgTag = function(equationIds){

        var equations = _.map( equationIds, function(id){
            var eq = {};
            eq.id = id;
            eq.name = '<img src="';
            if ( !UI_TESTING_ONLY ) {
                eq.name += Sail.app.config.assets.url;
            }else{
                eq.name += "/assets";
            }
            eq.name += self.allEquations[id].img10 + '" alt="" />';
            return eq;
        });
        return equations;
    };

    self.getHtmlForProblems = function(pageScope) {

        var loadedProblems = 0;

        _.each( self.userData.problemSet, function(problem){
            // grab problem body html from json files
            jQuery.ajax({
                url: '/assets/problems/'+problem.problem_name+'.html',
                success: function(data, textStatus, jqXHR){

                    //save the html for later
                    problem.htmlContent = data;

                    //if all problems loaded, output
                    loadedProblems++;
                    if (loadedProblems === self.userData.problemSet.length ){
                       self.outputProblems(pageScope); 
                    }

                },
                dataType: 'html'
            });
        });       
    };

    self.outputProblems = function(pageScope) {

        console.log( "outputProblems() on " + pageScope );

        var scrollingProblemsWidth = 0;
        var windowWidth = jQuery(window).width();
        var sidePadding = 30; //ui-content has 30px padding
        var pageContentWidth = windowWidth - sidePadding; 
        self.scrollingWidth = windowWidth; //pageContentWidth; //jQuery("#taggingProblems .attachProblemContainer").css("width"); //(contentWidth - 40); //jQuery("#taggingProblems .problem").css("width");

        var contentWidth = 730;

        _.each( self.userData.problemSet, function(problem,key){
            var id = "problem" + key;

            if (pageScope === "#taggingEquations") {
                jQuery(pageScope+" .scrollingProblems").append('<div class="attachProblemContainer" id="'+id+'">'+ self.problemTemplate + ' ' + self.equationDragDropTemplate +'</div>').trigger("create");
                jQuery('#'+id+' .connectButton').replaceWith("");
            }else{
                jQuery(pageScope+" .scrollingProblems").append('<div class="attachProblemContainer" id="'+id+'">'+ self.problemTemplate +'</div>').trigger("create");
            }

            jQuery('#'+id+' .problem-title').html(problem.title);
            jQuery('#'+id+' .html-content').html(problem.htmlContent);
            jQuery('#'+id+' .connectProblemButton').attr("value", problem.problem_name);

            if ( problem.principles.length > 0 ) {
                var principlesList = "";
                _.each( problem.principles, function(principle){
                    principlesList += "<li>"+principle+"</li>";
                });
                jQuery('#'+id+' .principlesList').html(principlesList).listview("refresh");
            }else{
                jQuery('#'+id+' .principlesList').replaceWith("");
            }

            //var equations = self.parseEquationIdsIntoString(problem.equation_ids);
            var equations = self.parseEquationIdsIntoImgTag(problem.equation_ids);
            var equationsList = "";
            if (pageScope === "#taggingProblems") {
                _.each( equations, function(equation){
                    equationsList += "<li>"+equation.name+"</li>";
                });
                jQuery('#'+id+' .equationsList').html(equationsList).listview("refresh");

            }else{
                jQuery('#'+id+' .equationsList').replaceWith("");

                _.each( equations, function(equation){
                    equationsList += '<div data-role="button" data-inline="true" class="draggable" value="'+equation.id+'">'+equation.name+'</div>';
                });

                jQuery('#'+id+' .draggableTags').html(equationsList).trigger("create");
                self.enableDragAndDropPortal(pageScope, id);

            }
            console.log("equationsList", equationsList);

            scrollingProblemsWidth += windowWidth; // + (sideMargins*2);
        });

        //update formatting of equations
        //MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        //TODO: refresh not happening at right time.... look into a different event to trigger the refresh

        if (pageScope === "#taggingProblems") {
            jQuery(pageScope+' .connectProblemButton').die();
            jQuery(pageScope+' .connectProblemButton').live("click", function(){
                var buttonValue = jQuery(this).attr("value");
                console.log( "click on connect button with value " + buttonValue);
                self.submitProblem(buttonValue);
                jQuery(this).addClass("ui-disabled");
            });
        }
        console.log("windowWidth: " + windowWidth );

        jQuery(pageScope+" .scrollingProblems").css("width",scrollingProblemsWidth);
        jQuery(pageScope+" .scrollingProblems").css("left","0px");

        //jQuery(pageScope+" .attachProblemContainer").css("width", contentWidth + "px" );
        jQuery(pageScope+" .attachProblemContainer").css("width", pageContentWidth + "px" );
        jQuery(pageScope+" .problem").css("width", (contentWidth - 40) + "px");

        
        self.currentlyAnimating = false;
        self.currentProblemIndex = 0;
        
        // jQuery(pageScope).swipeleft(function(){
        //     if ( self.currentlyAnimating ) return;
        //     if ( self.currentProblemIndex == self.userData.problemSet.length-1 ) return;

        //     self.currentProblemIndex++;
        //     self.animateProblems(pageScope);
        // });
        
        // jQuery(pageScope).swiperight(function(){
        //     if ( self.currentlyAnimating ) return;
        //     if ( self.currentProblemIndex == 0 ) return;

        //     self.currentProblemIndex--;
        //     self.animateProblems(pageScope);
        // });

    };

    self.animateProblems = function(pageScope){

        console.log( "animateProblems() on " + pageScope );

        var target = self.scrollingWidth * self.currentProblemIndex;
        console.log("swiping, target: -" + target );

        jQuery(pageScope+" .previousProblem").addClass("ui-disabled");
        jQuery(pageScope+" .nextProblem").addClass("ui-disabled");

        jQuery(pageScope+" .scrollingProblems").animate({left:'-'+target+'px'}, 1000, function(){
            if ( self.currentProblemIndex > 0 ) {
                jQuery(pageScope+" .previousProblem").removeClass("ui-disabled");
            }
            if ( self.currentProblemIndex < self.userData.problemSet.length-1 ) {
                jQuery(pageScope+" .nextProblem").removeClass("ui-disabled");
            }
        });
    };


    self.assignProblems = function(students,principles,page) {
        var groupProblemSets = _.filter(self.allProblemSets, function(problemSet) {
            return ( _.find(problemSet.principles, function(p) {
                if ( _.include(principles, p)) { return true; }
            }) );
        });

        _.each(groupProblemSets, function(problemSet, i) {                          // Pearl to make awesome optimizations later
            if (students[i % students.length] === self.userData.name) {
                self.userData.problemSet.push(problemSet);
            }
        });

        self.setState('problems_tagging');

        jQuery.mobile.changePage(page);
        //self.getHtmlForProblems();
    };

    self.setState = function(activity) {
        var state = {};

        if (activity === "problems_tagging" || activity === "equations_tagging") {
            state = {
                user_name:self.userData.name,
                board:self.currentBoard,
                activity:activity,
                problem_set:self.userData.problemSet
            };
        } else {
            state = {
                user_name:self.userData.name,
                activity:activity,
                board:self.currentBoard
            };           
        }


        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/restore_states', {
            type: 'post',
            data: state,
            success: function () {
                console.log("Restore state set saved: ", state);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert( textStatus + 'Please try again.' );
                // doneBtn.removeClass("ui-disabled");
            }
        });
    };

    self.restoreState = function() {
        // set self.visitedVideoBoards to stored visitedboards (from Rollcall)
        var selector = {"user_name":self.userData.name};
        jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/restore_states', {
            type: 'get',
            data: { selector: JSON.stringify(selector) },
            success: function (statesCompleted) {
                //console.log('restoring ' + statesCompleted);

                // for each - if state.activity is found, return the objects with that state.activity (true), else will be defined (false)
                if ( _.find(statesCompleted, function(state){ return state.activity === "variable_writing";}) ) {
                    self.currentBoard = _.find(statesCompleted, function(state) {
                        return state.activity === "problems_tagging";
                    }).board;

                    console.log('variable_writing step restored');
                    jQuery.mobile.changePage('p-variableWriter.html');
                } else if ( _.find(statesCompleted, function(state){ return state.activity === "equations_tagging";}) ) {
                    self.currentBoard = _.find(statesCompleted, function(state) {
                        return state.activity === "equations_tagging";
                    }).board;

                    self.userData.problemSet = _.toArray(_.find(statesCompleted, function(state) {
                        return state.activity === "equations_tagging";
                    }).problem_set);

                    console.log('equations_tagging step restored. User at  ' + self.currentBoard);
                    jQuery.mobile.changePage('p-taggingEquations.html');
                } else if ( _.find(statesCompleted, function(state){ return state.activity === "problems_tagging";}) ) {
                    self.currentBoard = _.find(statesCompleted, function(state) {
                        return state.activity === "problems_tagging";
                    }).board;

                    self.userData.problemSet = _.toArray(_.find(statesCompleted, function(state) {
                        return state.activity === "problems_tagging";
                    }).problem_set);
                    
                    jQuery.mobile.changePage('p-taggingProblems.html');
                    console.log('problems_tagging step restored. User at ' + self.currentBoard);
                } else if ( _.find(statesCompleted, function(state){ return state.activity === "principles_sorting";}) ) {
                    self.currentBoard = _.find(statesCompleted, function(state) {
                        return state.activity === "principles_sorting";
                    }).board;
                    jQuery.mobile.changePage('p-sortPrinciples.html');
                    console.log('principles_sorting step restored. User at ' + self.currentBoard);
                } else if ( _.find(statesCompleted, function(state){ return state.activity === "principles_tagging";}) ){
                    console.log('principles_tagging step restored');
                    _.each(statesCompleted, function(state) {
                        if (state.activity === "principles_tagging") {
                            self.visitedVideoBoards.push(state.board);
                        }
                    });
                    if (self.visitedVideoBoards.length === TOTAL_VIDEO_BOARDS) {
                        jQuery.mobile.changePage('p-taggingPrinciplesFinished.html');
                    } else {
                        jQuery.mobile.changePage('p-taggingPrinciplesBoard.html');
                    }
                } else {
                    // go to home page or skip of whatever
                    console.log('no saved state');
                    jQuery.mobile.changePage('p-waitScreen.html');
                }

            }
        });

    };

    /************************************ local event wiring *******************************************/

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

            // Load any JS/JSON objects required for the rest of the app
            self.loadProblemTemplate();
            self.loadEquationDragDropTemplate();
            self.loadAllEquations();
            self.loadAllClassroomProblems();

            // ****************
            //PAGE: By default, on login screen ('#loginScreen')
            //jQuery( '#loginScreen' ).live( 'pageinit',function(event){             // this should be commented out right,? Not sure how .live would be triggered?
            //console.log("#loginScreen pageinit");
            if ( !UI_TESTING_ONLY ) {

                // request detailed data about current user from Rollcall
                Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
                    console.log("Authenticated user is: ", data);

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
                self.visitedVideoBoards = [2,3];
                
                //skip button for testing only
                jQuery("#loginScreen .skipButton").css("display","block");
                jQuery("#loginScreen .skipButton").die();
                jQuery("#loginScreen .skipButton").live("click", function(){
                    jQuery.mobile.changePage('p-taggingPrinciplesBoard.html');
                });

            }
            //});

            // ****************
            // PAGE: Students have logged in
            // They can now go to a video board and log in
            jQuery( '#taggingPrinciplesBoard' ).live( 'pageinit',function(event){
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
                jQuery("#taggingPrinciplesBoard .message").html(message);

                // add event handlers to sign in buttons
                jQuery("#taggingPrinciplesBoard .videoBoardSignInButton").die();
                jQuery("#taggingPrinciplesBoard .videoBoardSignInButton").each( function(index) {
                    var alreadyVisited = false;
                    var elementValue = jQuery(this).attr("value");
                    //_.filter
                    //TODO: http://stackoverflow.com/questions/8779799/how-to-break-the-each-function-in-underscore-js
                    _.each( self.visitedVideoBoards, function(boardNumber){
                        if ( elementValue == boardNumber ) {
                            alreadyVisited = true;
                        }
                    });

                    if (alreadyVisited) {
                        jQuery(this).addClass("ui-disabled");
                    }else{
                        jQuery(this).bind('click', function(event,ui) {
                            //console.log( "clicked ", jQuery(this).attr("value") );
                            self.currentBoard = jQuery(this).attr("value");

                            //deactivate all the buttons while backend call is happening
                            jQuery(this).addClass("ui-disabled");
                            jQuery("#taggingPrinciplesBoard .videoBoardSignInButton").die();

                            if ( !UI_TESTING_ONLY ) {
                                // send out check_in (which sends to wait screen)
                                // go to wait screen
                                self.submitCheckIn(self.currentBoard);
                                //jQuery.mobile.changePage('p-taggingPrinciples.html');
                                jQuery.mobile.changePage('p-waitScreen.html');                  // TODO add me back in WAIT SCREEN                             
                            }else{
                                //fake it
                                self.events.sail.activity_started({payload:{activity_name:"video_tagging"}});
                            }

                        });
                    }
                });

                if ( UI_TESTING_ONLY ) {
                    //skip over entire video tagging section
                    jQuery("#taggingPrinciplesBoard .skipButton").css("display","block");
                    jQuery("#taggingPrinciplesBoard .skipButton").die();
                    jQuery("#taggingPrinciplesBoard .skipButton").live("click", function(){
                        jQuery.mobile.changePage('p-taggingPrinciplesFinished.html');
                    });
                }

            });


            // ****************
            // PAGE: Students are asked to watch the video on the smartboard
            // Individually they drag and drop related principles on the tablet
            // (but negotiate final principles together on the smartboard)
            jQuery( '#taggingPrinciples' ).live( 'pageinit',function(event){
                console.log("#taggingPrinciples pageinit");

                jQuery('#taggingPrinciples .doneButton').die();
                jQuery('#taggingPrinciples .doneButton').live("click", function(){

                    // deactive button so only one backend call is made
                    var doneBtn = jQuery(this);
                    doneBtn.addClass("ui-disabled");

                    //save board so button won't be active later
                    self.visitedVideoBoards.push(self.currentBoard);

                    // self.principlesComplete();               // removed

                    // writing state to Mongo
                    self.setState('principles_tagging');

                    // update behaviour of done button
                    var nextPage = "p-waitScreen.html";
                    if ( self.visitedVideoBoards.length === TOTAL_VIDEO_BOARDS ) {
                        nextPage = "p-taggingPrinciplesFinished.html";
                    }

                    if ( !UI_TESTING_ONLY ) {
                        jQuery.mobile.changePage(nextPage);
                    }else{
                        //skip saving
                        jQuery.mobile.changePage(nextPage);
                    }
                });

                var output = '';
                _.each( self.studentPrinciples, function(principleName){ 
                    output += '<div data-role="button" data-inline="true" class="draggable" id="drag-'+principleName+'" value="'+principleName+'">' + principleName +'</div>';
                });

                var pageScope = "#taggingPrinciples";
                jQuery(pageScope + " .draggableTags").html(output).trigger("create");
                self.enableDragAndDropPortal(pageScope);
                
            });


            // ****************
            // PAGE: Students have individually finished tagging so now they are waiting
            // for the rest of the class to finish
            jQuery( '#taggingPrinciplesFinished' ).live( 'pageinit',function(event){
                console.log("#taggingPrinciplesFinished pageinit");

                if ( !UI_TESTING_ONLY ) {
                    //nothing here really...
                }else{
                    // testing button, will actually be 
                    jQuery('#taggingPrinciplesFinished .skipButton').css("display","block");
                    jQuery("#taggingPrinciplesFinished .skipButton").die();
                    jQuery("#taggingPrinciplesFinished .skipButton").live("click", function(){
                        jQuery.mobile.changePage('p-checkInBoard.html');
                    });
                }

            });

//!!!
            // ****************
            // PAGE: Students have been assigned to a group/videoboard for tagging problems
            // They are being asked to gather in front of board and check in
            jQuery( '#checkInBoard' ).live( 'pageinit',function(event){
                console.log("#checkInBoard pageinit");

                jQuery("#checkInBoard .board-number").html(self.currentBoard);


                jQuery("#checkInBoard .videoBoardSignInButton").die();
                jQuery("#checkInBoard .videoBoardSignInButton").live('click', function(){
                    jQuery(this).addClass("ui-disabled");
                    jQuery("#checkInBoard .signInInstructions").css("opacity","0.3");

                    if ( !UI_TESTING_ONLY ) {
                        //self.currentBoard = parseInt( jQuery(this).attr("value") );

                        // write state to Mongo (done when hearing location_assignment)
                        // self.setState('principles_sorting');
                        // send out check_in (which sends to wait screen)
                        self.submitCheckIn(self.currentBoard);

                        //jQuery.mobile.changePage('p-taggingEquations.html');                  
                        jQuery.mobile.changePage('p-waitScreen.html');                  // TODO add me back in WAIT SCREEN
                    }else{
                        self.events.sail.activity_started({payload:{activity_name:"principle_sorting"}});
                    }
                });

            });


            // ****************
            // PAGE: This is an instructional page that only has instructions
            // Will need an event from the video board in order to continue
            jQuery( '#sortPrinciples' ).live( 'pageinit',function(event){
                console.log("#sortPrinciples pageinit");

                if ( !UI_TESTING_ONLY ) {
                    //nothing here really...
                }else{
                    //fake it, move to the next screen due to an event from the video board
                    jQuery('#sortPrinciples .skipButton').css('display','block');
                    jQuery('#sortPrinciples .skipButton').die();
                    jQuery('#sortPrinciples .skipButton').live('click', function(){
                        self.events.sail.activity_started({payload:{activity_name:"problem_tagging"}});
                    });
                }

            });


            // ****************
            // PAGE: Students get 4-5 questions from a batch of 12 or so problems
            // They are asked to flip through all of them and attach ones that are relevant
            jQuery( '#taggingProblems' ).live( 'pageinit',function(event){
                console.log("#taggingProblems pageinit");

                //reset index
                self.currentProblemIndex = 0;

                if ( !UI_TESTING_ONLY ) {

                }else{
                    //fake data
                    self.userData.problemSet = [
                        {   title:"Bowling Ball", 
                            problem_name:"BowlingBall", 
                            principles:["Acceleration", "Newton's First Law"],
                            equation_ids:[4, 18, 21]
                        },
                        {   title:"Bumper Cars", 
                            problem_name:"BumperCars",
                            principles:["Static Friction", "Potential Energy"],
                            equation_ids:[6, 9, 18]
                        },
                        {   title:"Car Stuck in Mud", 
                            problem_name:"StuckCar",
                            principles:["Potential Energy","Work"],
                            equation_ids:[4, 10, 11, 27, 29]
                        }
                    ];

                    //fake it, this event comes from the video board
                    jQuery('#taggingProblems .skipButton').css('display','block');
                    jQuery('#taggingProblems .skipButton').die();
                    jQuery('#taggingProblems .skipButton').live('click', function(){
                        self.events.sail.activity_started({payload:{activity_name:"equation_tagging_board_assigned"}});
                    });
                }
                
                self.getHtmlForProblems("#taggingProblems");

                if ( self.userData.problemSet.length > 1 ) {
                    jQuery("#taggingProblems .nextProblem").removeClass("ui-disabled");
                }

                jQuery("#taggingProblems .previousProblem").click(function(){
                    self.currentProblemIndex--; 
                    self.animateProblems("#taggingProblems");
                });

                jQuery("#taggingProblems .nextProblem").click(function(){
                    self.currentProblemIndex++;
                    self.animateProblems("#taggingProblems");
                });

            });


/*            jQuery( '#testScreen' ).live( 'pageinit',function(event){
                var principles = ["Newton's Second Law", "Fnet = constant"];
                var students = ["Jim","Mike","Pearl"];
                self.assignProblems(students, principles)
            });*/


            // ****************
            // PAGE: Students have been assigned to a NEW group/videoboard for tagging equations
            // They are being asked to gather in front of board and check in
/*            jQuery( '#taggingEquationsBoard' ).live( 'pageinit',function(event){
                console.log("#taggingEquationsBoard pageinit");

                //TODO: When/Where am I getting this # from the agent??
                jQuery("#taggingEquationsBoard .board-number").html("3");

                jQuery("#taggingEquationsBoard .videoBoardSignInButton").die();
                jQuery("#taggingEquationsBoard .videoBoardSignInButton").live('click', function(){
                    jQuery(this).addClass("ui-disabled");
                    jQuery("#taggingEquationsBoard .signInInstructions").css("opacity","0.3");

                    if ( !UI_TESTING_ONLY ) {
                        // write state to Mongo
                        self.setState('equations_tagging');
                        // send out check_in (which sends to wait screen)
                        self.submitCheckIn(self.currentBoard);
                    }else{
                        self.events.sail.activity_started({payload:{activity_name:"equation_tagging"}});
                    }
                });

            });*/


            // ****************
            // PAGE: Students get 4-5 questions from a batch of 12 or so problems based on the previous step
            // They are asked to flip through all of them and attach equations that are relevant
            jQuery( '#taggingEquations' ).live( 'pageinit',function(event){
                console.log("#taggingEquations pageinit");

                self.currentProblemIndex = 0;

                if ( !UI_TESTING_ONLY ) {

                }else{
                    //fake data
                    self.userData.problemSet = [
                        {   title:"Melon Drop", 
                            problem_name:"MellonDrop", 
                            principles:["Acceleration", "Newton's First Law"],
                            equation_ids:[4, 18, 21]
                        },
                        {   title:"Block on a Table Top", 
                            problem_name:"BlockOnTable",
                            principles:["Static Friction", "Potential Energy"],
                            equation_ids:[6, 9, 18]
                        },
                        {   title:"Block on a Board", 
                            problem_name:"BlockOnBoard",
                            principles:["Potential Energy","Work"],
                            equation_ids:[4, 10, 11, 27, 29]
                        }
                    ];

                    //fake it, this event comes from the video board
                    jQuery('#taggingEquations .skipButton').css('display','block');
                    jQuery('#taggingEquations .skipButton').die();
                    jQuery('#taggingEquations .skipButton').live('click', function(){
                        self.events.sail.activity_started({payload:{activity_name:"variable_writing"}});
                    });
                }

                if ( self.userData.problemSet.length > 1 ) {
                    jQuery("#taggingEquations .nextProblem").removeClass("ui-disabled");
                }

                jQuery("#taggingEquations .previousProblem").click(function(){
                    self.currentProblemIndex--;
                    self.animateProblems("#taggingEquations");
                });

                jQuery("#taggingEquations .nextProblem").click(function(){
                    self.currentProblemIndex++;
                    self.animateProblems("#taggingEquations");
                });

                self.getHtmlForProblems("#taggingEquations");

            });

            // ****************
            // PAGE: Students stay in the previous group and write down their variables and assumptions
            jQuery( '#variableWriter' ).live( 'pageinit',function(event){
                console.log("#variableWriter pageinit");

                jQuery('#variableWriter .addButton').die();
                jQuery('#variableWriter .addButton').live('click', function() {

                    var inputtedText = jQuery('#variableWriter #assumptionOrVariable').val().trim();
                    if ( inputtedText === "" ) {
                        return;
                    }

                    console.log( inputtedText );

/*                    var type = null;
                    if (jQuery('input:checked').attr("value") === "choice-1") {
                        type = "variable";
                    } else {
                        type = "assumption";
                    }*/

                    var type = null;                // attempted fix
                    if (jQuery('input:checked').attr("id") === "radio-choice-1") {
                        type = "variable";
                    } else {
                        type = "assumption";
                    }

                    self.submitVariableAssumption(type,inputtedText);

                    //clear typed stuff after successful change
                    jQuery("#variableWriter #assumptionOrVariable").val('');
                });

                if ( !UI_TESTING_ONLY ) {


                }else{

                    //fake it, this event comes from the video board
                    jQuery('#variableWriter .skipButton').css('display','block');
                    jQuery('#variableWriter .skipButton').die();
                    jQuery('#variableWriter .skipButton').live('click', function(){
                        self.events.sail.activity_started({payload:{activity_name:"done_variable_writing"}});
                    });
                }


            });

            
        },

        unauthenticated: function(ev) {
            console.log("User logged out!");
        }
    };

    /************************ OUTGOING EVENTS ******************************/

    self.submitCheckIn = function(videoBoard) {
        var sev = new Sail.Event('check_in', {
            location:videoBoard
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    self.submitPrinciple = function(principleName) {
        var sev = new Sail.Event('student_principle_submit', {
            location:self.currentBoard,
            principle:principleName
        });
        Sail.app.groupchat.sendEvent(sev);
    };  

/*    self.principlesComplete = function() {
         var sev = new Sail.Event('student_principle_submit', {             // fix me
            location:self.currentBoard,
        });
        Sail.app.groupchat.sendEvent(sev);       
    };*/

    self.submitProblem = function(problemName) {
        var sev = new Sail.Event('student_problem_submit', {
            location:self.currentBoard,
            problem:problemName
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    self.submitEquation = function(equationId) {
        var sev = new Sail.Event('student_equation_submit', {
            location:self.currentBoard,
            equation_id:equationId
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    self.submitVariableAssumption = function(type,variableAssumptionContent) {
        var sev = new Sail.Event('student_assumption_variable_submit', {
            type:type,
            message:variableAssumptionContent,
            location:self.currentBoard
        });
        Sail.app.groupchat.sendEvent(sev);
    };

    /************************ INCOMING EVENTS ******************************/

    self.events.sail = {

        // testing event for debugging
        test_event: function(sev) {
            alert('heard the event');
        },

        next_video: function(sev) {
            jQuery.mobile.changePage('p-taggingPrinciplesBoard.html'); 
        },

        location_assignment: function(sev) {
            if (sev.payload.student === self.userData.name) {
                // do ajax to get back if principles_sorting
                var selector = {"user_name":self.userData.name};
                jQuery.ajax(self.drowsyURL + '/' + currentDb() + '/restore_states', {
                    type: 'get',
                    data: { selector: JSON.stringify(selector) },
                    success: function (statesCompleted) {
                        if ( _.find(statesCompleted, function(state){ return state.activity === "principles_sorting";}) ) {
                            self.currentBoard = sev.payload.location;
                            self.setState("equations_tagging");
                            jQuery.mobile.changePage('p-checkInBoard.html');
                        } else {
                            self.currentBoard = sev.payload.location;
                            self.setState("principles_sorting");
                            jQuery.mobile.changePage('p-checkInBoard.html');
                        }
                    }
                });
            }
        },

/*        videowall_principles_commit: function(sev) {
            // the if checks for this tablet user
            if ( _.include(sev.payload.students, self.userData.name) ) {
                self.userData.group = sev.payload.students;                 // do we need this?
                self.assignProblems(sev.payload.students,sev.payload.principles,'p-taggingProblems.html');
                // assignProblems also moves the tablet to the next page          
            }
        },*/

        videowall_principles_commit: function(sev) {
            // the if checks for this tablet user
            if (sev.payload.videowall === self.currentBoard) {
                self.assignProblems(sev.payload.students,sev.payload.principles,'p-taggingProblems.html');
                // assignProblems also moves the tablet to the next page          
            }
        },

        videowall_problems_commit: function(sev) {
            // the if checks for this tablet user
            if (sev.payload.videowall === self.currentBoard) {
                jQuery.mobile.changePage('p-waitScreen.html');
                // assignProblems also moves the tablet to the next page          
            }
        },


/*        videowall_principles_commit: function(sev) {
            // the if checks for this tablet user
            if ( _.include(sev.payload.students, self.userData.name) ) {
                jQuery.mobile.changePage('p-waitScreen.html');
                // assignProblems also moves the tablet to the next page          
            }
        },   */     

/*        videowall_equations_commit: function(sev) {
            if ( _.include(sev.payload.videowall, self.userData.name) ) {
                self.setState("variable_writing");
                jQuery.mobile.changePage('p-variableWriter.html');
            }
        },*/

        videowall_equations_commit: function(sev) {
            if (sev.payload.videowall === self.currentBoard) {
                self.setState("variable_writing");
                jQuery.mobile.changePage('p-variableWriter.html');
            }
        },        

        teacher_assumptions_variables_approve: function(sev) {
            if ( sev.payload.location === self.currentBoard ) {
                jQuery.mobile.changePage('p-finishPage.html');
            }
        },

        // will always be trigger by teacher (while tablet is sitting on wait screen)
        activity_started: function(sev) {
            if (sev.payload.activity_name === "video_tagging") {
                jQuery.mobile.changePage('p-taggingPrinciples.html');

            } else if (sev.payload.activity_name === "principle_sorting") {
                // do something, go somewhere
                jQuery.mobile.changePage('p-sortPrinciples.html');

            } else if (sev.payload.activity_name === "problem_tagging") {
                // do something, go somewhere
                jQuery.mobile.changePage('p-taggingProblems.html'); 

            } else if (sev.payload.activity_name === "done_problem_tagging") {
                // do something, go somewhere
                jQuery.mobile.changePage('p-wait-screen.html');

            } else if (sev.payload.activity_name === "equation_tagging_board_assigned") {
                jQuery.mobile.changePage('p-taggingEquationsBoard.html');

            } else if (sev.payload.activity_name === "equation_tagging") {
                self.userData.group = sev.payload.students;                 // do we need this?
                self.assignProblems(sev.payload.students,sev.payload.principles,'p-taggingEquations.html');                

            } else if (sev.payload.activity_name === "done_equation_tagging") {
                // do something, go somewhere else
                jQuery.mobile.changePage('p-wait-screen.html');

            } else if (sev.payload.activity_name === "variable_writing") {
                // do something, go somewhere else
                jQuery.mobile.changePage('p-variableWriter.html');

            } else if (sev.payload.activity_name === "done_variable_writing") {
                // do something, go somewhere else
                jQuery.mobile.changePage('p-finishPage.html');

            } else {
                console.log('ignoring activity_started, wrong activity');
            }
        }

    };

    // For testing only, without authenticating
    if ( UI_TESTING_ONLY ) {
        self.events.connected();

    }

    // self.restoreState = restoreState;
    
    return self;
})(NEOplace.Tablet);
