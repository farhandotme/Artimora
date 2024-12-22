const jwt = require("jsonwebtoken");
function isloggedin(req, res, next) {
  if (req.cookies.token === "" || req.cookies.token === undefined) {
    res.redirect("/login");
  } else {
    let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = data;
    next();
  }
}

module.exports = isloggedin;
