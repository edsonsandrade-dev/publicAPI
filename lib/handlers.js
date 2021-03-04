/*
 * Request Handlers
 *
 */

// Dependencies

const Joi = require('joi');
const jwt = require('jsonwebtoken');
const configEnv = require('config');

const helpers = require(__dirname + '/helpers');
const apiServices = require(__dirname + '/apiServices');

// Define all the handlers
handlers = {};

// Handle methods and specifc endpoint requestes by application
handlers.handleMethods = function(acceptableMethods, data, endpoints, callback, methods) {

  // Check is requested method is allowed by endpoint
  if (acceptableMethods.indexOf(data.method) > -1) {

    var endpointObject;
    // if a method, such as GET, dosen't have a direct endpoint, this block below loops through and 
    // object that contains sub-enpoint and tries to find the one apropriated to handle a request.
    // Exemple of such a endpoint: users/32, users/auth0/auth0|5a4c332eca00bd289d0b27e5

    if (endpoints[data.method]) {
      if(typeof(endpoints[data.method]["endpoint"]) === "undefined") {

          // Grab endpoints variations for a specific method (for exemple: get/:id, get/:name etc.)
          const subEndpoints = endpoints[data.method];

          console.log(subEndpoints)


          // loops through endpoint JSON object to match regex against GET params 
          for (var endpoint in subEndpoints) {
              // If trimmedPath is valid for specific regex
              if (subEndpoints[endpoint].regex.test(data.trimmedPath)) {
                  endpointObject = subEndpoints[endpoint];
                  break;
              }
          }
        } else {
          // if an endpoint whose key is one of the acceptable methods (get, post, put etc.) 
          // has a DIRECT endpoint will be processed using direct properties. 
          endpointObject = endpoints[data.method];

      }
    }

    if (typeof endpointObject == 'object') {

      endpointObject.payload = data.payload;

      // if method is GET or DELETE
      if ('get,delete'.indexOf(data.method) > -1) {
        // if a specific regex was defined to sepatate path values, it is used instead of the generic /[a-z\s\d$]+/gi
        const pathRegex = endpointObject.paramMatches ? endpointObject.paramMatches : /[a-z\s\d$]+/gi;

        // If a sqlQuery string was provided, creates an object containing stored procedure parameters that will be called by GET and DELETE
        if (endpointObject.sqlQuery) {
            endpointObject.paramsObject = helpers.parseParamToObject(data.trimmedPath, endpointObject.endpoint, pathRegex, endpointObject.sqlQuery)
        } else {
          // Othewise, uses trimmedPath instead 
            endpointObject.paramsObject = helpers.parseParamToObject(data.trimmedPath, endpointObject.endpoint, pathRegex, '')
        }
      } else {

        // * * * Important: Ohter methods than GET and DELETE will use endpointObject.payload when calling stored proedures
        // Uses a specific schema validation if exists. Otherwise use endpoint general validation schema  
        endpointObject.validationSchema = endpointObject.schema ? endpointObject.schema : data.validationSchema;
      }

      // finally, calls a acceptable method to handle a request. If a specific endpoint defines its own method 
      
      let handler = methods[endpointObject.method != undefined ? endpointObject.method : data.method];


      if (typeof handler === 'function') {
        handler(endpointObject, callback);
        if (endpointObject.sqlQuery) {
          console.log(endpointObject.sqlQuery);
        } else if (endpointObject.putQuery) {
          console.log(endpointObject.putQuery);
        } else if (endpointObject.patchQuery) {
          console.log(endpointObject.patchQuery);
        } else {
          // console.log(endpointObject);
        }

      } else {
        console.error("error 500: Could not process request with provided endpoint [ " + data.trimmedPath + " ]")
        callback(500, {'Error' : "Could not process request with provided endpoint [ " + data.trimmedPath + " ]"});
      }
      
    } else {
      // No endpoint was found for data.trimmedPath.regex.test() didn't produce a match
      console.error("error 500: Could not process request with provided endpoint [ " + data.trimmedPath + " ]")
      callback(500, {'Error' : "Could not process request with provided endpoint [ " + data.trimmedPath + " ]"});
    }    

  } else {
    callback(405, {"error": "Method [" + data.method + "] is not acceptable "});
  }

};

handlers.authorize = function(header, callback) {

  let token = header.token;

  if (header.token == undefined) {
    callback(false, { 'code': 404, 'status': 'Header doesn\'t have required authentication data'});
  } else {
    try {

      console.log(token)
      
      const decoded = jwt.verify(token, configEnv.get('jwtPrivateKey'));

      if (new Date(decoded.expiresAt) < new Date()) {
        callback(null, { 'code': 401, 'status': 'Token has expired' });
      } else {
        callback(decoded, null);
      }
    } catch(except) {
      console.error('Some error occured during authorize', except);
      callback(null, { 'code': 403, 'status': 'Some error occured during authorize', except});
    }
  }

}

