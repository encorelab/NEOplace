/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall */

var NEOplace = window.NEOplace || {};

NEOplace.FrontBoardAggregator = (function() {

    //var equationsUrl="http://localhost/mywebapps/PlaceWeb.GitHub/NEOplace/smartroom/frontboard-aggregator/equations/";
    var equationsUrl="http://neoplace.aardvark.encorelab.org/smartroom/frontboard-aggregator/equations/";

    var self = {};

    self.name = "NEOplace.FrontBoardAggregator";

    self.cumulativeTagArray = [];

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
        //jQuery("#quadrant-content-1 div").css('position', 'absolute');
    };

    var showHtmlContent = function() {
        jQuery("#board").fadeIn("slow");
        jQuery("#toolbars").fadeIn("slow");
        jQuery("#board").show();
        jQuery("#toolbars").show();

    }

    // set quadrants' width and height
    var viewAllQuadrants = function () {
        var winHeight = $(window).height(),
            winWidth = $(window).width(),
            quadrantHeight = (winHeight/2)-30,
            quadrantWidth = (winWidth/2)-5;

        // show all
        jQuery("#quadrant-1").show();
        jQuery("#quadrant-2").show();
        jQuery("#quadrant-3").show();
        jQuery("#quadrant-4").show();

        $("#quadrant-1").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);

        $("#quadrant-2").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);

        $("#quadrant-3").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);
        
        $("#quadrant-4").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);
    }

    var hideAllQuadrants = function() {
        jQuery("#quadrant-1").hide();
        jQuery("#quadrant-2").hide();
        jQuery("#quadrant-3").hide();
        jQuery("#quadrant-4").hide();
    }

    // set quadrants' width and height
    var fullScreenOneQuadrant = function (quadrantId) {

        // for all quadrants load default
        if(quadrantId==0)
        {
            viewAllQuadrants();
        } else {

            var winHeight = $(window).height(),
                winWidth = $(window).width(),
                quadrantHeight = winHeight-56;

            // hide all
            hideAllQuadrants();

            // set new size of the quadrant
            jQuery("#quadrant-"+quadrantId).show();

            $("#quadrant-"+quadrantId).animate({ 
                height: quadrantHeight+"px", 
                width: winWidth+"px", 
            }, 1000);
        }

        // highlight active view in toolbar
        jQuery("#fullscreen-toolbar a").removeClass("widget-box-selected");

        jQuery("#board-"+quadrantId).addClass("widget-box-selected");

    }

    // Add element to target board
    var addElementToBoard = function (obj) {
        
        var divId = MD5.hexdigest(obj.name)+"-"+Math.floor((Math.random()*100)+1);

        // assumptions
        if(obj.css_class=="assumption" && obj.text!=""){
            
            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"<br/><span class='assumption-fulltext'>"+obj.text+"</span></div>");

            // expand on double click
            element.dblclick(function () {
                
                var theFullText = $(this).text();
                var myDivId = $(this).attr("id");
                $("#"+myDivId + " span").first().fadeIn("slow");
                $("#"+myDivId + " span").first().show();

            });

            // contract on click
            element.click(function () {

                var myDivId = $(this).attr("id");
                $("#"+myDivId + " span").first().fadeIn("slow");
                $("#"+myDivId + " span").first().hide();

            });

        // equations
        } else if (obj.css_class=="equation" && obj.name!="") {
            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'><img alt='"+obj.name+"' src='"+equationsUrl+obj.name+"'></div>");

        } else {
            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"</div>");
        }

        // bring the element to the top when clicked
        element.mousedown(bringDraggableToFront);

        element.fadeIn("slow");

        // set absolute position
        element.css('position', 'absolute'); 

        // make element dragable
        element.draggable({ containment: "#quadrant-"+ obj.board});


        // Calculte element's random position for each quadrant
        var winHeight = $(window).height(),
            winWidth = $(window).width(),
            quadrantHeight = jQuery("#quadrant-1").height(),
            quadrantWidth = jQuery("#quadrant-1").width(),
            tolerance = 185,
            Min = 0,
            Max = 0,
            left = 0,
            top = 0;

        if (obj.board==1) {
            Min = 0;
            Max = quadrantWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = 0;
            Max = quadrantHeight-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));

        } else if (obj.board==2) {
            Min = winWidth-quadrantWidth;
            Max = winWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = 0;
            Max = quadrantHeight-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));
            
        } else if (obj.board==3) {
            Min = 0;
            Max = quadrantWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = quadrantHeight;
            Max = (quadrantHeight*2)-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));
        } else if (obj.board==4) {
            Min = winWidth-quadrantWidth;
            Max = winWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = quadrantHeight;
            Max = (quadrantHeight*2)-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));
        }
        
        // set position 
        element.css('left', left + 'px');
        element.css('top', top + 'px');

        // Add element to target board
        var board = jQuery("#quadrant-content-"+obj.board).prepend(element);

    }

    self.init = function() {
        Sail.app.groupchatRoom = 'neo-a@conference.' + Sail.app.xmppDomain;

        // TODO: move this out to config.json
        Sail.app.username = "neo-frontwall-2";
        Sail.app.password = "22d5d010a45fac5b72bc151e60bf60dc8bc089a8";

        Sail.modules
            .load('Strophe.AutoConnector', {mode: 'pseudo-anon'})
            .load('AuthStatusWidget')
            .thenRun(function () {
                Sail.autobindEvents(NEOplace.FrontBoardAggregator);
                jQuery(Sail.app).trigger('initialized');

                // TODO: add click bindings here

                return true;
            });
    };

    self.authenticate = function () {
        jQuery(self).trigger('authenticated');
    };

    
    var principlesOn = true;
    var problemsOn = true;
    var equationsOn = true;
    var variablesOn = true;
    var assumptionsOn = true;

    var absolutePositionOn = true;

    self.events = {
        initialized: function (ev) {
            NEOplace.FrontBoardAggregator.authenticate();
        },

        'ui.initialized': function (ev) {

            jQuery('#absolute-pos').click(function () {
                
                elementLink = jQuery('#absolute-pos');

                if(absolutePositionOn)
                {
                    absolutePositionOn = false;
                    jQuery("#quadrant-content-1 div").css('position', 'relative');
                    jQuery("#quadrant-content-2 div").css('position', 'relative');
                    jQuery("#quadrant-content-3 div").css('position', 'relative');
                    jQuery("#quadrant-content-4 div").css('position', 'relative');

                    elementLink.removeClass("widget-box-selected");
                } else {
                    absolutePositionOn = true;
                    jQuery("#quadrant-content-1 div").css('position', 'absolute');
                    jQuery("#quadrant-content-2 div").css('position', 'absolute');
                    jQuery("#quadrant-content-3 div").css('position', 'absolute');
                    jQuery("#quadrant-content-4 div").css('position', 'absolute');

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
            jQuery('#board-0').click(function () {

                fullScreenOneQuadrant(0);
            });

            jQuery('#board-1').click(function () {
                fullScreenOneQuadrant(1);
            });

            jQuery('#board-2').click(function () {
                fullScreenOneQuadrant(2);
            });

            jQuery('#board-3').click(function () {
                fullScreenOneQuadrant(3);
            });

            jQuery('#board-4').click(function () {
                fullScreenOneQuadrant(4);
            });
        },

        connected: function (ev) {
            console.log("Connected...");
            
            showHtmlContent();
            viewAllQuadrants();


        },

        sail: {

            videowall_assumptions_variables_commit: function (sev) {
                _.each(sev.payload.variables, function (i) {
                    var variable = {
                        board:sev.payload.origin,
                        name:i,
                        css_class:"variable"
                    }
                    // add to board
                    addElementToBoard(variable);
                });

                _.each(sev.payload.assumptions, function (i) {
                    
                    if(i.length>30){
                        shortName = i.substr(0,30)+ " ...";
                        text = i;
                    } else {
                        shortName = i;
                        text = "";
                    }

                    //var 

                    var assumption = {
                        board:sev.payload.origin,
                        name:shortName,
                        css_class:"assumption",
                        text:text
                    }
                    // add to board
                    addElementToBoard(assumption);
                });
            },

            videowall_equations_commit: function (sev) {
                _.each(sev.payload.equations, function (i) {
                    var equation = {
                        board:sev.payload.origin,
                        name:i,
                        css_class:"equation"
                    }


                    // add to board
                    addElementToBoard(equation);
                })
            },

            videowall_problems_commit: function (sev) {
                _.each(sev.payload.problems, function (i) {
                    var problem = {
                        board:sev.payload.origin,
                        name:i,
                        css_class:"problem"
                    }
                    // add to board
                    addElementToBoard(problem);
                })
            },

            videowall_principles_commit: function (sev) {
                _.each(sev.payload.principles, function (i) {
                    var principle = {
                        board:sev.payload.origin,
                        name:i,
                        css_class:"principle"
                    }


                    // add to board
                    addElementToBoard(principle);
                })
            }
        }
    };

	
    return self;
})();
