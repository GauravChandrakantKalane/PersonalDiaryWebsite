require("dotenv").config;
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const app = express();
const bcrypt = require("bcrypt");
const saltRounds = 10;
// passport
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// session
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true },
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect("mongodb://localhost:27017/blogappDB")
  .then(() => console.log("Connections Established Successfully!"));

const blogPostSchema = new mongoose.Schema({
  title: String,
  post: String,
  date: String,
});

const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  password: String,
  blogs: [blogPostSchema], // new
});

userSchema.plugin(passportLocalMongoose);

const Blog = new mongoose.model("blog", blogPostSchema);
const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
  res.render("main", { title: "HomePage" });
});

app.get("/login", function (req, res) {
  res.render("login", { title: "Login" });
});

app.get("/register", function (req, res) {
  res.render("register", { title: "Register" });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //   const newUser = new User({
  //     email: req.body.email,
  //     password: hash,
  //   });
  //   newUser.save(function (err) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       res.redirect("/homepage");
  //     }
  //   });
  // });

  User.register(
    { username: req.body.username },
    req.body.password,

    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/homepage");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  // User.findOne({ email: email }, function (err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       bcrypt.compare(password, foundUser.password, function (err, result) {
  //         if (result == true) {
  //           res.redirect("/homepage");
  //         } else {
  //           res.redirect("/login");
  //         }
  //       });
  //     }
  //   }
  // });

  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/homepage");
      });
    }
  });
});

app.get("/homepage", function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, blogItem) {
      console.log("this is users info = " + blogItem);
      res.render("home", {
        name: blogItem.name,
        posts: blogItem.blogs,
        title: "HomePage",
      });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/about", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("about", { title: "About Us" });
  } else {
    res.redirect("/login");
  }
});

app.get("/contact", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("contact", { title: "Contact Us" });
  } else {
    res.redirect("/login");
  }
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", { title: "Compose" });
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function (req, res) {
  const postInfo = new Blog({
    title: req.body.postTitle,
    post: req.body.postContent,
    date: new Date().toLocaleDateString("en-US"),
  });

  // postInfo.save();

  // res.redirect("/homepage");
  // console.log(req.user);
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        console.log(foundUser);
        foundUser.blogs.push(postInfo);
        foundUser.save(function () {
          res.redirect("/homepage");
        });
      }
    }
  });
});

app.get("/posts", function (req, res) {
  res.send("This is the Posts Route!");
});

app.get("/posts/:postId", function (req, res) {
  if (req.isAuthenticated()) {
    const requestedId = req.params.postId;
    console.log("This is the requested Id " + requestedId);

    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.blogs.forEach(function (result) {
            if (result._id == requestedId) {
              res.render("page", {
                title: result.title,
                content: result.post,
                date: result.date,
              });
            }
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.listen(3000, (req, res) => {
  console.log("The server is running on port 3000...");
});
