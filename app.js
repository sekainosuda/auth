//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

///////////// mongoose ///////////////
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(encrypt, { secret: process.env.SECRET,  encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

///////////// Routing //////////////
app.get("/", (req, res) => { res.render("home"); });

app.route("/login")
.get((req, res) => {
  res.render("login");
})
.post((req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email }, (err, foundUser) => {
    if (!err) {
      if (foundUser) {
        if ( foundUser.password === password ) {
          res.render("secrets");
        } else {
          res.send("Wrong password");
        }
      } else {
        res.send("Wrong email");
      }
    }
  });
});

app.route("/register")
.get((req, res) => {
  res.render("register");
})
.post((req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const newUser = new User({
    email: email,
    password: password
  });
  newUser.save((err, savedUser) => { if (!err) {
    console.log("New user has been saved");
    res.redirect("/");
  }});
});

app.get("/submit", (req, res) => {
  res.render("submit");
});

let port = 3000;
app.listen(port, () => {
  console.log("Server started on port " + port + ".");
});
