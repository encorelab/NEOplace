  var players = {};
  
  //left top
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
  
  
  var getLength = function(o) {
    var length = 0;

    for (var i in o) {
      
        length++;
    }
    return length;
  }
  
  
  var animateTaskCompletion = function(groupID, taskName, taskID) {
    
    if (taskAnimationStarted) return;
    taskAnimationStarted = true;
    
    var backgroundModal = jQuery("#modal-background");
    if (jQuery(backgroundModal).length == 0) {
      jQuery("body").append('<div id="modal-background" style="display: none"></div>');
      backgroundModal = jQuery("#modal-background");
    }
      jQuery('#achievement-description').html('Group ' + groupID + " Completed " + taskName + "!!");
      jQuery(backgroundModal).fadeIn(800, "linear", function() {
          
          jQuery("#mario").animate({top:"-=386px", left: "-=240px"},800, "easeInQuad", function(){jQuery("#task-completed-container").effect('bounce', 400);}).animate({top:"+=386px", left: "-=240px"}, 800, "easeOutQuad", function() {
            
            jQuery(this).fadeOut('fast', "linear", function(){jQuery("#epic-task-completed-container").hide(); jQuery("#epic-task-completed-container img").show();  jQuery(backgroundModal).fadeOut('fast', "linear", function() { taskAnimationStarted = false; });})});
        });
      
    
    
  };
  
  var addItem = function(playerID, taskID) {
    
    animateTaskCompletion(groupNames[1], activityNames[taskID], taskID);
    if (getLength(players[playerID]["activityHistory"]) == 0) {
      players[playerID]["activityHistory"] = {};
      //alert('yo!');
    }
    
    
    players[playerID]["activityHistory"]["" + taskID] = taskID;
   //alert( getLength(players[playerID]["activityHistory"]));
    var distanceLeft = getLength(players[playerID]["activityHistory"])*10 + 22;
   
    
    jQuery('#' + playerID).find('.trophies').append('<img alt="Step ' + taskID + ' Completed!" style="position:relative; left: ' + distanceLeft + 'px;" src="images/icon_' + activities[taskID] + '.png" />');
    
   
  };

  
  var movePlayer = function(playerID, newLocation) {
    
    if (newLocation == previousPlayerAllocation[playerID]) return;
    if ((playerLocationsAllocations[newLocation] + 1) > maxNumberOfPlayersPerLocation) return;
    playerWalking[playerID] = true;
    
    
    
    jQuery('#' + playerID).animate({top:  playerLocationOrigins[newLocation][1] + (  playerLocationsAllocations[newLocation] * 75)+ "px", left: playerLocationOrigins[newLocation][0] +"px"}, 1000, function(){

     
      
      /*jQuery('#loc-' + playerID).remove();
      
      if (newLocation % 2 == 1) {
        jQuery('#' + playerID).find("div.triangle-right").removeClass('left').addClass('right');
      }
      else {
        jQuery('#' + playerID).find("div.triangle-right").removeClass('right').addClass('left');
      }
      
      jQuery("#location-" + newLocation).find("ul.location-player").append('<li id="loc-' + playerID + '">' + players[playerID]["userName"] + '</li>').fadeIn('fast');
      */
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
    var playerLength = 9;
    
    for (var i = 0; i <= numberOfLocations; i++) {
     
      playerLocationsAllocations[i] = 0;
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
      
      var timeout = Math.floor(Math.random() * 4);
      var cls = '';
      if (timeout == 0){
        cls = 'blue';
      }
      else if (timeout == 1) {
        cls = 'green';
      }
      else if (timeout == 2) {
         cls = 'purple';
        
      }
      else if (timeout == 3) {
         cls = 'yellow';
      }
      else {
         cls = 'orange';
      }
      
      jQuery("#locations").append('<div class="user" id="' + playerID +  '"><img alt="' + playerID + '" title="' + playerID + '" src="images/avatar_' + cls + '.png"  width="40" /><div class="triangle-right left ' + cls + '"><div class="trophies"></div><div class="user-name">' + playerID +'</div></div></div>');
      movePlayer(playerID, playerInfo["location"]);
      
       addItem(playerID, 3);
       addItem(playerID, 2);
       addItem(playerID, 6);
       addItem(playerID, 4);
       addItem(playerID, 5);
       addItem(playerID, 1);
    
    }
    
    
    
    
  };
  
  spawnPlayers();
 
  jQuery(".user").click(function(){ movePlayer(jQuery(this).attr('id'), Math.floor(Math.random() * numberOfLocations) + 1); });
});