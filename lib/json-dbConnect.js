const mysql = require('mysql');

var mySqlConnection = mysql.createConnection({
  // properties ...
  host: 'localhost',
  user: 'root',
  password: 'rosenba1',
  database: 'usewizly'

})

mySqlConnection.config.queryFormat = function (query, values) {

  if (!values) return query;

  // return query.replace(/\:([\w\.]+)*/g, function (txt, key) {
  return query.replace(/\:(\w+)/g, function (txt, key) {
    if (values.hasOwnProperty(key)) {
      return this.escape(values[key]);
    }
    return txt;
  }.bind(this));
};

module.exports.connection = mySqlConnection;
