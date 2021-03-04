/*
 *
 *
 *
 */

var lists = {};
var _lists = {};

var handlers = require('../lib/handlers');

routers = function(connection, data, callback){

    var acceptableMethods = ['get'];

    const endpoints = {
        "get": {
            "lists/:client": {
                endpoint: 'lists/',
                regex: /^lists\/\d+$/,
                paramMatches: /[\d]/,
                sqlQuery: "CALL listsReadPage('*', :client, 99999)",
                error404: "Could not get users for export data",
                before200: formatUnits
            },
        },
    }
    handlers.handleMethods(acceptableMethods, data, endpoints, callback, _lists);

};

batchItemsPost = async function(client, language, user, data) {

    const batchId = Date.now();
    
    let payloadObject = {
        client: client,
        language: language,
        user: user,
        code: null,
        description: null,
        active: null,
        startDate: null, 
        endingDate: null,
        listGroup: null,
        batchId: batchId
    }

    let createQuery = `INSERT INTO temporaryLists (client, language, user, code, description, active, startDate, endingDate, listGroup, batchId) 
                       VALUES (:client, :language, :user, :code, :description, :active, :startDate, :endingDate, :listGroup, :batchId)`;
    
    data.splice(0, 1);
    result = await createTemporaryItems(createQuery, data, payloadObject);
    return result;
}

function createTemporaryItems(createQuery, data, payloadObject) {
    
    return new Promise(resolve => {

        let payloadKeys = Object.keys(payloadObject);
        payloadKeys.splice(0, 1);

        const rowLimit = data.length;
        const columnOffset = 2;
        
        var processed = 0;
        var errors = 0;
        var errorsRows = {};
        var payloadStack = [];

        console.log('creating temporary list items', data)

        if (data.length > 0) {
            data.forEach( (rowData, rowIndex) => {

                // index starts on 1
                rowData.forEach((column, index) => {
                    payloadObject[payloadKeys[index + columnOffset]] = column;
                });

                console.log(payloadObject);

                payloadStack.push(Object.assign({}, payloadObject));
                connection.config.namedPlaceholders = true;
                connection.execute(createQuery, payloadObject, function (error, results, fields) { 
                    if (error) {
                        console.log(error)
                        errors = errors + 1;
                        payloadStack[processed]['sqlErrorNo'] = error.errno;
                        payloadStack[processed]['sqlErrorMessage'] = error.sqlMessage;
                        errorsRows[rowIndex+1] = JSON.stringify(payloadStack[processed]);
                    }
                    processed = processed + 1;
                    if (rowLimit == processed) {
                        resolve({ processed: processed, errors: errors, errorLog: errorsRows} )
                    }
                });
            });
        } else {
            resolve({ processed: 0, errors: 1, errorLog:  {1: 'No rows to processed since posted data is empty'} } )
        }
    });
}

_lists.get = handlers.get;
_lists.post = handlers.post;

module.exports.routers = routers;
module.exports.batchItemsPost = batchItemsPost;