/*
 *
 *
 *
 */


batchUnitsPost = async function(client, language, user, data) {

    const batchId = Date.now();

    let payloadObject = {
        client: client,
        language: language,
        user: user,
        name: null,
        code: null, 
        location: null,
        country: null,
        description: null,
        active: null,
        batchId: batchId
    }

    try {

        let createQuery = `INSERT INTO temporaryUnits (client, user, name, code, location, country, description, active, batchId) 
                            VALUES (:client, :user, :name, :code, :location, :country, :description, :active, :batchId)`;
        
        result = await tempServices.doInserts(createQuery, data, payloadObject);
        return result;
        
    }
    catch (error) {
        console.log(error);
        return({ processed: 0, errors: 1, errorLog: { 1: 'Some error before doInsert() method!' } })
    }
}

module.exports.batchUnitsPost = batchUnitsPost;