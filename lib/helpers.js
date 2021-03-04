/*
 * Helpers for various tasks
 *
 */

// Dependencies
var config = require(__dirname + '/config');
var crypto = require('crypto');

// Container for all the helpers
var helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.JSONtoArray = function(JSONObject) {

  var params = [];

  for (var key in JSONObject) {
      if (JSONObject.hasOwnProperty(key)) {
          params.push(JSONObject[key])
      }
  }
  return params;
}

helpers.parseParamToObject = function(trimmedPath, endpoint, pathRegex, sqlQuery) {

  var paramsObject = {};
  
  if (endpoint) {
    let endpointParams = trimmedPath.replace(endpoint, '');
    var params = endpointParams.match(pathRegex) ?  endpointParams.match(pathRegex) : [];
  } else {
    // Usue slice(1) to pass just parameters used by database query. 
    // For exemple, a get containing users/254 will produce a single array containing just one element [ 254 ] 
    var params = trimmedPath.match(pathRegex) ?  trimmedPath.match(pathRegex).slice(1) : [];
  }
  

  if (params.length > 0) {
    
    // Use regex to create a list os sqlQuery param that starts with :
    const regex = /\:[a-z\d]*/ig;
    const queryParams = sqlQuery.match(regex);

    var nI = 0;
    
    // if provided sqlQuery contains parameters (:<param>[, :<param>])
    if (queryParams)  {
      // Iterate through queyParams to create pairs '<paramName>': '<paramValue>'
      // <paramName> is one of sqlQuery params and <paramValue> is one of the values extracted form trimmed path
      for (let param of queryParams) { 
        paramsObject[param.replace(/\:/ig, '')] = params[nI++]
      }
    } else {
      // Otherwise, create a paramsObject based on the sequence of provided params
      for (let param of params) { 
        paramsObject[`param${nI}`] = params[nI++]
      }       
    }
  }
  // returns object containing params for GET and DELETE methods 
  return paramsObject;
} 

// Export the module
module.exports = helpers;
