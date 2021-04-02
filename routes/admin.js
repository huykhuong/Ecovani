const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const isAdmin = auth.isAdmin;

//GET CAtegory model
const Category = require("../models/category")
//Get product model
const Product = require("../models/product")
//Get Order model
var Order = require('../models/order');
//Get User model
var User = require('../models/user');

router.get("/" , isAdmin ,function(req, res) {
  Product.find({}).exec(function(err,product){
    Order.find({})
    .exec(function(err,orders){
      Order.countDocuments().exec(function (err, c) {
        if(err) console.log(err);
        res.render('adminDashboard', {
            orders: orders,
            count: c,
            products: product
        });
      });
    })
  })
})

var accounts;

router.get("/accounts", isAdmin ,function(req, res) {
  User.find({}).sort({_id: -1}).exec(function(err,u){
    accounts = u
    res.render('adminCreateAccount',{accounts: accounts})
  })
})

router.post("/accounts", isAdmin , function(req,res){
  const { password, confirmPassword} = req.body;
  let errors = []
  if(password !== confirmPassword){
    errors.push({msg: "Passwords do not match"});
  }
  if(errors.length > 0){
    res.render("adminCreateAccount", {errors: errors,accounts: accounts,user:req.user})
  }
  else{
  User.register({username: req.body.username, role:"staff"}, req.body.password, function(err,user){
    if(err){
      errors.push({msg: 'Username already existed'})
      res.render("adminCreateAccount", {errors: errors,accounts: accounts,user:req.user});
    }
    else{
      res.redirect("/admin/accounts");
    }
  })
}
});

module.exports = router;
