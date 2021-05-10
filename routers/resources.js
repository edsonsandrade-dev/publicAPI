/*
 *
 *
 *
 */

const Joi = require('joi');

const validationSchema = Joi.object({
            client:        Joi.number().required(),
            language:      Joi.string().min(2).max(5),
            resourceCode:  Joi.string().max(45).required(),
            name:          Joi.string().max(45).required(),
            resourceType:  Joi.string().max(45).required(),
            measureUnit:   Joi.string().max(45).required(),
            active:        Joi.string().allow('Y', 'N'),
            startDate:     Joi.date().allow(null, ''),
            endingDate:    Joi.date().allow(null, ''),
            resourceGroup: Joi.string().allow(null),
            prevCode:      Joi.string().max(45).optional()
        }); 

batchResourcesPost = async function(client, language, user, data) {

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
    
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;
}


post = async function (req, res, callback) {

    // Primary key used to update resource: [ client, language, code ]
    const paramsObject = {
        client:         req.auth.client,
        language:       req.auth.userLanguage,
        name:           req.body.name,
        resourceCode:   req.body.resourceCode,
        resourceType:   req.body.resourceType,
        measureUnit:    req.body.measureUnit,
        active:         req.body.active,
        startDate:      req.body.startDate,
        endingDate:     req.body.endingDate,
        resourceGroup:  req.body.resourceGroup
    };

    const validData = validationSchema.validate(paramsObject);

    if (validData.error != null) {
        res.json({
            code: 404,
            message: 'Provided create data is invalid or not properly structured',
            details: validData.error.details
        });
    } else {
        const putQuery = "CALL resourcesAPICreate(:client, :language, :name, :resourceCode, :resourceType, :measureUnit, :active, :startDate, :endingDate, :resourceGroup);";
        callback(putQuery, paramsObject);
    }
}

put = async function (req, res, callback) {

    // Primary key used to update resource: [ client, language, code ]
    const paramsObject = {
        client:         req.auth.client,
        language:       req.auth.userLanguage,
        name:           req.body.name,
        resourceCode:   req.body.resourceCode,
        resourceType:   req.body.resourceType,
        measureUnit:    req.body.measureUnit,
        active:         req.body.active,
        startDate:      req.body.startDate,
        endingDate:     req.body.endingDate,
        resourceGroup:  req.body.resourceGroup,
        prevCode:       req.body.prevCode
    };

    const validData = validationSchema.validate(paramsObject);

    if (validData.error != null) {
        res.json({ code: 404, 
                   message: 'Provided create data is invalid or not properly structured',
                   details: validData.error.details
                });
    } else {
        const putQuery = "CALL resourcesAPIUpdate(:client, :language, :name, :resourceCode, :resourceType, :measureUnit, :active, :startDate, :endingDate, :resourceGroup, :prevCode);";
        callback(putQuery, paramsObject);
    }
}

del = async function (req, res, callback) {

    const validationSchema = Joi.object({
        client: Joi.number().required(),
        language: Joi.string().min(2).max(5),
        resourceCode: Joi.string().max(45)
    });

    // Primary key used to update resources: [ client, language, code ]
    const paramsObject = {
        client: req.auth.client,
        language: req.auth.userLanguage,
        resourceCode: req.body.resourceCode
    };

    const validData = validationSchema.validate(paramsObject);

    if (validData.error != null) {
        res.json({
            code: 404,
            message: 'Provided delete data is invalid or not properly structured',
            details: validData.error.details
        });
    } else {
        const deleteQuery = "CALL resourcesAPIDelete(:client, :language, :resourceCode)";
        callback(deleteQuery, paramsObject);
    }

}

module.exports.batchResourcesPost = batchResourcesPost;
module.exports.post = post;
module.exports.put = put;
module.exports.delete = del;