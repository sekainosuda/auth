//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
// const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//////////////////// app ////////////////////
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

///// express-session
app.use(
  session({
    secret: process.env.SENSSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

///// passport
app.use(passport.initialize());
app.use(passport.session());

//////////////////// mongoose ////////////////////
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

///// passport-local-mongoose
const options = {
  usernameField: "email",
  errorMessages: {
    MissingPasswordError: "No password was given (パスワードを入力して下さい)",
    AttemptTooSoonError: "Account is currently locked. Try again later",
    TooManyAttemptsError:
      "Account locked due to too many failed login attempts",
    NoSaltValueStoredError: "Authentication not possible. No salt value stored",
    IncorrectPasswordError:
      "Password or username are incorrect (パスワードあるいはメールアドレスが間違っています)",
    IncorrectUsernameError:
      "Password or username are incorrect (パスワードあるいはメールアドレスが間違っています)",
    MissingUsernameError:
      "No username was given (メールアドレスを入力して下さい)",
    UserExistsError:
      "A user with the given username is already registered (入力したメールアドレスは既に存在します)"
  }
};

userSchema.plugin(passportLocalMongoose, options);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

///// passport
// use static authenticate method of model in LocalStrategy
// passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
      });
    }
  )
);

//////////////////// Routes ////////////////////
app.get("/", (req, res) => {
  res.render("home");
});

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const user = new User({
      email: req.body.email,
      password: req.body.password
    });

    req.login(user, err => {
      if (!err) {
        console.log(user);
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      } else {
        console.error(err);
        res.redirect("/login");
      }
    });
  });

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register(
      { email: req.body.email },
      req.body.password,
      (err, registeredUser) => {
        if (!err) {
          console.log(registeredUser);
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
          });
        } else {
          res.redirect("/register");
          console.error(err.message);
        }
      }
    );
  });

app.get("/secrets", (req, res) => {
  console.log(req.isAuthenticated());

  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", (req, res) => {
  res.render("submit");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

//////////////////// Listen ////////////////////
let port = 3000;
app.listen(port, () => {
  console.log("Server started on port " + port + ".");
});
