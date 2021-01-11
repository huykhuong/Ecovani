var express = require("express");
var router = express.Router();
var auth = require("../config/auth");
var isUser = auth.isUser;
var fs = require('fs-extra');

// Get Product model
var Product = require('../models/product');
// Get Category model
var Category = require('../models/category');

router.get("/", function(req, res) {
  res.render("home");
})

router.get("/login", function(req, res) {
  res.render("index")
})

router.get("/admin", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("adminHome");
  } else {
    res.redirect("/login");
  }
})

router.get("/register", function(req, res) {
  res.render("register");
})

router.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/login");
})

router.get("/cart", isUser, function(req, res) {
  res.send("dsf")
})

//GET ALL PRODUCTS
router.get("/products", function(req, res) {
  Product.find(function(err, products) {
    if (err) console.log(err);
    res.render("allProducts", {
      products: products
    })
  })
})

//GET PRODUCTS BY CATEGORY
router.get('/products/:category', function(req, res) {

  var categorySlug = req.params.category;

  Category.findOne({
    slug: categorySlug
  }, function(err, c) {
    Product.find({
      category: categorySlug
    }, function(err, products) {
      if (err)
        console.log(err);

      res.render('productsByCategory', {
        title: c.title,
        products: products
      });
    });
  });

});

//GET PRODUCT DETAIL PAGE
router.get('/product/:category/:product', function(req, res) {

  var galleryImages = null;

  Product.findOne({
    slug: req.params.product
  }, function(err, product) {
    if (err) {
      console.log(err);
    } else {
      var galleryDir = 'public/product_images/' + product._id + '/gallery';

      fs.readdir(galleryDir, function(err, files) {
        if (err) {
          console.log(err);
        } else {
          galleryImages = files;

          res.render('product-detail', {
            title: product.title,
            p: product,
            galleryImages: galleryImages,
          });
        }
      });
    }
  });

});

//GET ADD PRODUCT TO CART
router.get('/cart/add/:product', function(req, res) {

  var slug = req.params.product

  var title = (slug.charAt(0).toUpperCase() + slug.slice(1));
  var title2 = title.replace('-',' ')
  Product.findOne({
    slug: slug
  }, function(err, p) {
    if (err)
      console.log(err);

    if (typeof req.session.cart == "undefined") {
      req.session.cart = [];
      req.session.cart.push({
        title: title2,
        qty: 1,
        price: parseFloat(p.price).toFixed(2),
        image: '/product_images/' + p._id + '/' + p.image
      });
    } else {
      var cart = req.session.cart;
      var newItem = true;

      for (var i = 0; i < cart.length; i++) {
        if (cart[i].title == title2) {
          cart[i].qty++;
          newItem = false;
          break;
        }
      }

      if (newItem) {
        cart.push({
          title: slug,
          qty: 1,
          price: parseFloat(p.price).toFixed(2),
          image: '/product_images/' + p._id + '/' + p.image
        });
      }
    }
    res.redirect('back');
  });

});

// Get Checkout Page
router.get('/cart/checkout', function(req, res) {
  if (req.session.cart && req.session.cart.length == 0) {
    delete req.session.cart;
    res.redirect('/cart/checkout');
  } else {
    res.render('checkout', {
      title: 'Checkout',
      cart: req.session.cart
    });
  }
});

//Get update product in the checkout session
router.get('/cart/update/:product', function(req, res) {
  var slug = req.params.product;
  var cart = req.session.cart;
  var action = req.query.action;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].title == slug) {
      switch (action) {
        case "add":
          cart[i].qty++;
          break;
        case "remove":
          cart[i].qty--;
          if (cart[i].qty < 1)
            cart.splice(i, 1);
          break;
        case "clear":
          cart.splice(i, 1);
          if (cart.length == 0)
            delete req.session.cart;
          break;
        default:
          console.log('Error occurred');
          break;
      }
      break;
    }
  }
  res.redirect('/cart/checkout');
});

// Get clear cart
router.get('/cart/clear', function(req, res) {

  delete req.session.cart;

  req.flash('success', 'Cart cleared!');
  res.redirect('/cart/checkout');

});

//GET PAYMENT VIEW
router.get("/cart/payment", function(req, res) {
  var total = 0;
  var cart = req.session.cart;
  if (!cart) {
    res.redirect("/cart/checkout");
  }
  cart.forEach(function(product) {
    var sub = parseFloat(product.qty * product.price).toFixed(2)
    total += sub
  })

  res.render("paymentView", {
    cart: req.session.cart
  })
})

//POST STRIPE CHARGE
router.post("/cart/charge", function(req, res) {
  var cart = req.session.cart;
  var total = 0;
  if (!cart) {
    res.redirect("/cart/checkout");
  }
  cart.forEach(function(product) {
    var sub = product.qty * product.price
    total += sub
  })
  const stripe = require('stripe')(process.env.STRIPE_SECRETKEY);

  // Token is created using Stripe Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express

  const charge = stripe.charges.create({
    amount: total,
    currency: 'vnd',
    description: 'Example charge',
    source: token
  }, function (err, charge){
    if(err){
      console.log(err)
      return res.redirect('/cart/checkout');
    }
    req.session.cart = null;
    return res.redirect('/')
  });
});

module.exports = router;
