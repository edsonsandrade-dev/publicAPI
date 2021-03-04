/*
 *
 *
 *
 */

var resources = {};
var _resources = {};

var handlers = require('../lib/handlers');
var tempServices = require('../lib/tempTablesServices');

routers = function(connection, data, callback){

    var acceptableMethods = ['get'];

    const endpoints = {
        "get": {
            "resources/:client/:userLanguage": {
                endpoint: 'resources/',
                regex: /^resources\/\d+\/[a-z]{2}\_[a-z]{2}$/,
                paramMatches: /\d+|[a-z]{2}(\_[a-z]{2})/gi,
                sqlQuery: "CALL resourcesReadAllClientRows(:client, :userLanguage)",
                error404: "Could not load resource page"
            },
        },
    }
    handlers.handleMethods(acceptableMethods, data, endpoints, callback, _resources);

};

batchServicesPost = async function(client, language, user, data) {

    const batchId = Date.now();

    let payloadObject = {
        client: client,
        language: language,
        user: user,
        name: null,
        resourceCode: null,
        resourceType: null,
        measureUnit: null,
        active: null,
        startDate: null, 
        endingDate: null,
        resourceGroup: null,
        batchId: batchId
    }

    let createQuery = `INSERT INTO temporaryResources (client, language, user, name, resourceCode, resourceType, measureUnit, active, startDate, endingDate, resourceGroup, batchId) 
                        VALUES (:client, :language, :user, :name, :resourceCode, :resourceType, :measureUnit, :active, :startDate, :endingDate, :resourceGroup, :batchId)`;
    
    data.splice(0, 1);
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;
}

_resources.get = handlers.get;

module.exports.routers = routers;
module.exports.batchServicesPost = batchServicesPost;