const express = require('express');
const multer = require('multer');
const readXlsxFile = require('read-excel-file/node');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

var upload = multer({ storage: storage })


var app = express()

app.set('view engine',  'ejs')
app.get('/', function(req, resp) {
    resp.render('index')
})

app.post('/upload', upload.single('file'), function (req, res, next) {
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    console.log('calling upload.single()...', req.file)

    readXlsxFile('uploads/' + req.file.originalname).then((rows) => {
        console.log(rows)
        // `rows` is an array of rows
        // each row being an array of cells.
    })
})

app.post('/photos/upload', upload.array('photos', 12), function (req, res, next) {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
})

var cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 8 }])
app.post('/cool-profile', cpUpload, function (req, res, next) {
    // req.files is an object (String -> Array) where fieldname is the key, and the value is array of files
    //
    // e.g.
    //  req.files['avatar'][0] -> File
    //  req.files['gallery'] -> Array
    //
    // req.body will contain the text fields, if there were any
})

app.listen(8080, () => {
    console.log('listening to 8080 port')
})

