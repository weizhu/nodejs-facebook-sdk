var url = require('url')
var querystring = require('querystring')
var signedRequest = require('signed-request')
var express = require('express')
var request = require('request')
var signedRequestMaxAge = 86400;


exports.init = function(config) {
  if (!config || !config.id || !config.secret || !config.ns) {
    throw new Error("invalid Facebook config");
  }

  function copy(target, from) {
    for (var key in from) {
      if (from.hasOwnProperty(key)) target[key] = from[key]
    }
    return target
  }

  function  getUserAccessTokenFunc(sr) {
    return function(cb) {
      if (!sr) return process.nextTick(cb.bind(null, new Error('no signed request')))
      if (sr.oauth_token)
        return process.nextTick(cb.bind(null, null, sr.oauth_token))
      if (!sr.code)
        return process.nextTick(cb.bind(null, new Error('no token or code')))
      request.get(
        {
          url: 'https://graph.facebook.com/oauth/access_token?client_id=' + config.id +
            '&client_secret=' + config.secret +
            '&code=' + sr.code +
            'redirect_uri=', // the cookie uses a empty redirect_uri
          encoding: 'utf8'
        },
        function getAccessTokenCb(er, res, body) {
          if (er) return cb(er)
          var r = querystring.parse(body)
          if (r && r.access_token) return cb(null, r.access_token)
          cb(new Error('unexpected access_token exchange: ' + body))
        }
      )
    };
  };

  var appAccessToken = null;
  function getAppAccessToken(cb) {
    if (appAccessToken) {
      return cb(nul, appAccessToken);
    }
    request.get(
      {
        url: 'https://graph.facebook.com/oauth/access_token?client_id='+ config.id +
          '&client_secret=' + config.secret +'&grant_type=client_credentials',
        encoding: 'utf8'
      },
      function getAccessTokenCb(er, res, body) {
        if (er) return cb(er)
        var r = querystring.parse(body)
        if (r && r.access_token) {
          appAccessToken = r.access_token;
          console.log("access token", appAccessToken);
          return cb(null, r.access_token);
        }
        cb(new Error('unexpected access_token exchange: ' + body))
      }
    )
  }

  function getApiFunc(getAccessToken) {
    return function(path) {
      var args = {};
      // Allow for passing in arguments in arbitrary order
      Array.prototype.slice.call(arguments, 1).forEach(function(argument) {
        args[typeof argument] = argument;
      });
      var method = (args.string || 'get').toLowerCase();
      var params = args.object || {};
      var cb = args['function'];
      getAccessToken(function(err, access_token) {
        params.access_token = access_token;
        var parsed = url.parse('https://graph.facebook.com/' + path, true);
        delete parsed.search;
        copy(parsed.query, params);
        request.get(
          {
            url: url.format(parsed),
            encoding: 'utf8',
            json: true
          },
          function graphMeRequestCb(er, res, body) {
            if (er) return cb(er)
            cb(null, body)
          }
        );
      });
    };
  };

  function getFacebook(signedRequest) {
    return copy({
      signedRequest: signedRequest,
      api: getApiFunc(getUserAccessTokenFunc(signedRequest)),
    }, facebook);
  }

  var facebook = {
    // Parses the signed_request sent on Canvas requests or from the cookie.
    // https://developers.facebook.com/docs/authentication/signed_request/
    auth: function(req, res, next) {
      var raw = req.param('signed_request')
      if (!raw) raw = req.cookies['fbsr_' + config.id]
      if (!raw) return next()
      try {
        req.facebook = getFacebook(signedRequest.parse(
          raw,
          config.secret,
          signedRequestMaxAge
        ));
        return next();
      } catch(e) {
        return res.send(400, String(e));
      }
    },

    // Make API calls with App Access Token
    appApi: getApiFunc(getAppAccessToken),

    // The URL to our Canvas Application.
    // https://developers.facebook.com/docs/guides/canvas/
    canvasURL: url.format({
      protocol: 'https',
      host: 'apps.facebook.com',
      pathname: config.ns + '/'
    }),

    // Makes a URL to the Facebook Login dialog.
    // https://developers.facebook.com/docs/authentication/canvas/
    loginURL: function(redirectURI) {
      return url.format({
        protocol: 'https',
        host: 'www.facebook.com',
        pathname: 'dialog/oauth',
        query: {
          client_id: config.id,
          redirect_uri: redirectURI,
          scope: config.scope,
          response_type: 'none'
        }
      });
    },
  };

  return facebook;
};