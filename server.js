const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

//Need dotenv for testing in windows
require('dotenv').config();

const mongoose = require('mongoose')
//mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
// mongoose.connect(process.env.MLAB_URI, {useNewUrlParser: true}, function (err) {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log("Connected");
//   }
// });
mongoose.connect(process.env.MLAB_URI).then(console.log('Connected')).catch(ex => console.error(ex));
app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
//app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
/*app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})*/

// Error Handling middleware
app.use((err, req, res) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

//Schemas
const Schema = mongoose.Schema;
//exUser
const exUserSchema = Schema({
  usrName: { type: String, required: true }
});

const exUser = mongoose.model('exUser', exUserSchema);

//Exercises
const exerciseSchema = Schema({
  exUser: {type: mongoose.Schema.Types.ObjectId, ref: 'exUser', required: true},
  Description: {type:String, required: true},
  Duration: {type:Number, required: true},
  ExDate: Date
});

const exercise = mongoose.model('exercise', exerciseSchema);

//Create a New User
app.post('/api/exercise/new-user', function (req, res){
  console.log(req.body.username);
  //res.json({"username": req.body.username});
  exUser.create({usrName: req.body.username}, function (err, data){
    if (err) {
      console.log(err);
    } else {
      res.json({"username": req.body.username, "_id": data._id});
    }
  });
});

//Get array of all users
app.get("/api/exercise/users", function (req, res){
  exUser.find({}).exec(function (err, docs) {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      res.send(docs);
    }
  });
});

//Add exercises
app.post("/api/exercise/add", function (req, res) {
  //console.log(req.body);
  //check the user id is real first
  exUser.findById(req.body.userId).exec(function (err, usr) {
    if (err) {
      console.log(err);
      res.send("unknown _id");
    } else {
      var d = new Date();
      console.log(usr);
      if (req.body.Date !== undefined) {
        d = req.body.Date;
      }
      exercise.create({exUser: req.body.userId, Description: req.body.description, Duration: req.body.duration, ExDate: d}, function (err){
        if (err) {
          console.log(err);
          res.send(err);
        } else {
          res.json({"username": usr.usrName, "description": req.body.description, "duration": req.body.duration, "_id": req.body.userId, "date": d.toDateString()});
        }
      });
    }
  });
});

//exercise log
app.get("/api/exercise/log", function (req, res) {
  exUser.findById(req.query.userId).exec(function (err, usr) {
    if (err) {
      console.log(err);
      res.send("unknown _id");
    } else {
      var query ={};
      //if (req.query.userId !== "") {
        query["exUser"] = req.query.userId;
      //}
      if (req.query.from !== undefined && req.query.to == undefined) {
        query["ExDate"] = {"$gte" : req.query.from};
      }
      if (req.query.to !== undefined && req.query.from == undefined) {
        query["ExDate"] = {"$lte" : req.query.to};
      }
      if (req.query.from !== undefined && req.query.to !== undefined) {
        query["ExDate"] = {"$gte": req.query.from, "$lte": req.query.to};
      }
      console.log(query);
      console.log(req.query);

      var exQuery = exercise.find(query);
      if (req.query.limit !== undefined) {
        var l = parseInt(req.query.limit);
        exQuery.limit(l);
      }
      exQuery.exec(function (err, data) {
        if (err) {
          res.send(err);
        } else {
          res.json({"_id": req.query.userId, "username": usr.usrName, "count": data.length, "log": data});
        }
      });

    }
  });


  
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
