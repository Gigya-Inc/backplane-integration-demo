// All module-related functions inside closure and not accessible globally
(function($, undefined) {
  if(!gigya) {
    if(console && console.error) {
      console.error("Gigya socialize.js not on page -- cannot load Gigya / Backplane integration!");
    }
    return;
  }

  // Used to cache user state
  var USER;

  // Parse script JSON configuration
  var getScriptConfig = function() {
    var thisScript;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var script = scripts[i];
      var src = script.src.toLowerCase();
      if (src != '' && src.indexOf('backplane-gigya.js') > -1) {
        thisScript = script;
        break;
      }
    }

    if(thisScript) {
      var str = thisScript.innerHTML;
      if (str === "") {
        str = '""';
      }
      eval('var o');
      try {
        eval('o=' + str);
      } catch (e) {}
      if(typeof o != 'object') {
        o = {};
      }
      return o;
    } else {
      return {};
    }
  }

  // All settings can be overriden with JSON config
  var settings = $.extend(true, {
    initBackplane: true,
    serverBaseURL: undefined,
    busName: undefined,
    ajaxURL: undefined, // URL to backplane-gigya.js.php
    cookieName: "bp_channel_id" // Used to store channel ID
  }, getScriptConfig());

  // Bind to Gigya login/logout global events
  var onLogin = function(user) {
    USER = user;
    onUserStateChange();
  }
  var onLogout = function() {
    USER = undefined;
    onUserStateChange();
  }
  var onUserStateChange = function() {
    if(USER) {
      login();
    } else {
      logout();
    }
  }
  gigya.socialize.addEventHandlers({
    onLogin: onLogin,
    onLogout: onLogout
  });

  // With valid user signature, send Backplane authentication message
  var login = function() {
    if(!$.cookie(settings.cookieName)) { // Only if not already logged into Backplane
      var channelID = Backplane.getChannelID();
      if(!channelID) {
        if(console && console.error) {
          console.error("Backplane not initialized -- cannot authenticate!");
        }
        return;
      }

      $.ajax({
        url: settings.ajaxURL,
        data: {
          UID: USER.UID,
          UIDSignature: USER.UIDSignature,
          signatureTimestamp: USER.signatureTimestamp,
          channelID: channelID
        },
        type: "POST",
        dataType: "json",
        cache: false,
        complete: function(jqXHR, textStatus) {
          jqXHR.done(function(response) {
            if(response.success) {
              // Write channelID to cookie -- this means that the user is logged in
              $.cookie(settings.cookieName, channelID);
              refreshUI();
            } else {
              if(console && console.error) {
                console.error("Backplane login failed!");
              }
            }
          });
        }
      });
    } else {
      // Already logged in -- just refresh UI
      refreshUI();
    }
  }

  // Remove authentication cookie and refresh UI
  var logout = function() {
    if($.cookie(settings.cookieName)) {
      Backplane.resetCookieChannel();
      $.removeCookie(settings.cookieName);
      refreshUI();
    }
  }

  // Refresh UI and pass configuration
  var refreshUI = function() {
  }

  // Query user state and render initial UI
  gigya.socialize.getUserInfo({
    callback: function(response) {
      USER = response.errorCode === 0 && response.UID ? response : undefined;
      $(document).ready(onUserStateChange);
    }
  });

  // Initialize Backplane if necessary
  if(settings.initBackplane) {
    // Generic Backplane init
    // http://wiki.aboutecho.com/w/page/28068607/Single%20Sign%20On#Proprietaryloginonly
    Backplane.init({
      "serverBaseURL" : settings.serverBaseURL,
      "busName": settings.busName
    });
  }
}(jQuery));