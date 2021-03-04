/*
 *
 *
 *
 */

var locations = {};
var _locations = {};

var handlers = require('../lib/handlers');
var tempServices = require('../lib/tempTablesServices');

routers = function(connection, data, callback){

    var acceptableMethods = ['get'];

    const endpoints = {
        "get": {
            "locations/:client/:userLanguage": {
                endpoint: 'locations/',
                regex: /^locations\/\d+\/[a-z]{2}\_[a-z]{2}$/,
                paramMatches: /\d+|[a-z]{2}(\_[a-z]{2})/gi,
                sqlQuery: "CALL locationsReadAllClientRows(:client, :userLanguage)",
                error404: "Could not load location page"
            },
        },
    }
    handlers.handleMethods(acceptableMethods, data, endpoints, callback, _locations);

};

batchLocationsPost = async function(client, language, user, data) {

    const batchId = Date.now();

    let payloadObject = {
        client: client,
        language: language,
        user: user,
        name: null,
        code: null,
        description: null,
        active: null,
        latitude: null, 
        longitude: null, 
        startDate: null, 
        endingDate: null,
        locationGroup: null,
        batchId: batchId
    }

    let createQuery = `INSERT INTO temporaryLocations (client, language, user, name, code, description, active, latitude, longitude, startDate, endingDate, locationGroup, batchId) 
                       VALUES (:client, :language, :user, :name, :code, :description, :active, :latitude, :longitude, :startDate, :endingDate, :locationGroup, :batchId)`;
    
    data.splice(0, 1);
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;
}

_locations.get = handlers.get;

module.exports.routers = routers;
module.exports.batchLocationsPost = batchLocationsPost;