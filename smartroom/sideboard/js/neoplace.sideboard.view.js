/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Backbone, Rollcall, NEOplace, MD5 */

(function(app) {
    var view = {};

    // disable the droppable destroy() method to fix
    // droppable behaviour (droppable destroyed after drop)
    // see: http://stackoverflow.com/questions/5020695/jquery-draggable-element-no-longer-draggable-after-drop
    jQuery.ui.draggable.prototype.destroy = function (ul, item) { };

    view.bringDraggableToFront = function () {
        var zs = jQuery('.ui-draggable').map(function() {
            var z = jQuery(this).css('z-index'); 
            return z === 'auto' ? 100 : parseInt(z, 10);
        }).toArray();
        var maxZ = Math.max.apply(Math, zs);
        jQuery(this).css('z-index', maxZ + 1);
    };

    // find or create element in parent matching the selector;
    // if element doesn't exist in parent, create it with the given html
    var foc = function(parent, selector, html) {
        var el = parent.find(selector);
        if (el.length) {
            return el;
        } else {
            el = jQuery(html);
            parent.append(el);
            return el;
        }
    };

    var generateBalloonElement = function (balloon, view) {
        var jel = jQuery("<div class='balloon' id='"+view.domID()+"'></div>");

        var label = foc(jel, '.label', 
                                "<div class='label'></div>");

        switch(balloon.getType()) {
            case 'principle':
                var principle = balloon.get('principle');
                label.text(principle);
                break;
            case 'problem':
                var pid = balloon.get('problem');
                var problem = _.find(app.problems, function (p) { return p.name == pid; });
                var txt;
                if (problem)
                    txt = problem.title;
                else
                    txt = "!!! " + pid + " !!!";
                label.text(txt);
                break;
            case 'equation':
                var eqid = balloon.get('equation');
                var obj = foc(jel, 'obj',
                                '<object class="equation-svg" type="image/svg+xml"></object>');
                if (app.equations[eqid]) {
                    var svg = app.config.assets.url + app.equations[eqid].imgsvg;
                    obj.attr('data', svg);
                    label.append(obj);
                    label.append('<div class="svg-cover"></div>');
                } else {
                    label.text("!!! "+eqid+" !!!");
                }
                break;
            case 'assumption':
            case 'variable':
                var assvar = balloon.get('assumption') || balloon.get('variable');
                label.text(assvar);
                break;
        }

        jel.addClass(balloon.getType())
            .addClass(view.domGrouping());

        return jel[0];
    };

    view.TagBalloonView = Backbone.View.extend({
        initialize: function () {
            this.model.on('change:sorted_as', this.sorted, this);
        },

        render: function () {
            var b = this.model;

            var el = jQuery('#' + this.domID());
            if (el.length) {
                this.setElement(el);
            } else {
                el = generateBalloonElement(b, this);
                this.setElement(el);
                this.$el.data('view', this);

                this.$el.addClass("tag-balloon");

                this.$el.draggable({
                    stop: function (ev, ui) {
                        b.save({pos: ui.position});
                    }
                });

                // BANDAID: For some reason in Chrome draggable() makes balloon's position 'relative'...
                //          Need to reset it back to absolute for proper positioning within the wall.
                this.$el.css('position', 'absolute');

                // bring the balloon to the top when clicked
                this.$el.mousedown(app.bringDraggableToFront);

                this.$el.hide();
                jQuery("#sorting-space").append(this.$el);
                
                if (b.has('pos')) {
                    this.$el.css({
                        left: b.get('pos').left + 'px',
                        top: b.get('pos').top + 'px'
                    });
                } else { 
                    this.autoPosition();
                }

                
                this.$el.addClass('new');

                this.$el.show();
            }

            if (this.model.get('tags').length > 1) {
                var counter = foc(this.$el, '.counter', 
                            "<div class='counter'></div>");

                counter.text(this.model.get('tags').length - 1);

                
                //this.$el.effect('highlight', 'slow');
                counter.effect('highlight', 'slow');
                
            }

            this.sorted();
            
            return this;
        },

        domID: function () {
            return 'tag-'+this.model.id;
        },

        domGrouping: function () {
            return this.model.get('grouping');
        },

        autoPosition: function () {
            var left, top;

            var boardWidth = jQuery("#sorting-space").width();
            var boardHeight = jQuery("#sorting-space").height();
            
            
            left = Math.random() * (boardWidth - this.$el.width());
            top = Math.random() * (boardHeight - this.$el.height());
            
            this.$el.css({
                left: left + 'px',
                top: top + 'px'
            });
            
            this.model.save({pos: {left: left, top: top}});
        },

        sorted: function () {
            switch (this.model.get('sorted_as')) {
                case 'accepted':
                    this.$el
                        .removeClass('sorted-as-rejected')
                        .addClass('sorted-as-accepted');
                    break;
                case 'rejected':
                    this.$el
                        .removeClass('sorted-as-accepted')
                        .addClass('sorted-as-rejected');
                    break;
                default:
                    this.$el.removeClass('sorted-as-accepted sorted-as-rejected');
            }
        }
    });

    view.CommittedBalloonView = Backbone.View.extend({
        render: function () {
            var b = this.model;

            var el = jQuery('#' + this.domID());
            if (el.length) {
                this.setElement(el);
            } else {
                el = generateBalloonElement(b, this);
                this.setElement(el);
                this.$el.data('view', this);

                this.$el.addClass("committed-balloon");

                this.$el.hide();

                jQuery(".committed-box."+b.getType()).append(this.$el);
                
                
                this.$el.addClass('new');

                // fix for firefox; seems to somehow set display: block automatically
                this.$el.css('display', 'inline-block');
                this.$el.show();
            }

            return this;
        },

        domID: function () {
            return 'committed-'+this.model.id;
        },

        domGrouping: function () {
            return this.model.get('grouping');
        }
    });

    view.makeSortingSpaceDroppable = function (done) {
        // just in case
        view.unmakeSortingSpaceDroppable();

        console.log("Making sorting space droppable...");
        if (jQuery('#sorting-space-yup').is('ui-droppable-disabled')) {
            jQuery('#sorting-space-yup, #sorting-space-nope').droppable('enable');
        } else {
            jQuery('#sorting-space-yup, #sorting-space-nope').droppable({
                greedy: true,
                over: function (ev, ui) {
                    var balloon = jQuery(ui.draggable);
                    var sortedAs = jQuery(this).data('sorted-as');
                    balloon.data('view').model.set('sorted_as', sortedAs);
                }
            });
        }
        
        jQuery('#done-sorting').bind('click', function () {
            if (confirm("Commit your sorted tags?")) {
                done();
            }
        });
    };

    view.unmakeSortingSpaceDroppable = function () {
        console.log("Un-making sorting space droppable...");
        jQuery('#sorting-space-yup, #sorting-space-nope').droppable('disable');

        jQuery('#done-sorting').unbind('click');
    };

    app.view = view;
})(NEOplace.SideBoard);