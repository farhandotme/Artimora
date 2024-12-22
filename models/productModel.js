const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    data: Buffer,
    contentType: String,
  },
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
