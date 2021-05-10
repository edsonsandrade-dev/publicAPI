/*
 *
 *
 *
 */

const Joi = require('joi');

const validationSchema = Joi.object({
            client:     Joi.number(),
            project:    Joi.string().max(45).required(),
            item:       Joi.string().max(20).required(),
            wbsCode:    Joi.string().max(45).required(),
            activity:   Joi.string().max(512).required(),
            costCenter: Joi.string().max(45).optional(),
            active:     Joi.string().allow('Y', 'N'),
            startDate:  Joi.date().optional(),
            endingDate: Joi.date().optional(),
            wbsGroup:   Joi.string().max(45).optional(),
            prevItem:   Joi.string().max(20).optional()
        }); 

batchWBSPost = async function(client, language, user, data) {

    const batchId = Date.now();

    let payloadObject = {
        client      : client,
        language    : language,
        user        : user,
        project     : null,
        wbsItem     : null, 
        wbsCode     : null,
        activity    : null,
        costCenter  : null,
        active      : null,
        startDate   : null,
        endingDate  : null,
        wbsGroup    : null,
        batchId     : batchId
    }

    try {

        let createQuery = `INSERT INTO temporaryWBS (user, project, wbsItem, wbsCode, activity, costCenter, active, startDate, endingDate, wbsGroup, batchId) 
                           VALUES (:user, :project, :wbsItem, :wbsCode, :activity, :costCenter, :active, :startDate, :endingDate, :wbsGroup, :batchId)`;
        
        result = await tempServices.doInserts(createQuery, data, payloadObject);
        return result;
    }
    catch (error) {
        console.log(error);
        return({ processed: 0, errors: 1, errorLog: { 1: 'Some error before doInsert() method!' } })
    }
}


post = async function (req, res, callback) {

    // Primary key used to update resource: [project, item]
    const paramsObject = {
        client:     req.auth.client,
        project:    req.body.project,
        item:       req.body.item,
        wbsCode:    req.body.wbsCode,
        activity:   req.body.activity,
        costCenter: req.body.costCenter,
        active:     req.body.active,
        startDate:  req.body.startDate,
        endingDate: req.body.endingDate,
        wbsGroup:   req.body.wbsGroup
    };

    const validData = validationSchema.validate(paramsObject);

    if (validData.error != null) {
        res.json({
            code: 404,
            message: 'Provided create data is invalid or not properly structured',
            details: validData.error.details
        });
    } else {
        const putQuery = "CALL wbsAPICreate(:client, :project, :item, :wbsCode, :activity, :costCenter, :active, :startDate, :endingDate, :wbsGroup);";
        callback(putQuery, paramsObject);
    }
}

put = async function (req, res, callback) {

    // Primary key used to update resource: [ project, item  ]
    const paramsObject = {
        client:     req.auth.client,
        project:    req.body.project,
        item:       req.body.item,
        wbsCode:    req.body.wbsCode,
        activity:   req.body.activity,
        costCenter: req.body.costCenter,
        active:     req.body.active,
        startDate:  req.body.startDate,
        endingDate: req.body.endingDate,
        wbsGroup:   req.body.wbsGroup,
        prevItem:   req.body.prevItem
    };

    const validData = validationSchema.validate(paramsObject);

    if (validData.error != null) {
        res.json({ code: 404, 
                   message: 'Provided create data is invalid or not properly structured',
                   details: validData.error.details
                });
    } else {
        const putQuery = "CALL wbsAPIUpdate(:client, :project, :item, :wbsCode, :activity, :costCenter, :active, :startDate, :endingDate, :wbsGroup, :prevItem);";
        callback(putQuery, paramsObject);
    }
}

del = async function (req, res, callback) {

    const validationSchema = Joi.object({
        client:  Joi.number().required(),
        project: Joi.string().max(45).required(),
        wbsItem: Joi.string().max(20).required()
    });

    // Primary key used to update resources: [ project, item ]
    const paramsObject = {
        client:  req.auth.client,
        project: req.body.project,
        wbsItem: req.body.wbsItem
    };

    const validData = validationSchema.validate(paramsObject);

    if (validData.error != null) {
        res.json({
            code: 404,
            message: 'Provided delete data is invalid or not properly structured',
            details: validData.error.details
        });
    } else {
        const deleteQuery = "CALL wbsAPIDelete(:client, :project, :wbsItem)";
        callback(deleteQuery, paramsObject);
    }

}

module.exports.batchResourcesPost = batchResourcesPost;
module.exports.post = post;
module.exports.put = put;
module.exports.delete = del;