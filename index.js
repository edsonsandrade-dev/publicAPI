/*
 * 
 *  
 */

 // First and foremost check is configuration variables are available

const configEnv = require('config');

if (!configEnv.get('jwtPrivateKey')) {
  console.error('FATAL ERROR: jwtPrivateKey is not defined');
  process.exit(1)
} 

// Dependencies
// const url = require('url');
// const StringDecoder = require('string_decoder').StringDecoder;
// const fs = require('fs');
// const config = require(__dirname + '/lib/config');

// const handlers      = require(__dirname + '/lib/handlers');
// const helpers      = require(__dirname + '/lib/helpers');

const http         = require('http');
const https        = require('https');
const jwt          = require('jsonwebtoken');
const express      = require('express');
const cors         = require('cors');
const path         = require('path')
const csv          = require("csvtojson");

const tempServices = require(__dirname + '/lib/tempTablesServices');
const rateLimiter  = require(__dirname + '/lib/rateLimiterRedis');
const db           = require(__dirname + '/lib/db');

// Estabilish connection to mysql database via ssh tunnel
var sshConnection = db.then(connection => {  return connection; });

// Application's handlers
const login         = require(__dirname + '/routers/login');
const units         = require(__dirname + '/routers/units');
const lists         = require(__dirname + '/routers/lists');
const locations     = require(__dirname + '/routers/locations');
const resources     = require(__dirname + '/routers/resources');
const mobileDevices = require(__dirname + '/routers/mobileDevices');
const resourceTypes = require(__dirname + '/routers/resourceTypes');
const services      = require(__dirname + '/routers/services');
const wbs           = require(__dirname + '/routers/wbs');
const tokens        = require(__dirname + '/routers/tokens');

const app = express();

const readXlsxFile = require('read-excel-file/node'); 
const whitelist = configEnv.get('whitelist');

var corsOptions = {
  
  origin: function (origin, callback) {

    if (whitelist.indexOf(origin) !== -1) { 
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }

}

// Add headers
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin, X-Requested-With, content-type, id');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ID, Token");
  // Pass to next layer of middleware
  
  next();

});
app.options('*', cors(corsOptions));

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(rateLimiter);
app.use(authenticateToken);

const multer = require('multer');
const { string } = require('joi');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    const baseName = path.parse(file.originalname).name;
    cb(null, baseName + '-' + req.body.client + path.extname(file.originalname))
  }
})

var upload = multer({ storage: storage })




// AUTHENTICATE ------------------------------------------------------------------------------- // 
app.post('/user/authenticate', (req, res) => {

  console.log('/user/authenticate request body ', req.body );
  login.login(req, res)
});

// For Express routes
function authenticateToken(req, res, next) {

  if ('/createToken,/user/authenticate'.indexOf(req.path) === -1) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);
    jwt.verify(token, configEnv.get('jwtPrivateKey'), (err, tokenPayload) => {
      if (err) return res.status(403).json(err);
      //  ToDo: check for authorized routes

      // NOTE: when processing request use req.auth to get client and user information
      //       even if it is passed as part of request body 

      req.auth = tokenPayload
      next();
    });
  } else {
    next(); // Ignore token validation is request is to create token itself
  }

}


// TOKENS ------------------------------------------------------------------------------------ // 

app.post('/createToken', (req, res) => {
  tokens.createToken(req, res)
});

app.post('/token/create', (req, res) => {
  tokens.createAPIToken(req, res)
});

// TEMPLATES ---------------------------------------------------------------------------------- // 
app.post('/templates', (req, res) => {
  const entity = req.body.entity;
  const language = req.body.language;
  const filePath = './templates/' + language + '/';
  const fileName = entity + '-' + language + '.xlsx';
  res.download( filePath + fileName ); 
});

