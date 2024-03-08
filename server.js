import express from 'express';
import pkg from 'body-parser';
import cors from 'cors';
import { config } from 'dotenv';
import { connect, Schema as _Schema, model } from 'mongoose';

const { urlencoded } = pkg;

// Need dotenv for testing in windows
config();

const app = express();

connect(process.env.MLAB_URI)
    .then(console.log('Connected'))
    .catch((ex) => console.error(ex));

app.use(cors());

app.use(urlencoded({ extended: false }));
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Not found middleware
/*app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})*/

// Error Handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    let errCode, errMessage;

    if (err.errors) {
        // mongoose validation error
        errCode = 400; // bad request
        const keys = Object.keys(err.errors);
        // report the first validation error
        errMessage = err.errors[keys[0]].message;
    } else {
        // generic or custom error
        errCode = err.status || 500;
        errMessage = err.message || 'Internal Server Error';
    }
    res.status(errCode).type('txt').send(errMessage);
});

// Schemas
const Schema = _Schema;
// exUser
const exUserSchema = Schema({
    usrName: { type: String, required: true },
});

const exUser = model('exUser', exUserSchema);

// Exercises
const exerciseSchema = Schema({
    exUser: {
        type: _Schema.Types.ObjectId,
        ref: 'exUser',
        required: true,
    },
    Description: { type: String, required: true },
    Duration: { type: Number, required: true },
    ExDate: Date,
});

const exercise = model('exercise', exerciseSchema);

// Create a New User
app.post('/api/exercise/new-user', function (req, res) {
    console.log(req.body.username);
    exUser
        .create({ usrName: req.body.username })
        .then((data) =>
            res.json({ username: req.body.username, _id: data._id })
        )
        .catch((ex) => console.error(ex));
});

// Get array of all users
app.get('/api/exercise/users', function (req, res) {
    exUser
        .find({})
        .then((docs) => res.send(docs))
        .catch((err) => {
            console.error(err);
            res.send(err);
        });
});

// Add exercises
app.post('/api/exercise/add', function (req, res) {
    // console.log(req.body);
    // check the user id is real first
    exUser
        .findById(req.body.userId)
        .then((usr) => {
            let d = new Date();
            if (req.body.Date) {
                d = req.body.Date;
            }

            exercise
                .create({
                    exUser: req.body.userId,
                    Description: req.body.description,
                    Duration: req.body.duration,
                    ExDate: d,
                })
                .then(() => {
                    res.json({
                        username: usr.usrName,
                        description: req.body.description,
                        duration: req.body.duration,
                        _id: req.body.userId,
                        date: d.toDateString(),
                    });
                })
                .catch((ex) => {
                    console.error(ex);
                    res.send(ex);
                });
        })
        .catch((err) => {
            console.error(err);
            res.send('unknown _id');
        });
});

/**
 * Check if this is a valid date
 * @param {string} date
 * @returns {boolean}
 */
function IsDate(date) {
    return new Date(date) !== 'Invalid Date' && !isNaN(new Date(date));
}

// exercise log
app.get('/api/exercise/log', function (req, res) {
    exUser
        .findById(req.query.userId)
        .then((usr) => {
            const query = {
                exUser: req.query.userId,
            };

            if (
                req.query.from &&
                req.query.to &&
                IsDate(req.query.from) &&
                IsDate(req.query.to)
            ) {
                query['ExDate'] = { $gte: req.query.from, $lte: req.query.to };
            } else if (req.query.from && IsDate(req.query.from)) {
                query['ExDate'] = { $gte: req.query.from };
            } else if (req.query.to && IsDate(req.query.to)) {
                query['ExDate'] = { $lte: req.query.to };
            }

            console.log(query);

            const exQuery = exercise.find(query);
            if (req.query.limit) {
                const limit = parseInt(req.query.limit);
                exQuery.limit(limit);
            }

            exQuery
                .then((data) =>
                    res.json({
                        _id: req.query.userId,
                        username: usr.usrName,
                        count: data.length,
                        log: data,
                    })
                )
                .catch((ex) => res.send(ex));
        })
        .catch(() => res.send('unknown _id'));
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
