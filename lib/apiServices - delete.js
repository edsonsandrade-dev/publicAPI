/*

    Name:       apiServices.js
    Created:    Apr 26th, 2018
    Created By: Edson Andrade

    Provides services available to every router in UseWizlyApi.Js 

*/

exports.exposeError = function(method, endPoint, query, payload, errorObject) {
    console.log('');
    console.log('ERROR REPORT');
    console.log('--------------------------------------------------------------')
    console.log('Method:', method);
    console.log('--------------------------------------------------------------')
    console.log('Endpoint:', endPoint);
    console.log('--------------------------------------------------------------')
    console.log('Query:', query);
    console.log('--------------------------------------------------------------')
    console.log('Payload:', payload);
    console.log('--------------------------------------------------------------')
    console.log('');
    console.log(errorObject)
    console.log('');
    console.log('--- End of error --- ', endPoint , '--------------------------')
}
