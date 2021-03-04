var mysql = require('mysql2');
var Client = require('ssh2').Client;
var ssh = new Client();

var db = new Promise(function (resolve, reject) {
    ssh.on('ready', function () {

        ssh.forwardOut(
            // source address, this can usually be any valid address
            '31.220.52.229',
            // source port, this can be any valid port number
            22,
            // destination address (localhost here refers to the SSH server)
            '127.0.0.1',
            // destination port
            3306,
            function (err, stream) {
                // SSH error: can also send error in promise ex. reject(err)
                if (err) throw err; 

                // use `sql` connection as usual
                connection = mysql.createConnection({
                    host: '127.0.0.1',
                    user: 'appUser',
                    password: '@!MaGn34402020',
                    database: 'magnetto',
                    stream: stream
                });

                connection.config.queryFormat = function (query, values) {

                    if (!values) return query;

                    // return query.replace(/\:([\w\.]+)*/g, function (txt, key) {
                    return query.replace(/\:(\w+)/g, function (txt, key) {
                        if (values.hasOwnProperty(key)) {
                            return this.escape(values[key]);
                        }
                        return txt;
                    }.bind(this));
                };

                // send connection back in variable depending on success or not
                connection.connect(function (err) {
                    if (!err) {
                        resolve(connection);
                    } else {
                        reject(err);
                    }
                });
            });
    }).connect({
        host: '31.220.52.229',
        port: 22,
        username: 'root',
        password: 'LagoaDoBoi33',
        keepaliveInterval: 10000
    });
});

module.exports = db;