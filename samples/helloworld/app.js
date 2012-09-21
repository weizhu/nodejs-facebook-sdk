var express = require('express');
var connect = require('connect');

var config = {
  ns: '<Facebook App Namespace',
  id:  '<app id>',
  secret:  '<app secret>',
  scope:      '<additional required permissions>',
};

var fbsdk = require('../../lib/facebook').init(config);

var app =  module.exports = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.static(__dirname + '/static'));
  app.use(fbsdk.auth);
});

app.all('/', function(req, res) {
  var facebook = req.facebook;
  console.log("faceobook", facebook);
  if (facebook && facebook.signedRequest && facebook.signedRequest.user_id) {
    facebook.api('me', function(er, me) {
      res.render('index', {config: config, me: me});
    });
  } else {
    res.redirect(fbsdk.loginURL(fbsdk.canvasURL));
  }
});

//Demo making API calls using App Access Token
fbsdk.appApi(config.id + '?fields=id,name,canvas_url', function(e, result) {
  console.log("Got app info using app access token", result);
});



app.listen(3000);