// UPLOAD ------------------------------------------------------------------------------------ //
app.post('/upload', upload.single('file'), async function (req, res, next) {

  /* Important  ----------------------------------------------------------------- /

    To solve  "Error: Multipart: Boundary not found" is importat to ommit
    header.set('content-type', 'multipart/form-data')

  / ---------------------------------------------------------------------------- */

  if(req.auth.client != req.body.client) {
    var payloadString = JSON.stringify({ processed: 0, error: null, errorLog: { message: "Not authorized to access other client's data" } });
    res.writeHead(401);
    res.end(payloadString); // returns a stringifyed value   
    return 
  }

  if (!req.file) {
    res.writeHead(400);
    var payloadString = JSON.stringify({ error: 'field data was not provided' });
    res.end(payloadString); // returns a stringifyed value   
    return;
  } else {

    const baseName  = path.parse(req.file.originalname).name;
    const extension = path.extname(req.file.originalname).toUpperCase();
    const clientId  = req.body.client;
    const fileName  = baseName + '-' + clientId + extension;
    const entity    = req.body.entity;

    var batchPostMethod;

    // sheets name defines entity to be updated
    switch (entity) {
      case 'units': 
        batchPostMethod = units.batchUnitsPost
        break;
      case 'lists': 
        batchPostMethod = lists.batchItemsPost
        break;
      case 'locations': 
        batchPostMethod = locations.batchLocationsPost
        break;
      case 'mobileDevices':
        batchPostMethod = mobileDevices.batchMobileDevicesPost
        break;              
      case 'resources': 
        batchPostMethod = resources.batchResourcesPost
        break;
      case 'resourceTypes': 
        batchPostMethod = resourceTypes.batchResourceTypesPost
        break;
      case 'services': 
        batchPostMethod = services.batchServicesPost
        break;
      case 'wbs': 
        batchPostMethod = wbs.batchWBSPost
        break;
    }
  
    if (extension === '.CSV') {

      var returnedRows = await csv().fromFile('uploads/' + fileName)
        .then((jsonObjects) => {
          let rows = [];
          for (let obj of jsonObjects) {
            rows.push(Object.values(obj))
          }
          return rows; // csv().fromFile return only data. No oclumn names
        });

    } else if (extension === '.XLSX') {

      var returnedRows = await readXlsxFile('uploads/' + fileName).then((rows) => {
        rows.splice(0, 1); // readXlsxFile returns data with column names on first row.   
                            // We won't use them when posting data to database
        return rows;
        
      })
    }

    //
    // ToDo: Delete uploaded and processed file 
    //
    // ****************************************
    //
    //


    if (batchPostMethod !== undefined) {

      const clientId  = req.body.client;
      const language  = req.body.language;
      const user      = req.body.user;

      try {
        batchPostMethod(clientId, language, user, returnedRows)
          .then(result => {
            var payloadString = JSON.stringify(result);
            res.writeHead(200);
            res.end(payloadString); // returns a stringifyed value   
          })
      }
      catch (error) {
        console.log(error);
        var payloadString = JSON.stringify({ processed: 0, error: null, errorLog: { entity: entity, batchPostMethod: batchPostMethod, message: 'batch post method fail' } });
        res.writeHead(400);
        res.end(payloadString); // returns a stringifyed value   
      }
    } else {
      var payloadString = JSON.stringify({ processed: 0, error: null, errorLog: { entity: entity, batchPostMethod: null, message: 'TypeError: batchPostMethod is not a function' } });
      res.writeHead(400);
      res.end(payloadString); // returns a stringifyed value                 
    }
  }

});

// LISTS ------------------------------------------------------------------------------------ //

app.get('/lists', (req, res) => {

  const sqlQuery = "CALL listsReadAllClientRows(:client, :language)";
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage };

  processGetRequest('lists', sqlQuery, paramsObject, true, res);

});

app.get('/lists/:code', (req, res) => {
    const paramsObject = { client: req.auth.client, language: req.auth.userLanguage, code: req.params.code };
    const sqlQuery = "CALL listsAPIReadByCode(:client, :language, :code)";
    processGetRequest('lists', sqlQuery, paramsObject, true, res);
});

// Performe specific list validations and preparation before posting/putting
// It may result in error and response sent to user reporting error 

app.post('/lists', (req, res) => { 

  lists.post(req, res, (putQuery, params) => { 
    processPost(putQuery, params, res)
  }); 
})

app.put('/lists', (req, res) => { 
  lists.put(req, res, (putQuery, params) => { 
    processPut(putQuery, params, res)
  }); 
})

app.delete('/lists', (req, res) => { 
  lists.delete(req, res, (putQuery, params) => { 
    processDelete(putQuery, params, res)
  }); 
})


// LOCATIONS --------------------------------------------------------------------------------- //

app.get('/locations', (req, res) => {
  const sqlQuery = "CALL locationsReadAllClientRows(:client, :language)";
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage };
  processGetRequest('locations', sqlQuery, paramsObject, true, res);
});

app.get('/locations/:code', (req, res) => {
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage, code: req.params.code };
  const sqlQuery = "CALL locationsAPIReadByCode(:client, :language, :code)";
  processGetRequest('locations', sqlQuery, paramsObject, true, res);
});

app.post('/locations', (req, res) => {
  locations.post(req, res, (putQuery, params) => {
    processPost(putQuery, params, res)
  });
})

app.put('/locations', (req, res) => {
  locations.put(req, res, (putQuery, params) => {
    processPut(putQuery, params, res)
  });
})

