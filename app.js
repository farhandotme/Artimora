const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
const connectionDb = require("./DB/connectionDb.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("./models/userModel.js");

dotenv.config({ path: "./.env" }); // Load environment variables first

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());
app.use(cookieParser());

// Connect to the database
connectionDb();

// Main page
app.get("/", (req, res) => {
  res.render("index");
});

// Get register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Post register page

app.post("/register", async (req, res) => {
  const { name, email, password, password2 } = req.body;
  if (!name || !email || !password || !password2) {
    req.flash("error", "All fields are required");
    return res.redirect("/register");
  }
  if (password !== password2) {
    req.flash("error", "Passwords do not match");
    return res.redirect("/register");
  }
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    req.flash("error", "Email already exists");
    return res.redirect("/register");
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    req.flash("success", "Registration successful");
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/register");
  }
});

// GET LOGIN
app.get("/login", (req, res) => {
  let success_msg = req.flash("success");
  let login_error = req.flash("login-error");
  res.render("login", { success_msg, login_error });
});

// Login page
app.get("/login", (req, res) => {
  const success = req.flash("success");
  const errors = req.flash("error");
  res.render("login", { success, errors });
});

// Get login page
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check if all fields are filled
  if (!email || !password) {
    req.flash("error", "All fields are required");
    return res.redirect("/login");
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    req.flash("success", "Login successful");
    res.redirect("/homePage");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/login");
  }
});

app.get("/homePage", (req, res) => {
  res.render("homePage");
});

const port = process.env.PORT || 3000;

app.listen(3000, () => {
  console.log("App listening on port http://localhost:3000");
});
