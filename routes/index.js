const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const isUser = auth.isUser;
const fs = require('fs-extra');
const moment = require("moment")

// Get Product model
var Product = require('../models/product');
// Get Category model
var Category = require('../models/category');
//Get Order model
var Order = require('../models/order');

//Get home page
router.get("/", function(req, res) {
  res.render("home");
})

//Get single order page
router.get("/order/:id", isUser, function(req, res) {
  var total = 0;
  var sub = 0;
  Order.findById(req.params.id).exec(function(err, order) {
    if (req.user.id.toString() === order.customerId.toString()) {

      order.items.forEach(function(err, item) {
        sub = parseInt(item.qty * item.price)
        total += sub
      })
      res.render("singleOrder", {
        order: order,
        moment: moment
      })
    }
  })
})

//get search page
router.get("/search", function(req, res) {
  var noMatch = null;
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), 'gi');
    // Get all products that matches the search from DB
    Product.find({
      title: regex
    }, function(err, products) {
      if (err) {
        console.log(err);
      } else {
        if (products.length < 1) {
          noMatch = "Sorry, we were unable to find any product that you're looking for.";
        }
        res.render("searchResultPage", {
          products: products,
          noMatch: noMatch,
          searchQuery: req.query.q
        });
      }
    });
  }
})

//Function to implement fuzzy search
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

router.get("/login", function(req, res) {
  res.render("index")
})

router.get("/register", function(req, res) {
  res.render("register");
})

router.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/login");
})

//GET ALL PRODUCTS with Pagination
router.get("/products", function(req, res) {
  const sort = {}
  var sortBy = ""
  var perPage = 4
  var page = req.query.page ? parseInt(req.query.page) : 1
  if (req.query.sortBy) {
    const str = req.query.sortBy.split(':')
    sort[str[0]] = str[1] === 'desc' ? -1 : 1
    sort._id = -1
    sortBy = "&sortBy=" + req.query.sortBy
  }
  Product
    .find({})
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .sort(sort)
    .exec(function(err, products) {
      Product.countDocuments().exec(function(err, count) {
        if (err) console.log(err)
        res.render('allProducts', {
          catSlug: "",
          products: products,
          current: page,
          pages: Math.ceil(count / perPage),
          sortBy: sortBy
        })
      })
    })
})

//GET PRODUCTS BY CATEGORY
router.get('/products/:category', function(req, res) {
  var sortBy = ""
  var categorySlug = req.params.category;
  const sort = {}
  var perPage = 8
  var page = req.query.page ? parseInt(req.query.page) : 1
  if (req.query.sortBy) {
    const str = req.query.sortBy.split(':')
    sort[str[0]] = str[1] === 'desc' ? -1 : 1
    sort._id = -1
    sortBy = "&sortBy=" + req.query.sortBy
  }

  Category.findOne({
    slug: categorySlug
  }, function(err, c) {
    Product.find({
        category: categorySlug
      }).skip((perPage * page) - perPage)
      .limit(perPage)
      .sort(sort).exec(function(err, products) {
        Product.countDocuments().exec(function(err, count) {
          if (err)
            console.log(err);

          res.render('productsByCategory', {
            catSlug: "/" + categorySlug,
            title: c.title,
            products: products,
            current: page,
            pages: Math.ceil(count / perPage),
            sortBy: sortBy
          });
        })
      });
  });
});

//GET PRODUCT DETAIL PAGE
router.get('/product/:category/:product', function(req, res) {
  var galleryImages = null;

  Product.findOne({
    slug: req.params.product
  }).exec(function(err, p) {
    galleryDir = 'public/product_images/' + p._id + '/gallery'

    fs.readdir(galleryDir, function(err, files) {
      if (err) {
        console.log(err);
      } else {
        galleryImages = files;
      }
    });
    Product.aggregate([{
        $match: {
          $and: [{
            category: req.params.category
          }, {
            slug: {
              $ne: req.params.product
            }
          }]
        }
      },
      {
        $sample: {
          size: 4
        }
      }

    ], function(err, related) {

      setTimeout(function() {
        res.render('product-detail', {
          title: p.title,
          p: p,
          galleryImages: galleryImages,
          relatedProducts: related
        });
      }, 100);
    })
  })
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
router.get('/cart/update/:product/:size', function(req, res) {
  var size = req.params.size;
  var title = req.params.product;
  var cart = req.session.cart;
  var action = req.query.action;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].title == title) {
      if (cart[i].size == size) {
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
  } else {
    res.render("paymentView", {
      cart: req.session.cart
    })
  }
})

//GET ALL ORDERS FOR A USER
router.get("/orders", isUser, function(req, res) {
  Order.find({
    customerId: req.user.id
  }, null, {
    sort: {
      'createdAt': -1
    }
  }).exec(function(err, orders) {
    res.render("orderView", {
      orders: orders,
      moment: moment
    });
  })
});

//POST ROUTES

//post ADD PRODUCT TO CART
router.post('/cart/add/:product', function(req, res) {
  var slug = req.params.product
  var title = slug.charAt(0).toUpperCase() + slug.slice(1);
  var title2 = title.replace('-', ' ')
  var quantity = req.body.quantity
  var selectedRadioBtn = req.body.size
  console.log(selectedRadioBtn)
  Product.findOne({
    slug: slug
  }, function(err, p) {
    if (err)
      console.log(err);
    if (typeof req.session.cart == "undefined") {
      req.session.cart = [];
      req.session.cart.push({
        title: title2,
        qty: quantity,
        price: parseFloat(p.price).toFixed(2),
        image: '/product_images/' + p._id + '/' + p.image,
        size: selectedRadioBtn
      });
    } else {
      var cart = req.session.cart;
      var newItem = true;

      for (var i = 0; i < cart.length; i++) {
        if (cart[i].title == title2) {
          if (cart[i].size == selectedRadioBtn) {
            cart[i].qty++;
            newItem = false;
            break;
          }
        }
      }

      if (newItem) {
        cart.push({
          title: title2,
          qty: quantity,
          price: parseFloat(p.price).toFixed(2),
          image: '/product_images/' + p._id + '/' + p.image,
          size: selectedRadioBtn
        });
      }
    }
    res.redirect('back');
  });
});

//POST NEW ORDER
router.post("/orders/add", isUser, function(req, res) {
  const order = new Order({
    customerId: req.user.id,
    items: req.session.cart,
    phone: req.body.phone,
    email: req.body.email,
    address: req.body.address,
    name: req.body.name
  })

  order.save(function(err) {
    if (err) {
      return console.log(err);
      res.redirect("/products")
    } else {
      delete req.session.cart
      res.redirect("/");
      console.log("Success")
    }
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
    description: 'Ecovani Charge',
    source: token
  }, function(err, charge) {
    if (err) {
      console.log(err)
      return res.redirect('/cart/checkout');
    }
    delete req.session.cart;
    return res.redirect('/')
  });
});

module.exports = router;
