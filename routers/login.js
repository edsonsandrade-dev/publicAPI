/*
 *
 *
 *
 */


login = async function(req, res) {

    let paramsObject = { email: req.body.email,
                         password: req.body.password }

    console.log(paramsObject    )

    const sqlQuery = "CALL userLogin(:email, :password);";

    connection.query(sqlQuery, paramsObject, function (error, results, fields) {

        if (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ message: "An unexpected error occured when authenticating user." }))
        } else if (results[0].length === 0) {
            res.writeHead(404);
            res.end(JSON.stringify({ message: "Could not authenticate using presented credentials." }))
        } else {
            res.json(results[0]);
        }

    });

}

module.exports.login = login;