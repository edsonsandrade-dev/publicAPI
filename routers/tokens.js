/*
 *
 *
 *
 */

const jwt = require('jsonwebtoken');
const configEnv = require('config');

const apiServices = require('../lib/apiServices');

var tokens = {};
var _tokens = {};

var handlers = require('../lib/handlers');

routers = function(connection, data, callback){

    var acceptableMethods = ['post'];

    const endpoints = {
        "post": {
            "createToken": {
                endpoint: 'tokens',
                method: 'createToken',
                regex: /^tokens\/createToken$/
            },
        },
    }
    handlers.handleMethods(acceptableMethods, data, endpoints, callback, _tokens);
    handlers.handleMethods(acceptableMethods, data, endpoints, connection, callback, _services);

};

_tokens.createToken = function (endpoint, callback) {

    var currentDate = new Date();
    var expiresDate = new Date(currentDate);

    expiresDate.setDate(expiresDate.getDate() + 31);

    const token = jwt.sign({"clientId":     endpoint.payload.client,
                            "clientName":   endpoint.payload.clientName,
                            "email":        endpoint.payload.email,
                            "userId":       endpoint.payload.userId,
                            "userLanguage": endpoint.payload.userLanguage },  
                            configEnv.get('jwtPrivateKey'));

    const postQuery = "CALL tokensPost(:client, :user, :moment, :token);"; 
    
    let moment = new Date();

    let momentDateTime = moment.getFullYear() + '/' + moment.getMonth() + '/' + moment.getDate() + ' ' + moment.toLocaleTimeString('en-US');

    let payload = { client: endpoint.payload.client,
                    user:   endpoint.payload.userId,
                    moment: momentDateTime,
                    token:  token };

    connection.query(postQuery, payload, function (error, results, fields) {

    if (error) {
        // Database error occured
        apiServices.exposeError('POST', 'tokens/createTokens', postQuery, payload, error);
        callback(500, { 'Error': "An unexpected error occured while posting tokens/createTokens " });
    } else {
        // Check if a new id was returned 
        if (results[0] ? results[0][0] : false) {
            callback(200, results[0][0]);
        } else {
            callback(200, { token: token  });
        }
    }
});

}

_tokens.post = handlers.post;

module.exports.routers = routers;