//npm modules
const express = require('express');
const uuid = require('uuid/v4')
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios');
// const bcrypt = require('bcrypt-nodejs');
var RedisStore = require('connect-redis')(session);

  
  // configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    { usernameField: 'email',
    passReqToCallback: true, session: false },
    (req, email, password, done) => {
        console.log("req.session", req.session);
        if (req.session) {
            axios.get(`http://localhost:5000/users?email=${email}`)
            .then(res => {
                // console.log("Usser", res);
                const user = res.data[0]
                if (!user) {
                    return done(null, false, { message: 'Invalid credentials.\n' });
                }
                console.log("password", password);
                console.log("user.password", user.password);
                // if (!bcrypt.compareSync(password, user.password)) {
                //     return done(null, false, { message: 'Invalid credentials.\n' });
                //   }
                if (password != user.password) {
                    return done(null, false, { message: 'Invalid credentials.\n' });
                }
                return done(null, user);
            })
            .catch(error => {
                console.log("Error", error);
                done(error)
            });
        } else {
            console.log("no session defined");
            return done({name: test})
        }
        
    }
));

  // tell passport how to serialize the user
passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. User id is save to the session file store here')
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    console.log("deserializeUser");
    axios.get(`http://localhost:5000/users/${id}`)
    .then(res => done(null, res.data) )
    .catch(error => done(error, false))
  });

// create the server
const app = express();

const custRetry = () => {
    return function (options) {
        console.log(options);
        return 10000;
    }
}

// add & configure middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const options = {
    host: "localhost",
    port: 6379,
    retry_strategy: custRetry(),
    connect_timeout: 36000000
};

app.use(
    session({
    genid: (req) => {
      console.log('Inside the session middleware')
      console.log(req.sessionID)
      return uuid() // use UUIDs for session IDs
    },
    // store: new FileStore(),
    store: new RedisStore(options),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
  })
)

  app.use(passport.initialize());
  app.use(
    // function(req, res, next) {
        // console.log("req.session:", req.session);
        passport.session()
        // next();
    // })
  )

// create the homepage route at '/'
app.get('/', (req, res) => {
    console.log('Inside the homepage callback function')
    console.log(req.sessionID)
    res.send(`You hit home page!\n`)
})

// create the login get and post routes
app.get('/login', (req, res) => {
    console.log('Inside GET /login callback function')
    console.log(req.sessionID)
    res.send(`You got the login page!\n`)
})

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if(info) {return res.send(info.message)}
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      req.login(user, (err) => {
        if (err) { return next(err); }
        return res.redirect('/authrequired');
      })
    })(req, res, next);
  })
  
  app.get('/authrequired', (req, res) => {
    if(req.isAuthenticated()) {
      res.send('you hit the authentication endpoint\n')
    } else {
      res.redirect('/')
    }
  })
// tell the server what port to listen on
app.listen(3000, () => {
  console.log('Listening on localhost:3000')
})