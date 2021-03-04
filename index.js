/*
 * 
 *  
 */

 // First and foremost check is configuration variables are available

const configEnv = require('config');

if (!configEnv.get('jwtPrivateKey')) {
  console.error('FATAL ERROR: jwtPrivateKey is not defined');
  process.exit(1)
} 

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const db = require(__dirname + '/lib/db');
const config = require(__dirname + '/lib/config');
const fs = require('fs');

const handlers = require(__dirname + '/lib/handlers');
const helpers = require(__dirname + '/lib/helpers');

// Estabilish connection to mysql database via ssh tunnel
var sshConnection = db.then(connection => { 
  return connection; 

});

 // Instantiate the HTTP server
var httpServer = http.createServer(function(req,res){
  unifiedServer(req,res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, function(){
  console.log('The HTTP server is running on port '+ config.httpPort);
  console.log('current dir ', __dirname);
});

// HTTPS Server ------------------------------------------------------------- // 

// Instantiate the HTTPS server options
var httpsServerOptions = {
  'key': fs.readFileSync(__dirname + '/https/key.pem'),
  'cert': fs.readFileSync(__dirname + '/https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions,function(req,res){
  unifiedServer(req,res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort,function(){
 console.log('The HTTPS server is running on port '+config.httpsPort);
});

// ------------------------------------------------------------------------ //


// All the server logic for both the http and https server

var unifiedServer = function(req, res){
  
  // Get the payload,if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ID, Token");
  
  if (req.method === 'OPTIONS') {
    console.log('entering index.js and processing OPTIONS ... with origin equals to ', req.headers.origin);
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end();
    return;
  } else {

    // Proceed with other methods 
    req.on('data', function(data) {
      buffer += decoder.write(data);
    });
    
    req.on('end', function() {
      
      buffer += decoder.end();

      // Parse the url
      var parsedUrl = url.parse(decodeURI(req.url), true);

      const NaJSON = req.headers['content-type'] ? req.headers['content-type'].indexOf('multipart/form-data') != -1 : -1;

      // Construct the data object to send to the handle
      var data = {
        'trimmedPath' : decodeURI(parsedUrl.pathname).replace(/^\/+|\/+$/g, ''),
        'queryStringObject' : parsedUrl.query,
        'method'  : req.method.toLowerCase(),
        'headers' : req.headers,
        'payload' : ! NaJSON ? helpers.parseJsonToObject(buffer) : buffer
      };

      const regex = /[a-z\s\d$]+/ig;
      var trimmedPathParts = regex.exec(data.trimmedPath);
      
      // Try to authenticate id and token before handlig request
      handlers.authorize(data.headers, function(auth, error) {  

        if (auth || handlers.authException(data.trimmedPath)) {

          if (NaJSON) { // first attempt to upload file
            upload.single('file')
          }

          var chosenHandler = typeof(router[trimmedPathParts[0]]) == 'function' ? router[trimmedPathParts[0]] : null;
    
          if (chosenHandler) {
            // Route the request to the handler specified in the router
            chosenHandler(sshConnection, data, function(statusCode, payload) {
            
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
            // Not-Found router 
            res.writeHead(404);
            res.end('Error: router not found'); 
          }

        } else {

          console.error('returned unauthorized for ', parsedUrl)
          // Returning authentication error
          res.writeHead(error.code);
          res.end(error.status); 

        }

      // Check the router for a matching path for a handler. If one is not found, use the notFound handler instead.
     
      });
    
    });
  }
};

// Application's handlers
const units = require(__dirname + '/routers/units');
const lists = require(__dirname + '/routers/lists');
const locations = require(__dirname + '/routers/locations');
const resources = require(__dirname + '/routers/resources');
const services = require(__dirname + '/routers/services');
const tokens = require(__dirname + '/routers/tokens');

// Define the request router
var router = {
  'units': units.routers,
  'lists': lists.routers,
  'locations': locations.routers,
  'resources': resources.routers,
  'services': services.routers,
  'tokens': tokens.routers
};


// Using EXPRESS ---------------------------------------- //

const express = require('express');
const cors = require('cors');
const path = require('path')
const app = express();

const readXlsxFile = require('read-excel-file/node');

var whitelist = ['http://localhost:4200', 'postman']

var corsOptions = {
  
  origin: function (origin, callback) {

    if (whitelist.indexOf(origin) !== -1) { 
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }

}

// Add headers
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin, X-Requested-With, content-type, id, token');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ID, Token");
  // Pass to next layer of middleware
  
  next();

});

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    const baseName = path.parse(file.originalname).name;
    cb(null, baseName + '-' + req.headers.clientid + path.extname(file.originalname))
  }
})

var upload = multer({ storage: storage })

app.options('*', cors(corsOptions));

// TEMPLATES ---------------------------------------------------------------------------------- // 
app.post('/templates', (req, res) => { 
  handlers.authorize(req.headers, function (auth, error) {
    if (auth) {
      const entity = req.body.entity;
      const language = req.body.language;
      const filePath = './templates/' + language + '/';
      const fileName = entity + '-' + language + '.xlsx';
      res.download( filePath + fileName ); 

    } else {
      res.writeHead(error.code);
      res.end(error.status); // returns a stringifyed value   
    }
  });
});

// UPLOAD ------------------------------------------------------------------------------------ //
app.post('/upload', upload.single('file'), function (req, res, next) {

  /* Important  ----------------------------------------------------------------- /

    To solve  "Error: Multipart: Boundary not found" is importat to ommit
    header.set('content-type', 'multipart/form-data')

  / ---------------------------------------------------------------------------- */

  if (!req.file) {
    res.writeHead(400);
    var payloadString = JSON.stringify({ error: 'field data was not provided ' });
    res.end(payloadString); // returns a stringifyed value   
    return;
  } else {
    handlers.authorize(req.headers, function (auth, error) {
      if (auth) {
        
        const baseName = path.parse(req.file.originalname).name;
        const clientId = req.body.client;
        const language = req.body.language;
        const user     = req.body.user;
        const fileName = baseName + '-' + req.headers.clientid + path.extname(req.file.originalname);
        const entity = req.body.entity;

        let batchPostMethod;
  
        readXlsxFile('uploads/' + fileName, { getSheets: true }).then((sheets) => {
          // sheets name defines entity to be updated
          switch (entity) {
            case 'units': 
              batchPostMethod = units.batchPost
              break;
            case 'lists': 
              batchPostMethod = lists.batchItemsPost
              break;
            case 'locations': 
              batchPostMethod = locations.batchLocationsPost
              break;
            case 'resources': 
              batchPostMethod = resources.batchResourcesPost
              break;
            case 'services': 
              batchPostMethod = services.batchServicesPost
              break;
          }
  
          console.log('batchPostMethod', batchPostMethod, entity);

          let batchResult;
    
          readXlsxFile('uploads/' + fileName).then((rows) => {
            try {
              batchPostMethod(clientId, language, user, rows)
              .then( result => {
                res.writeHead(200);
                var payloadString = JSON.stringify(result);              
                res.end(payloadString); // returns a stringifyed value   
              })
            }
            catch(error) {
              res.writeHead(200);
              var payloadString = JSON.stringify({ processed: 0, error: null});
              res.end(payloadString); // returns a stringifyed value   
            }
          })
        })
      } else {
        res.writeHead(error.code);
        res.end(error.status); // returns a stingifyed value   
      }
    });
  }

})

app.listen(7102, () => {
  console.log('Express web server listening on port 7102');
});

// ----------------------------------------------------- //