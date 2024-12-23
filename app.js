const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
const connectionDb = require("./DB/connectionDb.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const userModel = require("./models/userModel.js");
const productModel = require("./models/productModel.js");
const orderModel = require("./models/orderModel.js");
const isloggedin = require("./middlewares/isloggedin.js");

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

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

// Get login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Post login page
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true });

    req.flash("success", "Login successful");
    res.redirect("/homePage");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/login");
  }
});

app.get("/addDetails", (req, res) => {
  res.render("inputDetails");
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

app.get("/homePage", isloggedin, async (req, res) => {
  try {
    const products = await productModel.find();
    res.render("homePage", { products });
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/");
  }
});

// Post create product
app.post("/create", upload.single("image"), async (req, res) => {
  const { name, details, price } = req.body;
  const image = req.file;

  if (!name || !details || !price || !image) {
    req.flash("error", "All fields are required");
    return res.redirect("/addDetails");
  }

  try {
    const newProduct = new productModel({
      name,
      details,
      price,
      image: {
        data: image.buffer,
        contentType: image.mimetype,
      },
    });

    await newProduct.save();

    req.flash("success", "Product created successfully");
    res.redirect("/homePage");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/addDetails");
  }
});

// Add to cart
app.post("/addToCart/:id", isloggedin, async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await productModel.findById(productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/homePage");
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    req.session.cart.push(product);
    req.flash("success", "Product added to cart");
    res.redirect("/homePage");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/homePage");
  }
});

// Remove from cart
app.post("/removeFromCart/:id", isloggedin, (req, res) => {
  const productId = req.params.id;

  if (!req.session.cart) {
    req.flash("error", "Cart is empty");
    return res.redirect("/cart");
  }

  req.session.cart = req.session.cart.filter(
    (product) => product._id !== productId
  );

  req.flash("success", "Product removed from cart");
  res.redirect("/cart");
});

// View cart
app.get("/cart", isloggedin, (req, res) => {
  const cart = req.session.cart || [];
  const totalAmount = cart.reduce((total, product) => total + product.price, 0);
  res.render("cart", { cart, totalAmount });
});

// Order now
app.post("/order", isloggedin, async (req, res) => {
  const cart = req.session.cart || [];
  const { name, phone, address } = req.body;

  if (cart.length === 0) {
    req.flash("error", "Your cart is empty");
    return res.redirect("/cart");
  }

  try {
    const newOrder = new orderModel({
      user: req.user.id,
      items: cart.map(product => ({
        product: product._id,
        name: product.name,
        price: product.price,
        details: product.details,
        image: product.image,
      })),
      name,
      phone,
      address,
      totalAmount: cart.reduce((total, product) => total + product.price, 0),
    });

    await newOrder.save();

    req.session.cart = [];
    req.flash("success", "Order placed successfully");
    res.redirect("/homePage");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/cart");
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on port http://localhost:${port}`);
});