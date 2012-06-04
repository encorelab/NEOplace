/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

(function(app) {
    var events = {};
    events.sail = {};

    /* INCOMING SAIL EVENTS */

    var forMe = function (sev) {
        return sev.payload.location === app.location ||
                sev.payload.videowall === app.location;
    };

    var student_submit = function (sev, type, value) {
        if (!forMe(sev)) return;

        var tag = new app.model.Tag({
            location: sev.payload.location,
            video_url: jQuery('#video-screen iframe').attr('src'),
            author: sev.origin
        });
        tag.set(type, value);
        tag.save(); // TODO: check save success

        var b = app.balloons.find(function (b) {
            return b.grouping() == tag.grouping();
        });

        if (!b) {
            console.log("Creating new TagBalloon for "+type+" ", value);
            b = new app.model.TagBalloon({
                location: sev.payload.location
            });
            b.set(type, value);
            app.balloons.add(b);

            app.view.disableDoneSortingButton(); // disable until sorted
        }

        if (!b.getType()) {
            console.warn("Ignoring student submit with bad data!", sev.payload);
            return;
        }

        b.addTag(tag);
        
        new app.view.TagBalloonView({model: b})
                        .render();

        b.save(); // TODO: check save success
    };

    events.sail.student_principle_submit = function(sev) {
        student_submit(sev, 'principle', sev.payload.principle);
    };

    events.sail.student_problem_submit = function(sev) {
        student_submit(sev, 'problem', sev.payload.problem);
    };

    events.sail.student_equation_submit = function(sev) {
        student_submit(sev, 'equation', sev.payload.equation_id);
    };

    events.sail.student_assumption_variable_submit = function(sev) {
        student_submit(sev, sev.payload.type, sev.payload.message);
    };

    events.sail.activity_started = function (sev) {
        //if (!forMe(sev)) return;

        switch (sev.payload.activity_name) {
            case 'principle_sorting':
                app.switchToPrincipleSorting();
                break;
            case 'equation_tagging': // yes, tagging, even though it's sorting
                app.switchToEquationSorting();
                break;

            // case 'principle_sorting':
            //     app.switchToPrincipleSorting();
            //     break;
            // case 'problem_sorting':
            //     app.switchToProblemSorting();
            //     break;
            // case 'equation_sorting':
            //     app.switchToEquationSorting();
            //     break;
            // // TODO: automatically started
            // case 'assvar_sorting':
            //     app.switchToAssvarSorting();
            //     break;
        }
    };

    events.sail.videowall_principles_commit = function (sev) {
        if (!forMe(sev)) return;

        //app.switchToProblemTagging();
        app.switchToProblemSorting();

    };

    events.sail.videowall_problems_commit = function (sev) {
        // do nothing; we're waiting for agent to signal
    };

    events.sail.videowall_equations_commit = function (sev) {
        if (!forMe(sev)) return;

        app.switchToAssvarSorting();
    };

    events.sail.teacher_assumptions_variables_approve = function (sev) {
        if (!forMe(sev)) return;

        events.teacherApprovedAssvars();
    };

    events.sail.check_in = function (sev) {
        var username = sev.origin;;
        if (sev.payload.location === app.location) {
            app.view.addCheckedInUser(username);
        } else {
            app.view.removeCheckedInUser(username);
        }
    };

    /* METHODS THAT TRIGGER OUTGOING SAIL EVENTS */

    var commitBalloons = function () {
        app.balloons.each(function (b) {
            b.save({committed: true});
        });

        app.committed.add(app.balloons.filter(function (b) {
            return b.get('sorted_as') == 'accepted';
        }));
    };

    events.doneSortingPrinciples = function() {
        console.log("Done sorting principles...");
        jQuery('.tag-balloon')
            .hide('fade', 'fast');

        var principles = _.uniq(app.balloons.pluck('principle'));
        var students = _.uniq(_.flatten(app.balloons.pluck('contributors')));

        var sev = new Sail.Event('videowall_principles_commit', {
            principles: principles,
            students: students,
            videowall: app.location
        });

        app.groupchat.sendEvent(sev);

        commitBalloons();
    };

    events.doneSortingProblems = function(rationale) {
        console.log("Done sorting problems...");
        jQuery('.tag-balloon')
            .hide('fade', 'fast');

        var problem_keys = _.uniq(app.balloons.pluck('problem'));
        var students = _.uniq(_.flatten(app.balloons.pluck('contributors')));

        var problem_titles = _.map(problem_keys, function (k) {
            return app.problems[k];
        });

        var sev = new Sail.Event('videowall_problems_commit', {
            problem_keys: problem_keys,
            problem_titles: problem_titles,
            students: students,
            rationale: rationale,
            videowall: app.location
        });

        app.groupchat.sendEvent(sev);

        commitBalloons();

        app.view.addProblemsRationale(rationale);
    };

    events.doneSortingEquations = function() {
        console.log("Done sorting equations...");
        jQuery('.tag-balloon')
            .hide('fade', 'fast');

        var equations = _.uniq(app.balloons.pluck('equation'));
        var students = _.uniq(_.flatten(app.balloons.pluck('contributors')));

        var sev = new Sail.Event('videowall_equations_commit', {
            equation_ids: equations,
            students: students,
            videowall: app.location
        });

        app.groupchat.sendEvent(sev);

        commitBalloons();
    };

    events.doneSortingAssvars = function() {
        console.log("Done sorting assvars...");

        var sev = new Sail.Event('check_assumptions_variables_alert', {
            location: app.location
        });

        app.groupchat.sendEvent(sev);

        app.view.disableDoneSortingButton();
        jQuery('#done-sorting')
            .text("Waiting for teacher")

        app.balloons.on('change', function () {
            jQuery('#done-sorting')
                .text("DONE SORTING");

            app.view.toggleDoneSortingButton(events.doneSortingAssvars);
        });

    };

    events.teacherApprovedAssvars = function() {
        console.log("Done sorting assvars...");
        jQuery('.tag-balloon')
            .hide('fade', 'fast');

        var assumptions = _.without(_.uniq(app.balloons.pluck('assumption')), null);
        var variables = _.without(_.uniq(app.balloons.pluck('variable')), null);
        var students = _.uniq(_.flatten(app.balloons.pluck('contributors')));

        var sev = new Sail.Event('videowall_assumptions_variables_commit', {
            assumptions: assumptions,
            variables: variables,
            students: students,
            videowall: app.location
        });

        app.groupchat.sendEvent(sev);

        commitBalloons();

        app.view.disableDoneSortingButton();
    };

    /* LOCAL EVENTS */

    // triggered when Sail.app.init() is done
    events.initialized = function (ev) {
        app.authenticate();
    };

    events['ui.initialized'] = function (ev) {

    };

    // triggered when the user has authenticated but is not yet in the XMPP chat channel
    events.authenticated = function (ev) {
        console.log("Authenticated...");
        jQuery('#auth-indicator').addClass('widget-box');

        app.rollcall.fetchUser(app.session.account.login, {}, 
            function (data) {
                app.user = data;
                app.location = data.metadata.location;
                jQuery(app).trigger('location_set');
            },
            function () {
                var err = "Couldn't get user information for '"+app.session.account.username+"'!";
                console.error(err);
                alert(err);
                Rollcall.Authenticator.unauthenticate();
            }
        );
    };

    // triggered when the user has authenticated and connected to the XMPP chat channel
    events.connected = function (ev) {
        console.log("Connected...");
    };

    events.unauthenticated = function (ev) {
        console.log("Unauthenticated...");
        document.location.reload();
    };

    events.location_set = function (ev) {
        console.log("Location set...");
        app.loadVideo(app.location);
        app.identifyBoard(app.location);
        app.restoreState();
    };

    events.equations_loaded = function (ev) {
        console.log("Equations loaded.");
    };

    events.problems_loaded = function (ev) {
        console.log("Problems loaded.");
    };

    events.principles_loaded = function (ev) {
        console.log("Principles loaded.");
    };

    app.events = events;
})(NEOplace.SideBoard);