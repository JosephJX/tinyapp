const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcryptjs = require("bcryptjs");
const req = require("express/lib/request");
const { use } = require("express/lib/application");
const app = express();
const PORT = 8080;

const { generateRandomString, emailHasUser, userIdFromEmail, urlsForUser, cookieHasUser } = require("./helpers");

//object with the short and long URLs
const urlDatabase = {};

// object with all the users data
const users = {};

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieSession({
  name: "session",
  keys: ["Joseph"],
  maxAge: 24 * 60 * 60 * 1000,
}));

// ROUTES

app.get("/", (req, res) => {
  res.send("Hello!");
  if (cookieHasUser(req.session.user_id, users)) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {
  let templateVars = {
    user: users[req.session["user_id"]],
    urls: urlsForUser(req.session.user_id, urlDatabase),
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (!cookieHasUser(req.session.user_id, users)) {
    res.redirect("/login");
  } else {
    let templateVars = {
      user: users[req.session["user_id"]]
    };
    res.render("urls_new", templateVars);
  }
});

app.get("/register", (req, res) => {
  if (cookieHasUser(req.session.user_id, users)) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      user: users[req.session.user_id],
    };
    res.render("urls_registration", templateVars);
  }
});

app.get("/login", (req, res) => {
  if (cookieHasUser(req.session.user_id, users)) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      user: users[req.session.user_id],
    };
    res.render("urls_login", templateVars);
  }
});

app.get("/urls/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) {
    let templateVars = {
      shortURL: req.params.shortURL,
      longURL: urlDatabase[req.params.shortURL].longURL,
      urlUserID: urlDatabase[req.params.shortURL].userID,
      user: users[req.session.user_id],
    };
    res.render("urls_show", templateVars);
  } else {
    res.status(404).send("The short URL you entered does not correspond with a long URL at this time.")
  }
});

app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    if (longURL === undefined) {
      res.status(302);
    } else {
      res.redirect(longURL)
    }
  } else {
    res.status(404).send("The short URL you are trying to access does not correspond with a long URL at this time.")
  }
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: req.session.user_id,
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.status(401).send("You must be logged in to a valid account to create short URLs.")
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const userID = req.session["user_id"];
  const userUrls = urlsForUser(userID, urlDatabase);
  if (Object.keys(userUrls).includes(req.params.shortURL)) {
    const shortURL = req.params.shortURL;
    delete urlDatabase[shortURL];
    res.redirect('/urls');
  } else {
    res.status(401).send("You do not have authorization to delete this short URL.");
  }
});

app.post("/urls/:id", (req, res) => {
  const userID = req.session["user_id"];
  const userUrls = urlsForUser(userID, urlDatabase);
  if (Object.keys(userUrls).includes(req.params.id)) {
    const shortURL = req.params.id;
    urlDatabase[shortURL].longURL = req.body.newURL;
    res.redirect('/urls');
  } else {
    res.status(401).send("You do not have authorization to edit this short URL.");
  }
});

app.post("/register", (req, res) => {
  const submittedEmail = req.body.email;
  const submittedPassword = req.body.password;

  if (!submittedEmail || !submittedPassword) {
    res.status(400).send("Please include both a valid email and password");
  } else if (emailHasUser(submittedEmail, users)) {
    res.status(400).send("An account already exists for this email address");
  } else {
    const newUserID = generateRandomString();
    users[newUserID] = {
      id: newUserID,
      email: submittedEmail,
      password: bcryptjs.hashSync(submittedPassword, 10),
    };
    req.session.user_id = newUserID;
    res.redirect("/urls");
  }
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!emailHasUser(email, users)) {
    res.status(403).send("There is no account associated with this email address");
  } else {
    const userID = userIdFromEmail(email, users);
    if (!bcryptjs.compareSync(password, users[userID].password)) {
      res.status(403).send("The password you entered does not match the one associated with the provided email address");
    } else {
      res.session.user_id = userID;
      res.redirect("/urls");
    }
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

