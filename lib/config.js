/*
 * Create and export configuration variables
 *
 */

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort' : 7100,
  'httpsPort' : 7101,
  'envName' : 'staging',
  'hashingSecret' : 'thisIsASecret'
};

// Production environment
environments.production = {
  'httpPort' : 9100,
  'httpsPort' : 9101,
  'envName' : 'production',
  'hashingSecret' : 'thisIsAlsoASecret'
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;