app.delete('/locations', (req, res) => {
  locations.delete(req, res, (putQuery, params) => {
    processDelete(putQuery, params, res)
  });
})

// MOBILE DEVICES ---------------------------------------------------------------------------- //

app.get('/mobileDevices/:client/:language', (req, res) => {

  const sqlQuery = "CALL mobileDevicesReadAllClientRows(:client, :language)";
  const paramsObject  =  { client: req.params.client, language:  req.params.language };

  processGetRequest('mobileDevices', sqlQuery, paramsObject, true, res);

})

// RESOURCES -------------------------------------------------------------------------------- //

app.get('/resources/:client/:language', (req, res) => {

  const sqlQuery = "CALL resourcesReadAllClientRows(:client, :language)";
  const paramsObject  =  { client: req.params.client, language:  req.params.language };

  processGetRequest('resources', sqlQuery, paramsObject, true, res);

})

app.get('/resources', (req, res) => {
  const sqlQuery = "CALL resourcesReadAllClientRows(:client, :language)";
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage };
  processGetRequest('resources', sqlQuery, paramsObject, true, res);
});

app.get('/resources/:code', (req, res) => {
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage, code: req.params.code };
  const sqlQuery = "CALL resourcesAPIReadByCode(:client, :language, :code)";
  processGetRequest('resources', sqlQuery, paramsObject, true, res);
});

app.post('/resources', (req, res) => {
  resources.post(req, res, (putQuery, params) => {
    processPost(putQuery, params, res)
  });
})

app.put('/resources', (req, res) => {
  resources.put(req, res, (putQuery, params) => {
    processPut(putQuery, params, res)
  });
})

app.delete('/resources', (req, res) => {
  resources.delete(req, res, (putQuery, params) => {
    processDelete(putQuery, params, res)
  });
})

// RESOURCE TYPES ---------------------------------------------------------------------------- //

app.get('/resourceTypes/:client/:language', (req, res) => {

  const sqlQuery = "CALL resourceTypesReadAllClientRows(:client, :language)";
  const paramsObject  =  { client: req.params.client, language:  req.params.language };

  processGetRequest('resourceTypes', sqlQuery, paramsObject, true, res);

})

app.get('/resourceTypes', (req, res) => {

  const sqlQuery = "CALL resourceTypesReadAllClientRows(:client, :language)";
  const paramsObject  =  { client: req.auth.client, language:  req.auth.language };

  processGetRequest('resourceTypes', sqlQuery, paramsObject, true, res);

})

// SERVICES ---------------------------------------------------------------------------------- //

app.get('/services/:client/:language', (req, res) => {

  const sqlQuery = "CALL servicesReadAllClientRows(:client, :language)";
  const paramsObject  =  { client: req.params.client, language:  req.params.language };

  processGetRequest('services', sqlQuery, paramsObject, true, res);

})

app.get('/services/', (req, res) => {

  const sqlQuery = "CALL servicesReadAllClientRows(:client, :language)";
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage };

  console.log(req.auth);

  processGetRequest('services', sqlQuery, paramsObject, true, res);

})

app.get('/services/:code', (req, res) => {
  const paramsObject = { client: req.auth.client, language: req.auth.userLanguage, code: req.params.code };
  const sqlQuery = "CALL servicesAPIReadByCode(:client, :language, :code)";
  processGetRequest('services', sqlQuery, paramsObject, true, res);
});

app.post('/services', (req, res) => {
  services.post(req, res, (putQuery, params) => {
    processPost(putQuery, params, res)
  });
});

app.put('/services', (req, res) => {
  services.put(req, res, (putQuery, params) => {
    processPut(putQuery, params, res)
  });
});

app.delete('/services', (req, res) => {
  services.delete(req, res, (putQuery, params) => {
    processDelete(putQuery, params, res)
  });
})

// UNITS ------------------------------------------------------------------------------------- //

app.get('/units/:client/:language', (req, res) => {

  const sqlQuery = "CALL unitsReadAllClientRows(:client, :language)";
  const paramsObject  =  { client: req.params.client, language:  req.params.language };
  processGetRequest('units', sqlQuery, paramsObject, true, res);

})

// WBS -------------------------------------------------------------------------------------- //

app.get('/wbs/:client/:language', (req, res) => {

  const sqlQuery = "CALL wbsReadAllClientsPage('*', :client, :language)";
  const paramsObject  =  { client: req.params.client, language:  req.params.language };
  processGetRequest('wbs', sqlQuery, paramsObject, true, res);

})

