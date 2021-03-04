// createTemporaryRows will be call from  within each specific route when post is requested
insertRows = function(createQuery, data, payloadObject) {

    console.log('enterin create temporary rows');

    return new Promise(resolve => {

        let payloadKeys = Object.keys(payloadObject);
        payloadKeys.splice(0, 1);

        const rowLimit = data.length;
        const columnOffset = 2;

        var processed = 0;
        var errors = 0;
        var errorsRows = {};
        var payloadStack = [];

        if (data.length > 0) {
            data.forEach((rowData, rowIndex) => {

                // index starts on 1
                rowData.forEach((column, index) => {
                    payloadObject[payloadKeys[index + columnOffset]] = column;
                });

                payloadStack.push(Object.assign({}, payloadObject));
                connection.config.namedPlaceholders = true;
                connection.execute(createQuery, payloadObject, function (error, results, fields) {
                    if (error) {
                        console.log(error)
                        errors = errors + 1;
                        payloadStack[processed]['sqlErrorNo'] = error.errno;
                        payloadStack[processed]['sqlErrorMessage'] = error.sqlMessage;
                        errorsRows[rowIndex + 1] = JSON.stringify(payloadStack[processed]);
                    }
                    processed = processed + 1;
                    if (rowLimit == processed) {
                        resolve({ processed: processed, errors: errors, errorLog: errorsRows })
                    }
                });
            });
        } else {
            resolve({ processed: 0, errors: 1, errorLog: { 1: 'No rows to processed since posted data is empty' } })
        }


    });

}

module.exports.doInserts = insertRows;