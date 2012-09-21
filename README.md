# facebook-sdk SDK for Facebook integration
===================

## Install

TODO


## Basic Use

### Initialization

```javascript
var config = {
  ns:     '<Facebook App Namespace',
  id:     '<app id>',
  secret: '<app secret>',
  scope:  '<additional required permissions>',
};

var fbsdk = require('facebook_sdk').init(config);
```

### Use in Express

Add a single line in yoour Express config code.
```javascript
app.use(fbsdk.auth);
```
After that, the req object in request handler will have object 'facebook' that you can
use to make API calls, get login status and current user id, etc.

```javascript
app.all('/', function(req, res) {
  var facebook = req.facebook;
  if (facebook && facebook.signedRequest.user_id) {
    facebook.api('me', function(er, me) {
      // Now 'me' contains info (name, id, work, gender, etc.) for current user
      res.render('index', {config: config, me: me});
    });
  } else {
    res.redirect(fbsdk.loginURL(fbsdk.canvasURL));
  }
});
```

### Make Graph API calls with App Access Token
You can also make API calls with app access token at anytime easily.
```javascript
fbsdk.appApi(config.id + '?fields=id,name,canvas_url', function(e, result) {
  console.log("Got app info using app access token", result);
});

```
or

```javascript
fbsdk.appApi(config.id, 
  {
    fields: 'id,name,canvas_url',
  },  function(e, result) {
  console.log("Got app info using app access token", result);
});

```

