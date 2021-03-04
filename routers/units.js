/*
 *
 *
 *
 */

var units = {};
var _units = {};

var handlers = require('../lib/handlers');
var tempServices = require('../lib/tempTablesServices');

formatUnits = function(result, paramsObject) {

    const translate =   { 
                          name: 'nome',
                          code: 'codigo',
                          location: 'local',
                          country: 'pais',
                          description: 'descricao',
                          active: 'ativo'
                        }

    let units = [];
    let keys = Object.keys(translate);

    result.forEach( rowData => {
        let newExportLine = {};
        keys.forEach( columnName => {
            newExportLine[translate[columnName]] = rowData[columnName];
        })
        units.push(newExportLine);
    });
    return units;

}

routers = function(connection, data, callback) {

    var acceptableMethods = ['get'];

    const endpoints = {
        "get": {
            "units/:client": {
                endpoint: 'units/',
                regex: /^units\/\d+$/,
                paramMatches: /[\d]/,
                sqlQuery: "CALL unitsReadPage('*', :client, 99999)",
                error404: "Could not get users for export data",
                before200: formatUnits
            },
        },
    }
    handlers.handleMethods(acceptableMethods, data, endpoints, callback, _units);

}

batchPost = async function(clientId, language, data, connection) {

    let payloadObject = {
        client: clientId,
        name: null,
        code: null, 
        location: null,
        country: null,
        description: null,
        active: null
    }

    let createQuery  = 'CALL unitCreate(:client, :name, :code, :location, :country, :description, :active)'
    data.splice(0, 1);
    result = await tempServices.doInserts(data, payloadObject, createQuery);
    return result;
}

_units.get = handlers.get;
_units.post = handlers.post;

module.exports.routers = routers;