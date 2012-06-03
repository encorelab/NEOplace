  // global variables....
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
});