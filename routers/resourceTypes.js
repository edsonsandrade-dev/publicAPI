/*
 *
 *
 *
 */

batchResourceTypesPost = async function(client, language, user, data) {

    const batchId = Date.now();

    let payloadObject = {
        client: client,
        language: language,
        user: user,
        name: null,
        description: null,
        measureUnit: null,
        resourceTypeGroup: null,
        batchId: batchId
    }

    let createQuery = `INSERT INTO temporaryResourceTypes (client, language, user, name, description, measureUnit, resourceTypeGroup, batchId) 
                        VALUES (:client, :language, :user, :name, :description, :measureUnit, :resourceTypeGroup, :batchId)`;
    
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;

}

module.exports.batchResourceTypesPost = batchResourceTypesPost;