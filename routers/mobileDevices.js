/*
 *
 *
 *
 */

batchMobileDevicesPost = async function(client, language, user, data) {

    const batchId = Date.now();

    let payloadObject = {
        client:     client,
        language:   language,
        user:       user,
        mobileUser: null,
        project:    null,
        code:       null,
        type:       null,
        active:     null,
        imei:       null,
        batchId:    batchId
    }

    let createQuery = `INSERT INTO temporaryMobileDevices (client, user, mobileUser, project, code, type, imei, active, batchId) 
                       VALUES (:client, :user, :mobileUser, :project, :code, :type, :imei, :active, :batchId)`;
    
    result = await tempServices.doInserts(createQuery, data, payloadObject);
    return result;

}

module.exports.batchMobileDevicesPost = batchMobileDevicesPost;