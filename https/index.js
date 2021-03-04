
/*
 * 
 *  
 */

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var fs = require('fs');
var handlers = require('./lib/handlers');
var helpers     = require('./lib/helpers');

// Application's handlers
var auth0             = require('./routers/auth0');

// Application Core Entities


 // Instantiate the HTTP server
var httpServer = http.createServer(function(req,res){
  unifiedServer(req,res);
});

// Start the HTTP server
httpServer.listen(config.httpPort,function(){
  console.log('The HTTP server is running on port '+config.httpPort);
});

// Instantiate the HTTPS server
var httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions,function(req,res){
  unifiedServer(req,res);
});


// Start the HTTPS server
httpsServer.listen(config.httpsPort,function(){
 console.log('The HTTPS server is running on port '+config.httpsPort);
});

// All the server logic for both the http and https server

var unifiedServer = function(req,res){

  // Get the payload,if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  res.setHeader('Content-Type', 'application/json');
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ID, Token");
  // res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

  // The OPTIONS request is called on a pre-flight request, which is part of Cross-origin resource sharing (CORS). 
  // Browsers use it to check if the real request, which will follow in case of success, is allowed from the particular domain.
  
  
  if (req.method == "OPTIONS") {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end();
  } else {

    // Proceed with other methods 

    req.on('data', function(data) {
      buffer += decoder.write(data);
    });
    
    req.on('end', function() {
      
      buffer += decoder.end();
      
      // Parse the url
      var parsedUrl = url.parse(decodeURI(req.url), true);
      // var queryStringObject = parsedUrl.query;
      // var trimmedPath = decodeURI(parsedUrl.pathname).replace(/^\/+|\/+$/g, '');

      // Construct the data object to send to the handler
      var data = {
        'trimmedPath' : decodeURI(parsedUrl.pathname).replace(/^\/+|\/+$/g, ''),
        'queryStringObject' : parsedUrl.query,
        'method' : req.method.toLowerCase(),
        'headers' : req.headers,
        'payload' : helpers.parseJsonToObject(buffer)
      };

      const regex = /[a-z\s\d$]+/ig;
      var trimmedPathParts = regex.exec(data.trimmedPath);    
      
      // Try to authenticate id and token before handlig request
      handlers.authorize(data.headers, function(authorized, error) {

        if (authorized || handlers.authException(data.trimmedPath)) {

          var chosenHandler = typeof(router[trimmedPathParts[0]]) == 'function' ? router[trimmedPathParts[0]] : handlers.notFound;
      
          // Route the request to the handler specified in the router
          chosenHandler(data, function(statusCode, payload) {
          
            // Use the status code returned from the handler, or set the default status code to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            
            // Use the payload returned from the handler, or set the default payload to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert the payload to a string
            var payloadString = JSON.stringify(payload);
            
            res.writeHead(statusCode);
    
            res.end(payloadString); // returns a stingifyed value   
          });
          
        } else {

          // Returning 401 as a representation of Unauthorize requesr
          res.writeHead(401);
          res.end(JSON.stringify(error));   
        }

      // Check the router for a matching path for a handler. If one is not found, use the notFound handler instead.
     
      });
    
    });
  }
};

// Define the request router
var router = {
  'auth0'           : auth0.auth0,
  'ping'            : handlers.ping,
  'config'          : config.config
};