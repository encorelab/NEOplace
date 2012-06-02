var sail = require('./js/sail.js/sail.node.server.js');

var msg = "Starting NEOplace TABLET server...";
var div = Array(msg.length+1).join("*");
console.log("\n"+div+"\n"+msg+"\n"+div);
sail.server.start(8005);