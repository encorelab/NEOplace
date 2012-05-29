/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall */

var NEOplace = window.NEOplace || {};

NEOplace.FrontBoardAggregator = (function() {
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
    };

    // set quadrants' width and height
    var setQuadrantsDimensions = function () {
        var winHeight = $(window).height(),
            quadrantHeight = (winHeight/2)-28;

        //jQuery('#board').innerHeight() - 100;
        jQuery("#board").css("height",(winHeight)+"px");
        jQuery("#quadrant-1").css("height",quadrantHeight+"px");
        jQuery("#quadrant-2").css("height",quadrantHeight+"px");
        jQuery("#quadrant-3").css("height",quadrantHeight+"px");
        jQuery("#quadrant-4").css("height",quadrantHeight+"px");
    }

    setQuadrantsDimensions();

    // make draggable all div in each quadrant
    jQuery("#quadrant-1 div").draggable();
    jQuery("#quadrant-2 div").draggable();
    jQuery("#quadrant-3 div").draggable();
    jQuery("#quadrant-4 div").draggable();

    // Add element to target board
    var addElementToBoard = function (obj) {
        
        var divId = MD5.hexdigest(obj.name);

        // add exception for assumptions
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


        } else {

            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"</div>");
        }


        // bring the element to the top when clicked
        element.mousedown(bringDraggableToFront);


        // Add to  target board
        var board = jQuery("#quadrant-"+obj.board).prepend(element);

        jQuery("#quadrant-1 div").draggable();
        jQuery("#quadrant-2 div").draggable();
        jQuery("#quadrant-3 div").draggable();
        jQuery("#quadrant-4 div").draggable();

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

    self.events = {
        initialized: function (ev) {
            NEOplace.FrontBoardAggregator.authenticate();
        },

        'ui.initialized': function (ev) {

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


        },

        connected: function (ev) {
            console.log("Connected...");

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
