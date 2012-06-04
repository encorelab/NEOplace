/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall */

var NEOplace = window.NEOplace || {};

NEOplace.FrontBoardAggregator = (function() {

    // Set this to true only on one saving data.
    var saveModeOn = true;

    // TODO: move this out to config.json
    // var assetsUrl="http://neoplace.aardvark.encorelab.org/assets/equations/20pt/";
    
    var self = {};

    self.name = "NEOplace.FrontBoardAggregator";

    // only users matching this filter will be shown in the account picker
    self.userFilter = function (u) {
        return u.kind === "Agent";
    };

    self.init = function() {
        Sail.app.rollcall = new Rollcall.Client(Sail.app.rollcallURL);

        Sail.app.run = Sail.app.run || JSON.parse(jQuery.cookie('run'));
        if (Sail.app.run) {
            Sail.app.groupchatRoom = Sail.app.run.name + '@conference.' + Sail.app.xmppDomain;
        }

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'username-and-password', askForRun: true, curnit: 'NEOplace', userFilter: self.userFilter})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget')
            .thenRun(function () {
                Sail.autobindEvents(Sail.app);

                jQuery(Sail.app).trigger('initialized');
                return true;
            });
    };

    self.authenticate = function () {
        Sail.app.token = Sail.app.rollcall.getCurrentToken();

        if (!Sail.app.run) {
            Rollcall.Authenticator.requestRun();
        } else if (!Sail.app.token) {
            Rollcall.Authenticator.requestLogin();
        } else {
            Sail.app.rollcall.fetchSessionForToken(Sail.app.token, function(data) {
                    Sail.app.session = data;
                    jQuery(Sail.app).trigger('authenticated');
                },
                function(error) {
                    console.warn("Token '"+Sail.app.token+"' is invalid. Will try to re-authenticate...");
                    Rollcall.Authenticator.unauthenticate();
                }
            );
        }
    };


    // Define control variables
    var principlesOn = true;
    var problemsOn = true;
    var equationsOn = true;
    var variablesOn = true;
    var assumptionsOn = true;
    var absolutePositionOn = false;
    var problems = {};

    var loadProblems = function () {

        jQuery.ajax(Sail.app.config.assets.url + '/problems.json', {
           dataType: 'json',
           success: function (data) {
               
               _.each(data, function (p) {
                   problems[p.name] = p.title;
               });
               console.log("Problems Loaded");
               //console.log("Testing problem Title: ", problems["Cheetah"]);
           }
       });

   };
    // Shows board and toolbars. This function is called when sail is connected.
    var showHtmlContent = function() {
        jQuery("#board").fadeIn("slow");
        jQuery("#toolbars").fadeIn("slow");
        jQuery("#board").show();
        jQuery("#toolbars").show();
    };

    // Renders default view. Show 4 quadrants
    var viewAllQuadrants = function () {
        var winHeight = jQuery(window).height(),
            winWidth = jQuery(window).width(),
            quadrantHeight = (winHeight/2)-46,
            quadrantWidth = (winWidth/2)-22;

        // show all
        jQuery("#quadrant-A").show();
        jQuery("#quadrant-B").show();
        jQuery("#quadrant-C").show();
        jQuery("#quadrant-D").show();

        jQuery("#quadrant-A").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);

        jQuery("#quadrant-B").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px"
        }, 1000);

        jQuery("#quadrant-C").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px"
        }, 1000);
        
        jQuery("#quadrant-D").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px"
        }, 1000);
    };

    // Hides all quadrants. 
    var hideAllQuadrants = function() {
        jQuery("#quadrant-A").hide();
        jQuery("#quadrant-B").hide();
        jQuery("#quadrant-C").hide();
        jQuery("#quadrant-D").hide();
    };

    // Shows in fullscreen a given quadrant. Receives quadrant id
    var fullScreenOneQuadrant = function (quadrantId) {

        // for all quadrants load default
        if(quadrantId=="ALL")
        {
            viewAllQuadrants();
        } else {

            var winHeight = jQuery(window).height(),
                winWidth = jQuery(window).width()-4,
                quadrantHeight = winHeight-56;

            // hide all
            hideAllQuadrants();

            // set new size of the quadrant
            jQuery("#quadrant-"+quadrantId).show();

            jQuery("#quadrant-"+quadrantId).animate({ 
                height: quadrantHeight+"px", 
                width: winWidth+"px"
            }, 1000);
        }

        // highlight active option in UI
        jQuery("#fullscreen-toolbar a").removeClass("widget-box-selected");

        jQuery("#board-"+quadrantId).addClass("widget-box-selected");

    };

    /*
        Saves the current html content of the boad. 
        This can be restored with function "dbRestoreStateBoard"
        uses frontboard_aggregator collection_states collection
    */
    var dbSaveState = function () {
        var boardHtml = jQuery('#board').html();

        var stateObj = {
            state:boardHtml
        };

        jQuery.ajax(Sail.app.config.mongo.url + '/' + Sail.app.run.name + '/frontboard_aggregator_states', {
            type: 'post',
            data: stateObj,

            success: function () {
                console.log("Saved state in frontboard_aggregator_states");
                //Sail.app.groupchat.sendEvent(sev);
                jQuery("#status").html("State Saved");
            },
            error: function (e) {
                console.log('some error when saving state.');
            }
        });
    };

    /* 
        Restores the data sent by _commit events
        uses frontboard_aggregator collection
    */ 
    var dbRestoreState = function(){
        jQuery("#status").html("Restoring...");
        jQuery.ajax(Sail.app.config.mongo.url + '/' + Sail.app.run.name + '/frontboard_aggregator', {
           dataType: 'json',
           success: function (data) {

            console.log("frontboard_aggregator Restored successfully");

            // empty quadrants
            jQuery("#quadrant-content-A").html("");
            jQuery("#quadrant-content-B").html("");
            jQuery("#quadrant-content-C").html("");
            jQuery("#quadrant-content-D").html("");

            _.each(data, function(obj){
                
                addElementToBoard(obj);
            });

            jQuery("#status").html("Data Restored");
               
           },
           error: function (e) {
                console.log("error restoring frontboard_aggregator", e);
                jQuery("#status").html("");
           }
       });
    
        
    };
    
    // Restores the last html board saved 
    var dbRestoreStateBoard = function(){

        jQuery.ajax(Sail.app.config.mongo.url + "/" + Sail.app.run.name + '/frontboard_aggregator_states', {
           dataType: 'json',
           success: function (data) {

            console.log("Last Capture Restored");
            jQuery('#board').html(_.last(data).state);
            jQuery("#status").html("Last Capture Restored");

            // make all draggable again
            jQuery("#quadrant-content-A div").draggable({ containment: "#quadrant-A"});
            jQuery("#quadrant-content-B div").draggable({ containment: "#quadrant-B"});
            jQuery("#quadrant-content-C div").draggable({ containment: "#quadrant-C"});
            jQuery("#quadrant-content-D div").draggable({ containment: "#quadrant-D"});

            // expand on double click
            jQuery("#board .assumption").dblclick(function () {
                
                var theFullText = jQuery(this).text();
                var myDivId = jQuery(this).attr("id");
                jQuery("#"+myDivId + " span").first().fadeIn("slow");
                jQuery("#"+myDivId + " span").first().show();
                jQuery("#"+myDivId).mousedown(bringDraggableToFront);
            });


            // contract on click
            jQuery("#board .assumption").click(function () {

                var myDivId = jQuery(this).attr("id");
                jQuery("#"+myDivId + " span").first().fadeIn("slow");
                jQuery("#"+myDivId + " span").first().hide();
                jQuery("#"+myDivId).mousedown(bringDraggableToFront);

            });

            // bring element to front
            jQuery("#board .paper div").focusin(function () {
                jQuery(this).mousedown(bringDraggableToFront);
            });
            
               
           },
           error: function (e) {
                console.log("error restoring last Capture", e);
                jQuery("#status").html("");
           }
       });
    };

    // saves incomming event into db: this is kind of redundant!!
    var submitFrontboardAggregatorData = function(obj) {
        
        //console.log('Starting to save frontboard_aggregator.');

        //var sev = new Sail.Event('aggregator_submit', obj);
        
        jQuery.ajax(Sail.app.config.mongo.url + '/' + Sail.app.run.name + '/frontboard_aggregator', {
            type: 'post',
            data: obj,

            success: function () {
                console.log("Frontboard Aggregator saved: ", obj);
                //Sail.app.groupchat.sendEvent(sev);
                if(saveModeOn) {
                    dbSaveState(); // we don't need this, the user can triger this function any time.
                }

            },
            error: function (e) {
                console.log('some error when saving  frontboard_aggregator.');
            }
        });
    };

    /* 
        Adds element to target quadrant. 
        Recieves an object with data needed.
        This function is called when XMPP events are received.
    */
    var addElementToBoard = function (obj) {
        
        var divId = MD5.hexdigest(obj.name)+"-"+Math.floor((Math.random()*100)+1);
        // Element needs to be defined here since it is used after if else block.
        // JS moves var definitions to the top but not great to do this anyways
        var element = jQuery();

        // assumptions
        if(obj.css_class=="assumption" && obj.text!=""){
            
            element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"<br/><span class='assumption-fulltext'>"+obj.text+"</span></div>");

            // expand on double click
            element.dblclick(function () {
                
                var theFullText = jQuery(this).text();
                var myDivId = jQuery(this).attr("id");
                jQuery("#"+myDivId + " span").first().fadeIn("slow");
                jQuery("#"+myDivId + " span").first().show();

            });

            // contract on click
            element.click(function () {

                var myDivId = jQuery(this).attr("id");
                jQuery("#"+myDivId + " span").first().fadeIn("slow");
                jQuery("#"+myDivId + " span").first().hide();

            });

        // equations
        } else if (obj.css_class=="equation" && obj.name!="") {
            
            // image version
            element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'><img alt='"+obj.name+"' src='"+Sail.app.assetsURL+"/equations/20pt/"+obj.name+".png"+"'></div>");

            
            // TODO: render LATEX code version: NOT USED NOW
            //var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'><div>"+parseEquationIdIntoString(obj.name)+"</div>");

            // TODO: force render here? : NOT USED NOW
            //MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

        } else if (obj.css_class=="problem" && obj.name!="") {
            element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.title+"</div>");
            
        } else {
            element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"</div>");
        }

        // bring the element to the top when clicked
        element.mousedown(bringDraggableToFront);

        element.fadeIn("slow");

        element.css('position', 'absolute'); 

        // make element dragable
        element.draggable({ containment: "#quadrant-"+ obj.board});


        // Calculte element's random position for each quadrant
        var winHeight = jQuery(window).height(),
            winWidth = jQuery(window).width(),
            quadrantHeight = winHeight/2,
            quadrantWidth = winWidth/2,
            tolerance = 100,
            Min = 0,
            Max = 0,
            left = 0,
            top = 0;

            Min = 0;
            Max = quadrantWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = 0;
            Max = quadrantHeight-60;
            top = Min + (Math.random() * ((Max - Min) + 1));

        // set position 
        element.css('left', left + 'px');
        element.css('top', top + 'px');

        //console.log("Board: "+obj.board+"; left: "+left+"; top:"+top);

        // Add element to target board
        var board = jQuery("#quadrant-content-"+obj.board).prepend(element);

        
        if(!absolutePositionOn){
            jQuery("#quadrant-content-"+obj.board+" div").css('position', 'inherit');
        }

    };

    // Brings a .ui-draggable element to the front (via z-index).
    // This is meant to be used as a callback for jQuery event bindings,
    // so `this` is assumed to refer to the element you want to bring
    // to the front.
    var bringDraggableToFront = function () {
        var zs = jQuery('.ui-draggable').map(function() {
            var z = jQuery(this).css('z-index'); 
            return z === 'auto' ? 100 : parseInt(z, 10);
        }).toArray();
        var maxZ = Math.max.apply(Math, zs);
        jQuery(this).css('z-index', maxZ + 1);

        //test make make all position absolute
        //jQuery("#quadrant-content-A div").css('position', 'absolute');
    };

    self.events = {
        initialized: function (ev) {
            NEOplace.FrontBoardAggregator.authenticate();
            Sail.app.drowsyURL = Sail.app.config.mongo.url;
            Sail.app.assetsURL = Sail.app.config.assets.url;
        },

        'ui.initialized': function (ev) {

            // Define UI events and functions

            jQuery('#absolute-pos').click(function () {
                
                elementLink = jQuery('#absolute-pos');

                if(absolutePositionOn)
                {
                    absolutePositionOn = false;
                    jQuery("#quadrant-content-A div").css('position', 'inherit');
                    jQuery("#quadrant-content-B div").css('position', 'inherit');
                    jQuery("#quadrant-content-C div").css('position', 'inherit');
                    jQuery("#quadrant-content-D div").css('position', 'inherit');
                    elementLink.removeClass("widget-box-selected");
                } else {
                    absolutePositionOn = true;
                    jQuery("#quadrant-content-A div").css('position', 'absolute');
                    jQuery("#quadrant-content-B div").css('position', 'absolute');
                    jQuery("#quadrant-content-C div").css('position', 'absolute');
                    jQuery("#quadrant-content-D div").css('position', 'absolute');
                    elementLink.addClass("widget-box-selected");

                }
            });

            jQuery('#filter-principles').click(function () {
                
                elementLink = jQuery('#filter-principles');

                if(principlesOn)
                {
                    principlesOn = false;
                    jQuery(".principle").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    principlesOn = true;
                    jQuery(".principle").show();
                    elementLink.addClass("widget-box-selected");

                }
            });

            jQuery('#filter-problems').click(function () {
            
                elementLink = jQuery('#filter-problems');

                if(problemsOn)
                {
                    problemsOn = false;
                    jQuery(".problem").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    problemsOn = true;
                    jQuery(".problem").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            jQuery('#filter-equations').click(function () {

                elementLink = jQuery('#filter-equations');

                if(equationsOn)
                {
                    equationsOn = false;
                    jQuery(".equation").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    equationsOn = true;
                    jQuery(".equation").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            jQuery('#filter-variables').click(function () {
                
                elementLink = jQuery('#filter-variables');

                if(variablesOn)
                {
                    variablesOn = false;
                    jQuery(".variable").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    variablesOn = true;
                    jQuery(".variable").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            jQuery('#filter-assumptions').click(function () {
                elementLink = jQuery('#filter-assumptions');

                if(assumptionsOn)
                {
                    assumptionsOn = false;
                    jQuery(".assumption").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    assumptionsOn = true;
                    jQuery(".assumption").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            // adding functions for full screen 
            jQuery('#board-ALL').click(function () {

                fullScreenOneQuadrant("ALL");
            });

            jQuery('#board-A').click(function () {
                fullScreenOneQuadrant("A");
            });

            jQuery('#board-B').click(function () {
                fullScreenOneQuadrant("B");
            });

            jQuery('#board-C').click(function () {
                fullScreenOneQuadrant("C");
            });

            jQuery('#board-D').click(function () {
                fullScreenOneQuadrant("D");
            });


            // db-restore from single elements frontboard_aggregator
            jQuery('#db-restore-state').click(function () {
                dbRestoreState();
            });

            // db-restore from single elements frontboard_aggregator
            jQuery('#db-restore-state-board').click(function () {
                dbRestoreStateBoard();
            });

// db-restore entire board including position of elements
            jQuery('#db-save-state').click(function () {
                if(saveModeOn) {
                    dbSaveState();
                } else {
                    alert("Save mode is not ON \nThis board is only watching");
                }
            });
        },

        connected: function (ev) {
            console.log("Connected...");
            
            // Displaying content only when sails is connected.
            //loadAllEquations();
            loadProblems();
            showHtmlContent();
            viewAllQuadrants();
        },

        sail: {

            /* Sail events and functions */

            aggregator_submit: function(sev) {
                //console.log(sev);
                alert("frontboard aggregator data saved");
            },

            videowall_assumptions_variables_commit: function (sev) {
                _.each(sev.payload.variables, function (i) {
                    if(i!=null){
                        var variable = {
                            board:sev.payload.videowall,
                            name:i,
                            css_class:"variable"
                        };
                        addElementToBoard(variable);
                        if(saveModeOn) {
                            submitFrontboardAggregatorData(variable);
                        }
                    }
                });

                _.each(sev.payload.assumptions, function (i) {
                    if(i!=null){
                        var shortName = "";
                        var text = "";
                        
                        // cut text in assumption
                        if(i.length>30){
                            shortName = i.substr(0,30)+ " ...";
                            text = i;
                        } else {
                            shortName = i;
                            text = "";
                        }
                        var assumption = {
                            board:sev.payload.videowall,
                            name:shortName,
                            css_class:"assumption",
                            text:text
                        };
                        addElementToBoard(assumption);
                        if(saveModeOn) {
                            submitFrontboardAggregatorData(assumption);
                        }
                    }

                });
            },

            videowall_equations_commit: function (sev) {
                _.each(sev.payload.equation_ids, function (i) {
                    if(i!=null){
                        var equation = {
                            board:sev.payload.videowall,
                            name:i,
                            css_class:"equation"
                        };
                        addElementToBoard(equation);

                        if(saveModeOn) {
                            submitFrontboardAggregatorData(equation);
                        }
                    }
                });
            },

            videowall_problems_commit: function (sev) {
                _.each(sev.payload.problem_keys, function (i) {
                    if(i!=null){
                        var problem = {
                            board:sev.payload.videowall,
                            name:i,
                            title:problems[i],
                            css_class:"problem"
                        };

                        addElementToBoard(problem);
                        if(saveModeOn) {
                            submitFrontboardAggregatorData(problem);
                        }
                    }   
                });
            },

            videowall_principles_commit: function (sev) {
                var eachFinished = false;

                _.each(sev.payload.principles, function (i) {
                    if(i!=null){

                        var principle = {
                            board:sev.payload.videowall,
                            name:i,
                            css_class:"principle"
                        };
                        addElementToBoard(principle);
                        if(saveModeOn) { 
                            submitFrontboardAggregatorData(principle);
                        }
                    }

                });
            }
        }
    };
	
    return self;
})(NEOplace.FrontBoardAggregator);
