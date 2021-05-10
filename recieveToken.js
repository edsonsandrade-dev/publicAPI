/*
 * 
 *  
 */

 // First and foremost check is configuration variables are available


const http         = require('http');
const https        = require('https');
const jwt          = require('jsonwebtoken');
const express      = require('express');
const cors         = require('cors');
const path         = require('path')
const csv          = require("csvtojson");

const tempServices = require(__dirname + '/lib/tempTablesServices');
const rateLimiter  = require(__dirname + '/lib/rateLimiterRedis');
const db           = require(__dirname + '/lib/db');


const app = express();



var corsOptions = {
  
  origin: function (origin, callback) {

      callback(null, true);

  }

}

// Add headers
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:7102');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin, X-Requested-With, content-type, id');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ID, Token");
  // Pass to next layer of middleware
  
  next();

});

app.options('*', cors(corsOptions));

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded




// TOKENS ------------------------------------------------------------------------------------ // 
app.post('/tokenCallback', (req, res) => {
    console.log(req.body);
    res.json({ token: 'recieved'})
});



app.listen(7103, () => {
  console.log('Express web server listening on port 7103');
});

