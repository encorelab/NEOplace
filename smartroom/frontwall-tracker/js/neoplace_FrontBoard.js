/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */
NEOplace = {};
NEOplace.FrontWall = (function() {
  var app = {};

  app.curnit = 'NEOplace';
  app.name = "NEOplace.FrontWall";

  // global variables....
  var players = {};

  var playerLocationOrigins = [[0,0],[210,60],[560,60], [210,410], [560,410]];
  var playerLocationsAllocations = {};
  var previousPlayerAllocation = {};
  var playerWalking = {};
  var activities = ['','square','triangle', 'circle', 'star', 'polygon', 'upsidedownTriangle'];
  var activityNames = ['', 'Principle Tagging', 'Principal Setting', 'Problem Setting', 'Equation Setting', 'Assumptions &amp; Variables Setting', 'Video Narrative'];
  var groupNames = ['', 'A', 'B', 'C', 'D'];
  var taskRewardsAnimationQueue = {};
  
  var numberOfLocations = 4;
  var maxNumberOfPlayersPerLocation = 5;
  var counter = 0;
  var taskAnimationStarted = false;
  var playerCount = 0;
  
  var taskTimeBoundariesInMinutes = [
                          [],
                          [1.0, 1.5, 2.0],
                          [8.0, 13.0, 15.0],
                          [10.0, 18.0, 20.0],
                          [11.0, 18.0, 20.0]
                          ];
  
  var statusCaptions = ['Welcome to NEOplace!',
                        'Lots of time left!',
                        'Time is running out!',
                        'Better finish up!',
                        'Time is up!'];
  
  var currentTask = null;
  var currentTaskTickTimer = 0;
  var tickInterval = 200;
  var timeExpired = false;
  
  var requiredConfig = {
        xmpp: { 
            domain: "string", 
            port: "number" 
        },
        rollcall: {
            url: "string"
        },
        mongo: {
            url: "string"
        }
    };

  app.init = function() {
        Sail.verifyConfig(app.config, requiredConfig);
        console.log("Configuration is valid.");

        app.run = app.run || JSON.parse(jQuery.cookie('run'));
        if (app.run) {
            app.groupchatRoom = app.run.name + '@conference.' + app.xmppDomain;
        }
       
        var userFilter = function (u) {  console.log(u.account.login); return u.account.login.match(/frontwall-tracker/); };

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'username-and-password', askForRun: true, curnit: app.curnit, userFilter: userFilter})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget', {indicatorContainer: 'body', clickNameToLogout: true})
            .thenRun(function () {
                Sail.autobindEvents(app);

                jQuery(app).trigger('initialized');
                return true;
            });

        app.rollcall = new Rollcall.Client(app.config.rollcall.url);
        
        
        // game init
        for (var i = 0; i <= numberOfLocations; i++) {
          playerLocationsAllocations[i] = 0;
          taskRewardsAnimationQueue[i] = false;
        }
        
        
    };
    
  app.authenticate = function () {
        app.token = app.rollcall.getCurrentToken();

        if (!app.run) {
            Rollcall.Authenticator.requestRun();
        } else if (!app.token) {
            Rollcall.Authenticator.requestLogin();
        } else {
            app.rollcall.fetchSessionForToken(app.token, function(data) {
                    app.session = data;
                    jQuery(app).trigger('authenticated');
                },
                function(error) {
                    console.warn("Token '"+app.token+"' is invalid. Will try to re-authenticate...");
                    Rollcall.Authenticator.unauthenticate();
                }
            );
        }
    };
  
  app.stopTask = function(){
    console.log('Stopping Task Timer for Current Task:' + currentTask);
    currentTaskTickTimer = 0;
    timeExpired = false;
    currentTask = 0;
    jQuery('#progress-bar').removeClass('stop-time').removeClass('caution-time').removeClass('good-time');
    jQuery('#progress-text').html(statusCaptions[0]);
  };
  
  app.setCurrentTask = function(taskID) {
    console.log('Starting Task:' + taskID);
    currentTaskTickTimer = 0;
    timeExpired = false;
    currentTask = taskID;
  };
  
  app.frontboardTrackerProcessor = function(){
    
    if (currentTask) {
      currentTaskTickTimer += tickInterval;
      app.taskStatusAnimationProcessor();
    }
    
    app.animateTaskCompletionAnimationProcessor();
    
    setTimeout(function(){app.frontboardTrackerProcessor();}, tickInterval);
  };
  
  
  
  app.taskStatusAnimationProcessor = function() {
    var ticksInSeconds = Math.floor(currentTaskTickTimer/1000);
    var medianTaskTimeBoundaryInSeconds = Math.ceil(taskTimeBoundariesInMinutes[currentTask][0] * 60);
    var upperTaskTimeBoundaryInSeconds = Math.ceil(taskTimeBoundariesInMinutes[currentTask][1] * 60);
    var maxTaskTimeBoundaryInSeconds = Math.ceil(taskTimeBoundariesInMinutes[currentTask][2] * 60);
    //alert(ticksInSeconds);
    
    if (ticksInSeconds >= medianTaskTimeBoundaryInSeconds && ticksInSeconds < upperTaskTimeBoundaryInSeconds) {
      jQuery('#progress-bar').removeClass('good-time').removeClass('stop-time').addClass('caution-time');
      jQuery('#progress-text').html(statusCaptions[2]);
    }
    else if (ticksInSeconds >= upperTaskTimeBoundaryInSeconds && ticksInSeconds < maxTaskTimeBoundaryInSeconds) {
      jQuery('#progress-bar').removeClass('good-time').removeClass('caution-time').addClass('stop-time');
      jQuery('#progress-text').html(statusCaptions[3]);
    }
    else if (ticksInSeconds >= maxTaskTimeBoundaryInSeconds) {
      jQuery('#progress-bar').removeClass('good-time').removeClass('caution-time').removeClass('stop-time');
      jQuery('#progress-text').html(statusCaptions[4]);
      app.showTaskGameOverScreen(statusCaptions[4]);
    }
    else {
      jQuery('#progress-bar').removeClass('stop-time').removeClass('caution-time').addClass('good-time');
      jQuery('#progress-text').html(statusCaptions[1]);
    }
  };
  
  // WELCOME SCREEN!!
  app.showWelcomeScreen = function(str) {
    jQuery("body").append('<div id="modal-background" style="display: none"></div>');
    var backgroundModal = jQuery("#modal-background");
     jQuery('#achievement-symbol').hide();
     jQuery('#achievement-description').html(statusCaptions[0]);
     
    jQuery(backgroundModal).fadeIn(800, "linear", function(){
        jQuery("#epic-task-completed-container").fadeIn(2500);
      });
  };
  
  app.hideWelcomeScreen = function() {
      var backgroundModal = jQuery("#modal-background");
      jQuery("#epic-task-completed-container").fadeOut(1500);
      jQuery(backgroundModal).fadeOut('fast');
  };
  
  app.hideGameOverScreen = function() {
      var backgroundModal = jQuery("#modal-background");
      jQuery("#epic-task-completed-container").fadeOut(1500);
      jQuery(backgroundModal).fadeOut('fast');
      jQuery('#achievement-description').html(statusCaptions[0]);
  };
  
  // GAME OVER!!!
  app.showTaskGameOverScreen = function(str) {
    if (timeExpired) return;
    timeExpired = true;
    var backgroundModal = jQuery("#modal-background");
    //jQuery('#achievement-symbol').hide();
     jQuery('#achievement-description').html(str);
     
    jQuery(backgroundModal).fadeIn(800, "linear", function(){
        jQuery("#epic-task-completed-container").fadeIn(1500).effect('pulsate', 'slow');
      });
  };
  
  app.animateTaskCompletionAnimationProcessor = function() {
    if (taskAnimationStarted) return;
    
  
    var groupID = null;
    var taskName = null;
    var taskID = null;
     
    
    // find the first group in the array and grab it
    for (gID in taskRewardsAnimationQueue) {
      if (taskRewardsAnimationQueue[gID] !== false) {
        groupID = gID;
        taskID = taskRewardsAnimationQueue[gID];
        break;
      }
    }
    // no animations in the queue so return...
    if (groupID === null) return;
    
    
    taskAnimationStarted = true;
    taskRewardsAnimationQueue[groupID] = false;
    
    var backgroundModal = jQuery("#modal-background");
    
    if (jQuery(backgroundModal).length == 0) {
      jQuery("body").append('<div id="modal-background" style="display: none"></div>');
      backgroundModal = jQuery("#modal-background");
    }
    jQuery('#achievement-symbol').attr('src', 'images/icon_' + activities[taskID] + '_large.png');
    jQuery('#achievement-symbol').show();
    jQuery('#achievement-description').html('Group ' + groupNames[groupID] + " Completed " + activityNames[taskID] + "!!");
    jQuery(backgroundModal).fadeIn(800, "linear", function() {
        jQuery("#epic-task-completed-container").fadeIn('fast');
        
        jQuery("#epic-task-completed-container").append('<img id="bullet-bill" src="images/bulletbill.png" />');
        jQuery('#bullet-bill').css({position: "relative", left: "1030px"});
        
        jQuery("#mario").css({top:"800px", left: "730px"}).show();
        jQuery('#bullet-bill').animate({left: "-=1024px"}, 2600, "easeOutQuad");
        jQuery("#mario").animate({top:"-=370px", left: "-=240px"},1200, "easeInQuad", function(){
          
          
          jQuery('#achievement-symbol').hide('explode',{pieces: 40}, 950);
          
          
          jQuery("#task-completed-container").effect('bounce', 500);}).animate({top:"+=370px", left: "-=240px"}, 700, "easeOutQuad", function() {
        
          jQuery(this).fadeOut('fast', "linear", function(){
              jQuery("#epic-task-completed-container").hide();
              jQuery('#bullet-bill').remove();
              jQuery('#achievement-symbol').show();
              jQuery(backgroundModal).fadeOut('fast', "linear", function() {
                  taskAnimationStarted = false;
                  app.rewardLocalUsersWithTaskTrophy(groupID, taskID);
              });
              })});
      });
  
  };
  
  app.rewardLocalUsersWithTaskTrophy = function(theLocale, taskID) {
    for (playerID in players) {
      
      if (players[playerID]["location"] == theLocale) { 
        app.addItem(playerID, taskID);
      }
    }
  };
  
  app.addItem = function(playerID, taskID) {
    
    if (app.getLength(players[playerID]["activityHistory"]) == 0) {
      players[playerID]["activityHistory"] = {};
      //alert('yo!');
    }
    
    
    players[playerID]["activityHistory"][taskID] = taskID;
    //alert( getLength(players[playerID]["activityHistory"]));
    var distanceLeft = app.getLength(players[playerID]["activityHistory"])*10;
    var trophyImgID = "trophy_" + playerID + '_step_' + taskID;
    
    jQuery('#' + playerID).find('.trophies').append('<img id="' + trophyImgID + '" alt="Step ' + taskID + ' Completed!" style="display:none; position:relative; left: ' + distanceLeft + 'px;" src="images/icon_' + activities[taskID] + '.png" />');
    jQuery('#' + playerID).find('.user-name').animate({top: '20px'});
    
    jQuery('#' + trophyImgID).fadeIn('slow');
   
  };
  
  
  app.getLength = function (o) {
    var length = 0;

    for (var i in o) {
      
        length++;
    }
    return length;
  };
  
  
  app.animateTaskCompletion = function(groupID, taskID) {
    taskRewardsAnimationQueue[groupID] = taskID;
  };
  
  app.redrawPlayersAtLocation = function(theLocale) {
    //alert(theLocale);
    playerLocationsAllocations[theLocale] = 0;
    //jQuery("#location-" + theLocale).find("ul.location-player li").remove();
    for (playerID in players) {
      
      if (players[playerID]["location"] == theLocale) { 
        if (playerLocationsAllocations[theLocale] < maxNumberOfPlayersPerLocation) {
            
            jQuery('#' + playerID).animate({top:  playerLocationOrigins[theLocale][1] + (  playerLocationsAllocations[theLocale] * 75)+ "px", left: playerLocationOrigins[theLocale][0] +"px"}, 500);
           playerLocationsAllocations[theLocale]++;
           
            //jQuery("#location-" + theLocale).find("ul.location-player").append('<li id="loc-' + playerID + '">' + players[playerID]["userName"] + '</li>').fadeIn('fast');
        }
      }
    }
  };
  
  app.localeHasPlayers = function(theLocale) {
    for (playerID in players) {
      
      if (players[playerID]["location"] == theLocale) {
        return true;
      }
    }
    
    return false;
  };
  
  
  app.movePlayer = function(playerID, newLocation) {
    if (newLocation == null || newLocation > numberOfLocations) {
      return;
    }
    
    if (newLocation == previousPlayerAllocation[playerID]) {
      return;
    }
    
    if ((playerLocationsAllocations[newLocation] + 1) > maxNumberOfPlayersPerLocation) {
      return;
    }
    
    playerWalking[playerID] = true;
    
    
    
    jQuery('#' + playerID).animate({top:  playerLocationOrigins[newLocation][1] + (  playerLocationsAllocations[newLocation] * 75)+ "px", left: playerLocationOrigins[newLocation][0] +"px"}, 1000, function(){

      });
   
    if (previousPlayerAllocation[playerID] >= 0) {
      players[playerID]["location"] = newLocation;
    }
    
    if (((playerLocationsAllocations[previousPlayerAllocation[playerID]]) - 1) >= 0) {
      playerLocationsAllocations[previousPlayerAllocation[playerID]]--;
      
      app.redrawPlayersAtLocation(previousPlayerAllocation[playerID]);
    }
    
    
    playerLocationsAllocations[newLocation]++;
    previousPlayerAllocation[playerID] = newLocation;
    playerWalking[playerID] = false;

  };
  
  app.addPlayer = function(playerNickname, theLocale) {
    if (! playerNickname) return false;
    
    var playerID = "player_" + playerNickname.replace(/[\s\W]/g,'_');
    
    if (jQuery('#' + playerID).length !== 0) {
      console.log(playerID + ' exists moving user!');
      app.movePlayer(playerID, theLocale);
      return true;
    }
    
    var randomColour = Math.floor(Math.random() * 5);
    var avatarColour = '';
    var playerInfo = {};
    
    playerInfo["userName"] = playerNickname;
    playerInfo["playerID"] = playerID;
    playerInfo["location"] = theLocale;
    playerInfo["activityHistory"] = {};
    
    players[playerID] = playerInfo;
    
    previousPlayerAllocation[playerID] = -1;
    
    if (randomColour == 0){
      avatarColour = 'blue';
    }
    else if (randomColour == 1) {
      avatarColour = 'green';
    }
    else if (randomColour == 2) {
       avatarColour = 'purple';
    }
    else if (randomColour == 3) {
       avatarColour = 'yellow';
    }
    else {
       avatarColour = 'orange';
    }
      
    jQuery("#locations").append('<div class="user" id="' + playerID +  '"><img alt="' + playerID + '" title="' + playerID + '" src="images/avatar_' + avatarColour + '.png"  width="40" /><div class="triangle-right left"><div class="trophies"></div><div class="user-name">' + playerNickname +'</div></div></div>');
    app.movePlayer(playerID, playerInfo["location"]);
    
    playerCount++;
    return true;
  };
  
  app.testSpawnPlayers = function() {
    var playerLength = 11;
    
    for (var i = 0; i <= numberOfLocations; i++) {
     
      playerLocationsAllocations[i] = 0;
      taskRewardsAnimationQueue[i] = false;
    }
  
    for (var i = 0; i < playerLength; i++) {
      var playerInfo = {};
      var playerID = "player_" + i;
       
      playerInfo["userName"] = "player " + i;
      playerInfo["playerID"] = playerID;
      
      var randomLocation = Math.floor(Math.random() * numberOfLocations) + 1;
     
      while ((playerLocationsAllocations[randomLocation] + 1) > maxNumberOfPlayersPerLocation ) {
        randomLocation = Math.floor(Math.random() * numberOfLocations) + 1;
      }
     
      playerInfo["location"] = randomLocation;
      
      playerInfo["activityHistory"] = {};
      
      players[playerID] = playerInfo;
      previousPlayerAllocation[playerID] = -1;
      
      var randomColour = Math.floor(Math.random() * 5);
      var avatarColour = '';
      
      if (randomColour == 0){
        avatarColour = 'blue';
      }
      else if (randomColour == 1) {
        avatarColour = 'green';
      }
      else if (randomColour == 2) {
         avatarColour = 'purple';
      }
      else if (randomColour == 3) {
         avatarColour = 'yellow';
      }
      else {
         avatarColour = 'orange';
      }
      
      jQuery("#locations").append('<div class="user" id="' + playerID +  '"><img alt="' + playerID + '" title="' + playerID + '" src="images/avatar_' + avatarColour + '.png"  width="40" /><div class="triangle-right left"><div class="trophies"></div><div class="user-name">' + playerID +'</div></div></div>');
      app.movePlayer(playerID, playerInfo["location"]);
    
    }
    
    
  };
  
  return app;
})();
  // global variables....
  /*
  var players = {};

  var playerLocationOrigins = [[0,0],[210,60],[560,60], [210,410], [560,410]];
  var playerLocationsAllocations = {};
  var previousPlayerAllocation = {};
  var playerWalking = {};
  var activities = ['','square','triangle', 'circle', 'star', 'polygon', 'upsidedownTriangle'];
  var activityNames = ['', 'A1', 'B2', 'C3', 'D4', 'E5', 'F6'];
  var groupNames = ['', 'A', 'B', 'C', 'D'];
  var taskRewardsAnimationQueue = {};
  
  var numberOfLocations = 4;
  var maxNumberOfPlayersPerLocation = 3;
  var counter = 0;
  var taskAnimationStarted = false;
  
  var taskTimeBoundariesInMinutes = [
                          [],
                          [0.1,0.2,0.3],
                          [1.5, 2.0, 2.0],
                          [8.0, 13.0, 15.0],
                          [10.0, 18.0, 20.0],
                          [11.0, 18.0, 20.0]
                          ];
  
  var statusCaptions = ['Welcome to NEOplace!',
                        'Lots of time left!',
                        'Time is running out!',
                        'Better finish up!',
                        'Time is up!'];
  
  var currentTask = null;
  var currentTaskTickTimer = 0;
  var tickInterval = 200;
  var timeExpired = false;
  
  /// GLOBAL FUNCTIONS //////
  function setCurrentTask(taskID) {
    currentTaskTickTimer = 0;
    timeExpired = false;
    currentTask = taskID;
  }
  
  function frontboardTrackerProcessor(){
    
    if (currentTask) {
      currentTaskTickTimer += tickInterval;
      taskStatusAnimationProcessor();
    }
    
    animateTaskCompletionAnimationProcessor();
    
    
    setTimeout("frontboardTrackerProcessor()", tickInterval);
  }
  
  
  
  function taskStatusAnimationProcessor() {
    var ticksInSeconds = Math.floor(currentTaskTickTimer/1000);
    var medianTaskTimeBoundaryInSeconds = Math.ceil(taskTimeBoundariesInMinutes[currentTask][0] * 60);
    var upperTaskTimeBoundaryInSeconds = Math.ceil(taskTimeBoundariesInMinutes[currentTask][1] * 60);
    var maxTaskTimeBoundaryInSeconds = Math.ceil(taskTimeBoundariesInMinutes[currentTask][2] * 60);
    //alert(ticksInSeconds);
    
    if (ticksInSeconds >= medianTaskTimeBoundaryInSeconds && ticksInSeconds < upperTaskTimeBoundaryInSeconds) {
      jQuery('#progress-bar').removeClass('good-time').removeClass('stop-time').addClass('caution-time');
      jQuery('#progress-text').html(statusCaptions[2]);
    }
    else if (ticksInSeconds >= upperTaskTimeBoundaryInSeconds && ticksInSeconds < maxTaskTimeBoundaryInSeconds) {
      jQuery('#progress-bar').removeClass('good-time').removeClass('caution-time').addClass('stop-time');
      jQuery('#progress-text').html(statusCaptions[3]);
    }
    else if (ticksInSeconds >= maxTaskTimeBoundaryInSeconds) {
      jQuery('#progress-bar').removeClass('good-time').removeClass('caution-time').removeClass('stop-time');
      jQuery('#progress-text').html(statusCaptions[4]);
      showTaskGameOverScreen(statusCaptions[4]);
    }
    else {
      jQuery('#progress-bar').removeClass('stop-time').removeClass('caution-time').addClass('good-time');
      jQuery('#progress-text').html(statusCaptions[1]);
    }
  }
  
  // GAME OVER!!!
  function showTaskGameOverScreen(str) {
    if (timeExpired) return;
    timeExpired = true;
    var backgroundModal = jQuery("#modal-background");
    //jQuery('#achievement-symbol').hide();
     jQuery('#achievement-description').html(str);
     
    jQuery(backgroundModal).fadeIn(800, "linear", function(){
        jQuery("#epic-task-completed-container").fadeIn(1500).effect('pulsate', 'slow');
      });
    setTimeout("animateTaskCompletion(2, 5);animateTaskCompletion(3, 3); animateTaskCompletion(1, 6);", 5000);
  }
  
  function animateTaskCompletionAnimationProcessor() {
    if (taskAnimationStarted) return;
    
  
    var groupID = null;
    var taskName = null;
    var taskID = null;
     
    
    // find the first group in the array and grab it
    for (gID in taskRewardsAnimationQueue) {
      if (taskRewardsAnimationQueue[gID] !== false) {
        groupID = gID;
        taskID = taskRewardsAnimationQueue[gID];
        break;
      }
    }
    // no animations in the queue so return...
    if (groupID === null) return;
    
    
    taskAnimationStarted = true;
    taskRewardsAnimationQueue[groupID] = false;
    
    var backgroundModal = jQuery("#modal-background");
    
    if (jQuery(backgroundModal).length == 0) {
      jQuery("body").append('<div id="modal-background" style="display: none"></div>');
      backgroundModal = jQuery("#modal-background");
    }
    jQuery('#achievement-symbol').attr('src', 'images/icon_' + activities[taskID] + '_large.png');
    jQuery('#achievement-symbol').show();
    jQuery('#achievement-description').html('Group ' + groupNames[groupID] + " Completed " + activityNames[taskID] + "!!");
    jQuery(backgroundModal).fadeIn(800, "linear", function() {
        jQuery("#epic-task-completed-container").fadeIn('fast');
        jQuery("#mario").css({top:"800px", left: "730px"}).show();
        jQuery("#mario").animate({top:"-=370px", left: "-=240px"},1200, "easeInQuad", function(){ jQuery('#achievement-symbol').hide('explode',{pieces: 40}, 950); jQuery("#task-completed-container").effect('bounce', 500);}).animate({top:"+=370px", left: "-=240px"}, 700, "easeOutQuad", function() {
          
          jQuery(this).fadeOut('fast', "linear", function(){
              jQuery("#epic-task-completed-container").hide();
              jQuery('#achievement-symbol').show();
              jQuery(backgroundModal).fadeOut('fast', "linear", function() {
                  taskAnimationStarted = false;
                  rewardLocalUsersWithTaskTrophy(groupID, taskID);
              });
              })});
      });
  
  }
  
  function rewardLocalUsersWithTaskTrophy(theLocale, taskID) {
    for (playerID in players) {
      
      if (players[playerID]["location"] == theLocale) { 
        addItem(playerID, taskID);
      }
    }
  }
  
   function addItem(playerID, taskID) {
    
    if (getLength(players[playerID]["activityHistory"]) == 0) {
      players[playerID]["activityHistory"] = {};
      //alert('yo!');
    }
    
    
    players[playerID]["activityHistory"][taskID] = taskID;
    //alert( getLength(players[playerID]["activityHistory"]));
    var distanceLeft = getLength(players[playerID]["activityHistory"])*10;
    var trophyImgID = "trophy_" + playerID;
    
    jQuery('#' + playerID).find('.trophies').append('<img id="' + trophyImgID + '" alt="Step ' + taskID + ' Completed!" style="display:none; position:relative; left: ' + distanceLeft + 'px;" src="images/icon_' + activities[taskID] + '.png" />');
    jQuery('#' + playerID).find('.user-name').animate({top: '20px'});
    
    jQuery('#' + trophyImgID).fadeIn('slow');
   
  }
  
  
  function getLength(o) {
    var length = 0;

    for (var i in o) {
      
        length++;
    }
    return length;
  }
  
  
  function animateTaskCompletion(groupID, taskID) {
    taskRewardsAnimationQueue[groupID] = taskID;
  }
  
  
jQuery(function() {
 // Handler for .ready() called.
  
  var redrawPlayersAtLocation = function(theLocale) {
    //alert(theLocale);
    playerLocationsAllocations[theLocale] = 0;
    //jQuery("#location-" + theLocale).find("ul.location-player li").remove();
    for (playerID in players) {
      
      if (players[playerID]["location"] == theLocale) { 
        if (playerLocationsAllocations[theLocale] < maxNumberOfPlayersPerLocation) {
            
            jQuery('#' + playerID).animate({top:  playerLocationOrigins[theLocale][1] + (  playerLocationsAllocations[theLocale] * 75)+ "px", left: playerLocationOrigins[theLocale][0] +"px"}, 500);
           playerLocationsAllocations[theLocale]++;
           
            //jQuery("#location-" + theLocale).find("ul.location-player").append('<li id="loc-' + playerID + '">' + players[playerID]["userName"] + '</li>').fadeIn('fast');
        }
      }
    }
  };
  
  
  var movePlayer = function(playerID, newLocation) {
    
    if (newLocation == previousPlayerAllocation[playerID]) return;
    if ((playerLocationsAllocations[newLocation] + 1) > maxNumberOfPlayersPerLocation) return;
    playerWalking[playerID] = true;
    
    
    
    jQuery('#' + playerID).animate({top:  playerLocationOrigins[newLocation][1] + (  playerLocationsAllocations[newLocation] * 75)+ "px", left: playerLocationOrigins[newLocation][0] +"px"}, 1000, function(){

      });
   
    if (previousPlayerAllocation[playerID] >= 0) {
      players[playerID]["location"] = newLocation;
    }
    
    if (((playerLocationsAllocations[previousPlayerAllocation[playerID]]) - 1) >= 0) {
      playerLocationsAllocations[previousPlayerAllocation[playerID]]--;
      
      redrawPlayersAtLocation(previousPlayerAllocation[playerID]);
    }
    
    
    playerLocationsAllocations[newLocation]++;
    previousPlayerAllocation[playerID] = newLocation;
    playerWalking[playerID] = false;

  };
  
  var spawnPlayers = function() {
    var playerLength = 11;
    
    for (var i = 0; i <= numberOfLocations; i++) {
     
      playerLocationsAllocations[i] = 0;
      taskRewardsAnimationQueue[i] = false;
    }
  
    for (var i = 0; i < playerLength; i++) {
      var playerInfo = {};
      var playerID = "player_" + i;
       
      playerInfo["userName"] = "player " + i;
      playerInfo["playerID"] = playerID;
      
      var randomLocation = Math.floor(Math.random() * numberOfLocations) + 1;
     
      while ((playerLocationsAllocations[randomLocation] + 1) > maxNumberOfPlayersPerLocation ) {
        randomLocation = Math.floor(Math.random() * numberOfLocations) + 1;
      }
     
      playerInfo["location"] = randomLocation;
      
      playerInfo["activityHistory"] = {};
      
      players[playerID] = playerInfo;
      previousPlayerAllocation[playerID] = -1;
      
      var randomColour = Math.floor(Math.random() * 5);
      var avatarColour = '';
      
      if (randomColour == 0){
        avatarColour = 'blue';
      }
      else if (randomColour == 1) {
        avatarColour = 'green';
      }
      else if (randomColour == 2) {
         avatarColour = 'purple';
      }
      else if (randomColour == 3) {
         avatarColour = 'yellow';
      }
      else {
         avatarColour = 'orange';
      }
      
      jQuery("#locations").append('<div class="user" id="' + playerID +  '"><img alt="' + playerID + '" title="' + playerID + '" src="images/avatar_' + avatarColour + '.png"  width="40" /><div class="triangle-right left"><div class="trophies"></div><div class="user-name">' + playerID +'</div></div></div>');
      movePlayer(playerID, playerInfo["location"]);
    
    }
    
    
  };
 
  spawnPlayers();
  setCurrentTask(1);
  setTimeout("frontboardTrackerProcessor()", tickInterval);
  
  animateTaskCompletion(1, 1);
 
  //animateTaskCompletion(3, 6);
  //animateTaskCompletion(2, 3);
  jQuery(".user").click(function(){  animateTaskCompletion(2, 1); movePlayer(jQuery(this).attr('id'), Math.floor(Math.random() * numberOfLocations) + 1); });
});*/