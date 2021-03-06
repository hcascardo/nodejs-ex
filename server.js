//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    //ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '172.16.1.176',
    ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    //online
      mongoURLLabel = mongoURL = 'mongodb://';
    //local
    //mongoURLLabel = mongoURL = http://172.16.1.176/mydb:27017;
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function (callback) {
    //local
    //mongoURLLabel = mongoURL = 'mongodb://127.0.0.1:27017';
    ///online
    mongoURLLabel = mongoURL = 'mongodb://';
    
    if (mongoURL == null) {
        console.log('mongoURL == null');
        return;
    }
  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

      console.log(conn)
      console.log(conn.databaseName)

    db = conn.db('data');  
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
    
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails , mongoURLmsg : mongoURL, mongodbmsg : mongoDatabase});
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/stat', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts'); 
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('stat.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('stat.html', { pageCountMessage : null});
  }
});

app.get('/createcol', function (req, res) {
    // try to initialize the db on every request if it's not already
    // initialized.
    if (!db) {
        console.log('!DB');
        initDb(function (err) { });
    }
    if (db) {
        const data = db.collection('data');     
        var col = db.collection('counts');
        // Create a document with request IP and current time of request
        col.insert({ ip: req.ip, date: Date.now() });

        col.find({})
        // Create a document with data -- This data will be updated by a POST req from ESP32
/*        console.log("[DEBUG] Inserting data..")
        data.insert({ humidity: 50 }, function (err, result) {
            console.log("[DEBUG] Error: " + err)
            console.log("[DEBUG] res: " + JSON.stringify(result))
        }); 
        console.log("[DEBUG] Data inserted) */
        data.insertMany([{ humidity: 20 }, { temperature: 25 }, { airhum: 17 } ]);
        col.count(function (err, count) {
            if (err) {
                console.log('Error running count. Message:\n' + err);
            }
            res.render('createcol.html', { humiditymsg: null, temperature: null, airhum: null, pageCountMessage: count });
        });
        } else {
            res.render('createcol.html', { humiditymsg: null, temperature: null, airhum: null, pageCountMessage: null });
        }
});


// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
