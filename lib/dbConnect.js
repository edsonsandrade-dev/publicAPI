const mysql = require('mysql');

module.exports.connection = mysql.createConnection({
  // properties ...
  host: 'localhost',
  user: 'root',
  password: 'rosenba1',
  database: 'usewizly'

});