handlers.authException = function(path) {
  const exceptions = ['users/login'];
  return exceptions.find((exception) => { return path.indexOf(exception) != -1}) != undefined;
}

// Generic GET method processor
handlers.get = function(endpoint, callback) {

  // Query database using provided sql query and parameters 
    connection.query(endpoint.sqlQuery, endpoint.paramsObject, function(error, results, fields) {

      if (error) {
            // Database error occurred 
            callback(500,{'Error' : "An unexpected error occured while getting " + endpoint.sqlQuery});
            apiServices.exposeError('GET', endpoint.endpoint, endpoint.sqlQuery, endpoint.payload, error);
        } else {
            // No record returned by database
            if (results[0].length === 0) {
                if (endpoint.ignore404 === undefined || endpoint.ignore404 === false) {
                  callback(404, {'Error' : endpoint.error404 });
                  apiServices.exposeError('GET', endpoint.endpoint, endpoint.getQuery, endpoint.payload, error);
                } else {
                  // Check for request to prepare data before returning via 200
                  if (typeof endpoint.before200 === 'function') { results[0] = endpoint.before200(results[0], endpoint.paramsObject) }
                  // Use callback to return records found in database
                  callback(200, results[0]);
                }
            } else {
               // Check for request to prepare data before returning via 200
              if (typeof endpoint.before200 === 'function') { 
                results[0] = endpoint.before200(results[0], endpoint.paramsObject); 
              } 
              // Use callback to return records found in database 
              callback(200,results[0]);
            }
        }

    });
};

/*
    A call to mysql procdure using mysqljs returns a result with the following structure:
    [ 
        [ 
            RowDataPacket {
                property: value,
                property: 'value',... }
            RowDataPacket {
                property: value,
                property: 'value',... }
        ],
    
        OkPacket {
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        serverStatus: 0,
        warningCount: 0,
        message: '',
        protocol41: true,
        changedRows: 0 } 
    ]                

    An array in which the fisrt element is another array containing a RowDataPacket object
    that represent a row returnd form the called procedures.

    And the seocnd element which contains details of returnd data set.

*/

// Generic POST method processor
handlers.post = function(endpoint, callback) {

  // Validate recieved payload against Joi validation schema 
  const result = Joi.validate(endpoint.payload, endpoint.validationSchema);

  if (result.error) {
      callback(403, {"error": `Failed during validation of ${result.error.details[0].context.key}. ${result.error.details[0].message}`})
  } else {

    // Query database using provided sql query and parameters  
    connection.query(endpoint.postQuery, endpoint.payload,  function(error, results, fields) {


    if (error) {
        // Database error occured
        apiServices.exposeError('POST', endpoint.endpoint, endpoint.postQuery, endpoint.payload, error);
        callback(500,{'Error' : "An unexpected error occured while posting " + endpoint.postQuery});
    } else {
      // Check if a new id was returned 
      if (results[0] ? results[0][0] : false) {
          if (endpoint.getQuery) {
            // Provided id is used to query databse for inserted data
            connection.query(endpoint.getQuery, results[0][0],  function(error, results, fields) {
              if (error) {
                  // Database error occurred
                  apiServices.exposeError('POST', endpoint.endpoint, endpoint.getQuery, endpoint.payload,  error);
                  callback(500,{'Error' : "An unexpected error occured while getting " + endpoint.endpoint + " after post"});
              } else {
                if (results[0].length === 0) {
                    // No record returned by database
                    callback(404,{'Error' : "No resource found with id provided for endpoint " + endpoint.endpoint + " after post"});
                  } else {
                    let returnedResult = results[0][0];
                     // Check for request to prepare data before returning via 200
                  if (typeof endpoint.before200 === 'function') { returnedResult = endpoint.before200(returnedResult, endpoint.paramsObject) }
                    // Use callback to return record found in database 
                    callback(200, returnedResult);
                  }
              }
            });
          } else {
            let returnedResult = results[0][0];
             // Check for request to prepare data before returning via 200
            if (typeof endpoint.before200 === 'function') { returnedResult = endpoint.before200(returnedResult, endpoint.paramsObject) }
            // Use callback to return record id returnd after post 
            callback(200, returnedResult);
          }
        } else {
            callback(404, "No primary key returned after successfull post with enpoint " + endpoint.endpoint)
            return;
        }
      }
    });
  }
};

