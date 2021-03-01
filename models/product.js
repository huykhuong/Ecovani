const mongoose = require("mongoose");

var dateObj = new Date();
var month = dateObj.getUTCMonth() + 1; //months from 1-12
var day = dateObj.getUTCDate();
var year = dateObj.getUTCFullYear();

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug:{
    type: String
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String
  },
  featured: {
    type: String,
    default: "notFeatured"
  },
  dateCreated:{
    type: String,
    default: year + "-" + month + "-" + day
  }
},{timestamps:true})

const Product = module.exports = mongoose.model("Product", productSchema)
