const jwt = require('jsonwebtoken');
const configEnv = require('config');
const http = require('http');

var _tokens = {};

_tokens.createToken = function (req, res) {

    const token = jwt.sign({"client"        : req.body.client,
                            "clientName"    : req.body.clientName,
                            "email"         : req.body.email,
                            "user"          : req.body.userId,
                            "userLanguage"  : req.body.userLanguage },  
                            configEnv.get('jwtPrivateKey'), 
                            { expiresIn: '15m' });

    const postQuery = "CALL tokensPost(:client, :user, :moment, :token);"; 
    
    let moment = new Date(); 
    let momentDateTime = moment.getFullYear() + '/' + moment.getMonth() + '/' + moment.getDate() + ' ' + moment.toLocaleTimeString('en-US');

    let payload = { client: req.body.client,
                    user:   req.body.userId,
                    moment: momentDateTime,
                    token:  token };

    // tokensPost(:client, :user, :moment, :token) will verify existence of user and return token only if user is valid
    // it will also return data necessary to call callback endpoint and send token to client api
    connection.query(postQuery, payload, function (error, results, fields) {
        if (error) {
            errorObject = { error: "An unexpected error occured while posting tokens/createTokens ",
                            code: error.code,
                            sqlErrno: error.errno,
                            sqlState: error.sqlState,
                            sqlMessage: error.sqlMessage };

            res.status(500).json(errorObject);
        } else {

            const posted   = results[0][0].posted;
            const token    = results[0][0].token;
                
            if (posted === 1) {
                res.json({ token: token });
            } else {
                res.status(400).json({ status: 'fail to create token' });
            }

        }
    });

} 

_tokens.createToken = function (req, res) {

    const token = jwt.sign({"client"        : req.body.client,
                            "clientName"    : req.body.clientName,
                            "email"         : req.body.email,
                            "user"          : req.body.userId,
                            "userLanguage"  : req.body.userLanguage },  
                            configEnv.get('jwtPrivateKey'), 
                            { expiresIn: '15m' });

    const postQuery = "CALL tokensPost(:client, :user, :moment, :token);"; 
    
    let moment = new Date(); 
    let momentDateTime = moment.getFullYear() + '/' + moment.getMonth() + '/' + moment.getDate() + ' ' + moment.toLocaleTimeString('en-US');

    let payload = { client: req.body.client,
                    user:   req.body.userId,
                    moment: momentDateTime,
                    token:  token };

    // tokensPost(:client, :user, :moment, :token) will verify existence of user and return token only if user is valid
    // it will also return data necessary to call callback endpoint and send token to client api
    connection.query(postQuery, payload, function (error, results, fields) {
        if (error) {
            errorObject = { error: "An unexpected error occured while posting tokens/createTokens ",
                            code: error.code,
                            sqlErrno: error.errno,
                            sqlState: error.sqlState,
                            sqlMessage: error.sqlMessage };

            res.status(500).json(errorObject);
        } else {

            const posted   = results[0][0].posted;
            const token    = results[0][0].token;
            const hostname = results[0][0].hostname;
            const port     = results[0][0].port;
            const path     = results[0][0].path;
                
            if (posted === 1) {
                sendTokenBackToClient(token, hostname, port, path, (success) => {
                    if (success)
                        res.json({ status: 'token was created successfuly and sent back to ' + hostname + ':' + port + path });
                    else 
                        res.json({ status: 'token was created successfuly but could not reach ' + hostname + ':' + port + path });
                });
            } else {
                res.json({ status: 'fail to create token' });
            }

        }
    });

}   

function sendTokenBackToClient(token, hostname, port, path, callback) {

    const postData = JSON.stringify({ 'token': token });

    const options = {
        hostname: hostname,
        port: port,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    };

    console.log(options);

    const req = http.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log('response data',  chunk)
            callback(true);
        });
    });

    req.on('error', (e) => {
        callback( false);
    });

    // write data to request body
    req.write(postData);
    req.end();

}

module.exports = _tokens;