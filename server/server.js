'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

var multer = require('multer');
var Excel = require('exceljs');

var storage = multer.diskStorage({ // multers disk storage settings
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    var datetimestamp = Date.now();
      cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
  }
});
var upload = multer({ // multer settings
  storage: storage
}).single('file');

/* API path that will upload the files */
app.post('/upload', function (req, res) {
  upload(req, res, function (err) {
    if (err) {
      res.json({error_code: 1, err_desc: err});
      return;
    }
    /* Multer gives us file info in req.file object */
    if(!req.file){
      res.json({error_code: 1, err_desc: "No file passed"});
      return;
    }
    try {
      var workbook = new Excel.Workbook();
      workbook.xlsx.readFile(req.file.path)
        .then(function() {
          // use workbook
          var worksheet = workbook.getWorksheet('Sheet1');
          for (var i = 2; i <= worksheet.rowCount; i++) {
            var data = {
              "machine": parseInt(worksheet.getCell('A' + i).value),
              "attribute": worksheet.getCell('B' + i).value,
              "reading": parseFloat(worksheet.getCell('C' + i).value)
            };
            app.models.Machine.upsertWithWhere(
              {"machine": data.machine, "attribute": data.attribute},
              data,
              function(err, obj){
                if(err){
                  console.log(err);
                  console.log(obj);
                }
              }
            );
          }
        });
    } catch (e){
      res.json({error_code: 1, err_desc: "Corrupted excel file"});
      return;
    }
    res.json({error_code: 0, err_desc: null});
  });
});
/* API path that will download the files */
app.get('/download', function (req, res) {
  var datetime = new Date();
  var book = new Excel.Workbook();
  var sheet = book.addWorksheet('Sheet1');
  res.set('Expires', 'Tue, 03 Jul 2001 06:00:00 GMT');
  res.set('Cache-Control', 'max-age=0, no-cache, must-revalidate, proxy-revalidate');
  res.set('Last-Modified', datetime + ' GMT');
  res.set('Content-Type','application/force-download');
  res.set('Content-Type','application/octet-stream');
  res.set('Content-Type','application/download');
  res.set('Content-Disposition','attachment;filename=current.xlsx');
  res.set('Content-Transfer-Encoding','binary');
  sheet.getCell('A1').value = 'Machine';
  sheet.getCell('B1').value = 'attribute';
  sheet.getCell('C1').value = 'reading';
  app.models.Machine.find({}, function(err, models){
    models.forEach(function(item, i, arr) {
      sheet.getCell('A' + (i + 2)).value = item.machine;
      sheet.getCell('B' + (i + 2)).value = item.attribute;
      sheet.getCell('C' + (i + 2)).value = item.reading;
    });
    book.xlsx.write(res).then(function() {
      res.send();
    });
  });
});

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
