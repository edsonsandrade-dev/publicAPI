/*
 *
 *
 *
 */

var services = {};
var _services = {};

var handlers = require('../lib/handlers');
var tempServices = require('../lib/tempTablesServices');

routers = function(connection, data, callback){

    var acceptableMethods = ['get'];

    const endpoints = {
        "get": {
            "services/:client/:userLanguage": {
                endpoint: 'services/',
                regex: /^services\/\d+\/[a-z]{2}\_[a-z]{2}$/,
                paramMatches: /\d+|[a-z]{2}(\_[a-z]{2})/gi,
                sqlQuery: "CALL servicesReadAllClientRows(:client, :userLanguage)",
                error404: "Could not load service page"
            },
        },
    }
    handlers.handleMethods(acceptableMethods, data, endpoints, callback, _services);

};

batchServicesPost = async function(client, language, user, data) {

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
        serviceGroup: null,
        batchId: batchId
    }

    let createQuery = `INSERT INTO temporaryServices (client, language, user, code, description, active, startDate, endingDate, serviceGroup, batchId) 
                        VALUES (:client, :language, :user, :code, :description, :active, :startDate, :endingDate, :serviceGroup, :batchId)`;
    
    data.splice(0, 1);
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;
}

_services.get = handlers.get;

module.exports.routers = routers;
module.exports.batchServicesPost = batchServicesPost;