app.get('/wbs/:projectCode', (req, res) => {
  const sqlQuery = "CALL wbsAPIReadByProject(:client, :projectCode)";
  const paramsObject = { client: req.auth.client, projectCode: req.params.projectCode, language: req.auth.userLanguage };

  console.log(req.auth)
  console.log(paramsObject)
  processGetRequest('wbs', sqlQuery, paramsObject, true, res);
});

app.post('/wbs', (req, res) => {
  wbs.post(req, res, (putQuery, params) => {
    processPost(putQuery, params, res)
  });
})

app.put('/wbs', (req, res) => {
  wbs.put(req, res, (putQuery, params) => {
    processPut(putQuery, params, res)
  });
})

app.delete('/wbs', (req, res) => {
  wbs.delete(req, res, (putQuery, params) => {
    processDelete(putQuery, params, res)
  });
})

// SUPPORT FUNCTIONS  ---------------------------------------------------------------------- //

function processGetRequest(entity, sqlQuery, paramsObject, needTranslate, res) {

 connection.query(sqlQuery, paramsObject, function (error, results, fields) {

    if (error) { 
      res.writeHead(500); 
      res.end(JSON.stringify({ message: "Error: An unexpected error occured while getting " + sqlQuery })) 
    } else if (results[0].length === 0) { 
      res.writeHead(404); 
      res.end(JSON.stringify({ message: "No rows returned for " + sqlQuery })) 
    } else {
      if (needTranslate) {
        const translation = getTranslator(entity, paramsObject.language);
        var translatedResult = tempServices.translate(results[0], translation);
        res.json(results[0])
      } else {
        res.json(translatedResult)
      }
    }
  });

}

function processPost(sqlQuery, paramsObject, res) {

  connection.query(sqlQuery, paramsObject, function (error, results, fields) {

    if (error) {
      res.status(500).json(error);
    } else {
      if (results[0][0] .code)
        res.status(results[0][0].code).json(results[0][0]);
      else 
        res.status(500).json(results[0][0]);
    }

  });

}

function processPut(sqlQuery, paramsObject, res) {
  
  connection.query(sqlQuery, paramsObject, function (error, results, fields) {
    if (error) {
      error.putQuery = sqlQuery;
      res.status(500).json(error);
    } else {
      res.status(results[0][0].code).json(results[0][0]);
    }

  });

}

function processDelete(sqlQuery, paramsObject, res) {

  console.log(paramsObject);

  connection.query(sqlQuery, paramsObject, function (error, results, fields) {

    if (error) {
      error.putQuery = sqlQuery;
      res.status(500).json(error);
    } else {
      console.log(results[0][0])
      res.status(results[0][0].code).json(results[0][0]);
    }

  });
}



function getTranslator(entityName, language) {

  const translations = {
    pt_br: {
      "lists" : {
        code: "codigo",
        description: "descricao",
        active: "ativo",
        startDate: "dataInicio",
        endingDate: "dataTermino",
        listGroup: "grupoLista"
      },
      "locations": {
        name            : "nome",
        code            : "codigo",
        description     : "descricao",
        active          : "ativo",
        latitude        : "latitude",
        longitude       : "longitude",
        startDate       : "dataInicio",
        endingDate      : "dataTermino",
        locationGroup   : "grupoLocal"
      },
      "mobileDevices": {
        user    : "usuario",
        project : "projeto",
        code    : "codigo",
        type    : "tipo",
        active  : "ativo",
        imei    : "imei"
      },
      "resources": {
        resourceCode    : "codigo",
        name            : "nome",
        resourceType    : "tipo",
        measureUnit     : "unidadeMedida",
        active          : "ativo",
        startDate       : "dataInicio",
        endingDate      : "dataTermino",
        resourceGroup   : "grupoLocal"
      },
      "resourceTypes": {
        name                : "nome",
        description         : "descricao",
        measureUnit         : "unidadeMedida",
        resourceTypeGroup   : "grupoRecurso"
      },
      "services": {
        code            : "codigo",
        description     : "descricao",
        active          : "ativo",
        startDate       : "dataInicio",
        endingDate      : "dataTermino",
        serviceGroup    : "grupoLocal"
      },
      "units" : {
          name:         "nome",
          code:         "codigo",
          location:     "local",
          country:      "pais",
          description:  "descricao",
          active:       "ativo"
      },
      "wbs": {
        projectName:    'projeto',
        wbsItem:        'item',
        wbsCode:        'codigo',
        activity:       'atividade',
        costCenter:     'centroCusto',
        active:         'ativo',
        startDate:      'dataInicio',
        endingDate:     'dataTermino',
        wbsGroup:       'grupoEAP'
      }
    }
  }
  const translator = translations[language][entityName];
  return translator;

}

app.listen(7102, () => {
  console.log('Express web server listening on port 7102');
});

