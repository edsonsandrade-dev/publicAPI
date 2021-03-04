/*
 *  Creat and export configuration variables 
 * 
 */


 // Container for all the enviroments 

var enviroments = {};

enviroments.staging = {
    'port': 3000,
    'envName': 'staging'
};

enviroments.production = {
    'port': 5000,
    'envName': 'production'
};

// Determine which enviroment wasd passed as a command-line argumento
var currentEnviroment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current enviroment is on of the enviroments above, if not, default is staging
var enviromentToExport = typeof(enviroments[currentEnviroment]) == 'object' ? enviroments[currentEnviroment] : enviroments.staging;

// export the module
module.exports = enviromentToExport;
