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
            description:   Joi.string().max(256),
            active:        Joi.string().allow('Y', 'N'),
            latitude:      Joi.string().max(20).optional(),
            longitude:     Joi.string().max(20).optional(),
            startDate:     Joi.date().allow(null, ''),
            endingDate:    Joi.date().allow(null, ''),
            locationGroup: Joi.string().allow(null),
            prevLanguage:  Joi.string().min(2).max(5).optional(),
            prevCode:      Joi.string().max(45).optional()
        }); 

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
    
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;
}

post =  async function(req, res, callback) {

  // Primary key used to update location: [ client, language, code ]
  const paramsObject  =  { client           : req.auth.client, 
                           language         : req.auth.userLanguage,
                           code             : req.body.code,
                           name             : req.body.name,
                           description      : req.body.description,
                           active           : req.body.active,
                           latitude         : req.body.latitude,
                           longitude        : req.body.longitude,
                           startDate        : req.body.startDate,
                           endingDate       : req.body.endingDate,
                           locationGroup    : req.body.locationGroup,
                         }; 

    const validData = validationSchema.validate(paramsObject);

    if (!validData) {
        res.writeHead(404);
        res.json({ code: 404, message: 'Provided create data is invalid or not properly structured' });
    } else {
        const putQuery = "CALL locationsAPICreate(:client, :language, :name, :code, :description, :active, :latitude, :longitude, :startDate, :endingDate, :locationGroup);";
        callback(putQuery, paramsObject);
    }
}

put =  async function(req, res, callback) {

    // Primary key used to update location: [ client, language, code ]
    const paramsObject  =  {    
                                client           : req.auth.client, 
                                language         : req.auth.userLanguage,
                                name             : req.body.name,
                                code             : req.body.code,
                                description      : req.body.description,
                                active           : req.body.active,
                                latitude         : req.body.latitude,
                                longitude        : req.body.longitude,
                                startDate        : req.body.startDate,
                                endingDate       : req.body.endingDate,
                                locationGroup    : req.body.locationGroup,
                                prevCode         : req.body.pervCode                  
                            }; 

    const validData = validationSchema.validate(paramsObject);

    if (!validData) {
        res.writeHead(404);
        res.json({ code: 404, message: 'Provided update data is invalid or not properly structured' });
    } else {
        const putQuery = "CALL locationsAPIUpdate(:client, :language, :name, :code, :description, :active, :latitude, :longitude, :startDate, :endingDate, :locationGroup, :prevCode);";
        callback(putQuery, paramsObject);
    }
}

del = async function(req, res, callback) {

    const validationSchema = Joi.object({
                client:        Joi.number().required(),
                language:      Joi.string().min(2).max(5),
                code:          Joi.string().max(45)
        }); 

    // Primary key used to update location: [ client, language, code ]
    const paramsObject = {  client      : req.auth.client, 
                            language    : req.auth.userLanguage,
                            code        : req.body.code };

    const validData = validationSchema.validate(paramsObject);

    if (!validData) {
        res.writeHead(400);
        res.json({ code: 400, message: 'Provided delete data is invalid or not properly structured' });
    } else {
        const deleteQuery = "CALL locationsAPIDelete(:client, :language, :code)";
        callback(deleteQuery, paramsObject);
    }

}

module.exports.batchLocationsPost = batchLocationsPost;
module.exports.post = post;
module.exports.put = put;
module.exports.delete = del;