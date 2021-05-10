/*
 *
 *
 *
 */

const Joi = require('joi');


const validationSchema = Joi.object({
            client:        Joi.number().required(),
            language:      Joi.string().min(2).max(5),
            code:          Joi.string().max(45),
            description:   Joi.string().max(512),
            active:        Joi.string().allow('Y', 'N'),
            startDate:     Joi.date().allow(null, ''),
            endingDate:    Joi.date().allow(null, ''),
            serviceGroup:  Joi.string().allow(null),
            prevCode:      Joi.string().max(45).optional()
    });            


batchServicesPost = async function(client, language, user, data) {

    const batchId = Date.now();
    
    let payloadObject = {
        client:         client,
        language:       language,
        user:           user,
        code:           null,
        description:    null,
        active:         null,
        startDate:      null, 
        endingDate:     null,
        serviceGroup:   null,
        batchId:        batchId
    }

    let createQuery = `INSERT INTO temporaryServices (client, language, user, code, description, active, startDate, endingDate, serviceGroup, batchId) 
                        VALUES (:client, :language, :user, :code, :description, :active, :startDate, :endingDate, :serviceGroup, :batchId)`;
    
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;
}

post =  async function(req, res, callback) {

  // Primary key used to update service: [ client, language, code ]
  const paramsObject  =  { client       : req.auth.client, 
                           language     : req.auth.userLanguage,
                           code         : req.body.code,
                           description  : req.body.description,
                           serviceGroup : req.body.serviceGroup,
                           active       : req.body.active,
                           startDate    : req.body.startDate,
                           endingDate   : req.body.endingDate,
                         }; 

    const validData = validationSchema.validate(paramsObject);

    if (!validData) {
        res.writeHead(404);
        res.json({ code: 404, message: 'Provided create data is invalid or not properly structured' });
    } else {
        const putQuery = "CALL servicesAPICreate(:client, :language, :code, :description, :serviceGroup, :active, :startDate, :endingDate)";
        callback(putQuery, paramsObject);
    }
}

put =  async function(req, res, callback) {

    // Primary key used to update service: [ client, language, code ]
    const paramsObject  =  { client          : req.auth.client, 
                            language         : req.auth.userLanguage,
                            code             : req.body.code,
                            description      : req.body.description,
                            serviceGroup     : req.body.serviceGroup,
                            active           : req.body.active,
                            startDate        : req.body.startDate,
                            endingDate       : req.body.endingDate,
                            prevLanguage     : req.body.prevLanguage,
                            prevCode         : req.body.prevCode
                            }; 

    const validData = validationSchema.validate(paramsObject);

    if (!validData) {
        res.writeHead(400);
        res.json({ code: 404, message: 'Provided update data is invalid or not properly structured' });
    } else {
        const putQuery = "CALL servicesAPIUpdate(:client, :language, :code, :description, :serviceGroup, :active, :startDate, :endingDate, :prevCode)";
        callback(putQuery, paramsObject);
    }
}

del = async function(req, res, callback) {

    const validationSchema = Joi.object({
                client:        Joi.number().required(),
                language:      Joi.string().min(2).max(5),
                code:          Joi.string().max(45)
        }); 

    // Primary key used to update service: [ client, language, code ]
    const paramsObject = {  client      : req.auth.client, 
                            language    : req.auth.userLanguage,
                            code        : req.body.code };

    const validData = validationSchema.validate(paramsObject);

    if (!validData) {
        res.writeHead(400);
        res.json({ code: 400, message: 'Provided delete data is invalid or not properly structured' });
    } else {
        const deleteQuery = "CALL servicesAPIDelete(:client, :language, :code)";
        callback(deleteQuery, paramsObject);
    }
}

module.exports.batchServicesPost = batchServicesPost;
module.exports.post = post;
module.exports.put = put;
module.exports.delete = del;