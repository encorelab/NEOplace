/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall, NEOplace */

NEOplace.SideBoard = (function() {
    var app = {};

    var requiredConfig = {
        xmpp: { 
            domain: "string", 
            port: "number" 
        },
        rollcall: {
            url: "string"
        },
        assets: {
            url: "string"
        }
    };

    var verifyConfig = function(config, required, path) {
        var curPath = path || "";

        _.keys(required, function (req) {
            if (typeof required[req] == 'object') {
                verifyConfig(required[req], required[req], curPath + "." + req);
            } else {
                var err;
                if (!config[req]) {
                    err = "Missing configuration value for key '"+req+"'! Check your config.json";
                } else if (typeof config[req] !== required[req]) {
                    err = "Configuration value for '"+req+"' must be a "+(typeof required[req])+" but is a "+(typeof config[req])+"! Check your config.json";
                }

                if (err) {
                    console.error(err);
                    throw err;
                }
            }
        });
    };

    app.init = function() {
        verifyConfig(Sail.app.config, requiredConfig);
    };

    
    return app;
})();