// Generic PUT method processor
handlers.put = function(endpoint, callback) {
    
  // Validate recieved payload against Joi validation schema 
  
  const result = Joi.validate(endpoint.payload, endpoint.validationSchema);

  if (result.error) {
      callback(403, {"error": `Failed during validation of ${result.error.details[0].context.key}. ${result.error.details[0].message}`})
  } else {
    // Query database using provided sql query and parameters 
    // dbConnect.connection.query(endpoint.putQuery, endpoint.params, function(error, results, fields) {
    connection.query(endpoint.putQuery, endpoint.payload, function(error, results, fields) {
  
        if (error) {
          // Database error occured

          console.log('ERROR OCCURED')
          callback(500, {"error": "An unexpected error occured while putting " + endpoint.endpoint});
          apiServices.exposeError('PUT', endpoint.endpoint, endpoint.putQuery, endpoint.payload, error);
        } else if (results.affectedRows == 0) {
            callback(404, {"error": "No resource found for endpoint " + endpoint.endpoint + " during put"}); 
          } else {
          if (endpoint.getQuery) { 
            // Query database for recently updated resource
            connection.query(endpoint.getQuery, endpoint.payload, function(error, results) {
              if (error) {
                // Database error occurred
                apiServices.exposeError('PUT', endpoint.endpoint,  connection.format(endpoint.putQuery), endpoint.payload , error);
                callback(500, {"error": "An unexpected error occured while getting " + endpoint.endpoint + " after put"});
              } else {
                if (results[0].length === 0) {
                    // No record returned by database
                    callback(404, {"error": "No resource found for endpoint " + endpoint.endpoint + " after put"}); 
                  } else {
                    let returnedResult = results[0];
                    // Check for request to prepare data before returning via 200
                  if (typeof endpoint.before200 === 'function') { returnedResult = endpoint.before200(returnedResult, endpoint.paramsObject) }
                    // Use callback to return record found in database
                    callback(200, returnedResult);
                  }
              }
            });             
          } else {
            // Check for request to prepare data before returning via 200
            if (typeof endpoint.before200 === 'function') { results[0][0] = endpoint.before200(results[0], endpoint.paramsObject) }
            // Use callback to return data returned by put
            callback(200, results[0][0]);
          }
        }
    });
  }

};

// Generic PATCH method processor
handlers.patch = function(endpoint, callback) {

  // Validate recieved payload against Joi validation schema 
  const result = Joi.validate(endpoint.payload, endpoint.validationSchema);

  if (result.error) {
    apiServices.exposeError('POST', endpoint.endpoint, endpoint.postQuery, error);
    callback(403, {"error": `Failed during validation of ${result.error.details[0].context.key}. ${result.error.details[0].message}`})
  } else {

    // Query database using provided sql query and parameters 
    connection.query(endpoint.patchQuery, endpoint.payload, function (error, results, fields) {
      if (error) {
        // Database error occured
        apiServices.exposeError('PATCH', endpoint.endpoint, endpoint.patchQuery, endpoint.payload, error);
        callback(500, { "error": "An unexpected error occured while patching via " + endpoint.endpoint });
      } else {
        if (results.affectedRows === 0) {
          // No record returned by database
          callback(404, { "error": "Could not patch resource via " + endpoint.endpoint });
        } else {
          let returnedResult = results[0];
          // Check for request to prepare data before returning via 200
          if (typeof endpoint.before200 === 'function') { returnedResult = endpoint.before200(returnedResult, endpoint.paramsObject) }
          // Use callback to return record found in database
          callback(200, returnedResult);
        }
      }
    });
  }
};

// Generic DELETE method processor
handlers.delete = function(endpoint, callback) {
  // Query database using provided sql query and parameters 
  // Uses payload if provided. Otherwise uses params passed along with method in endpoint
  const queryParams = Object.keys(endpoint.payload).length > 0 ? endpoint.payload : endpoint.paramsObject

  connection.query(endpoint.sqlQuery, queryParams, function(error, results, fields) {
    if (error) {
      // Database error occured
      apiServices.exposeError('DELETE', endpoint.endpoint, endpoint.sqlQuery, endpoint.payload, error);
      callback(500, {"error": "An unexpected error occured while deleting via " + endpoint.endpoint});
    } else {
        if (results.affectedRows === 0) {
          // No record returned by database
          callback(404, {"error": "No resource(s) were deleted via " + endpoint.endpoint});
        } else {
          let returnedResult = results[0];
          // Check for request to prepare data before returning via 200
          if (typeof endpoint.before200 === 'function') { returnedResult = endpoint.before200(returnedResult, endpoint.paramsObject) }
          // Use callback to return record found in database
          callback(200, returnedResult);
        }
    }
  });
};

// Export the handlers
module.exports = handlers;


