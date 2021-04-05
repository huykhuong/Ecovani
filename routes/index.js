const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const isUser = auth.isUser;
const fs = require('fs-extra');
const moment = require("moment")
const https = require('https');
const uuidv1 = require('uuidv1')
const crypto = require('crypto');
const paypal = require('paypal-rest-sdk');
const request = require ('request');
const querystring = require ('querystring');
const Promise = require ('bluebird');
const nodemailer = require('nodemailer')

// Get Product model
var Product = require('../models/product');
// Get Category model
var Category = require('../models/category');
//Get Order model
var Order = require('../models/order');

//Get home page and fetch new arrival products
router.get("/", function(req, res) {
  var temp = "";
  Product.find({}).sort({createdAt: -1}).limit(1).exec(function(err,product){
    if(product.length !== 0){
      temp = product[0].dateCreated.slice(0,10)
    }
  })
  setTimeout(function(){
    Product.find({featured: "featured"}).exec(function(err,featuredProduct){
      Product.find({dateCreated: temp}).sort({id: -1}).exec(function(err,products){
        res.render("home", {newArrival: products, featuredProduct: featuredProduct});
      })
    })
  },100)
})

//Get single order page
router.get("/order/:id", isUser, function(req, res) {
  var total = 0;
  var sub = 0;
  Order.findById(req.params.id).exec(function(err, order) {
    if (req.user.id.toString() === order.customerId.toString()) {

      order.products.forEach(function(err, item) {
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
    console.log(req.query.q)
    const regex = new RegExp(escapeRegex(req.query.q), 'gi');
    console.log(regex)
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
  res.redirect("/");
})

//GET ALL PRODUCTS with Pagination
router.get("/products", function(req, res) {
  const sort = {}
  var sortBy = ""
  var perPage = 12
  var page = req.query.page ? parseInt(req.query.page) : 1
  if (req.query.sortBy) {
    const str = req.query.sortBy.split(':')
    sort[str[0]] = str[1] === 'desc' ? -1 : 1
    sort._id = -1
    sortBy = "&sortBy=" + req.query.sortBy
  }else{
    sort._id = -1
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
  var perPage = 12
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
        Product.countDocuments({category: categorySlug}).exec(function(err, count) {
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
    res.render('checkout');
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
router.get("/cart/payment", isUser ,function(req, res) {
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
      moment: moment,
    });
  })
});

//GET PAYMENT STATUS PAGE FOR PAYPAL
router.get('/paypal/status/:id', (req, res) => {
  var cart = req.session.cart;
  var total = 0;
  var sub = 0;
  cart.forEach(function(p){
    sub = parseFloat(p.price * p.qty)
    total += sub
  });
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": (total*0.000043).toString()
        }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
       res.render('paymentStatus',{status:"failed"});
       Order.findOneAndUpdate({_id : req.params.id}, {paymentStatus: "Failed", deliveryStatus: "Cancelled Order"}, { useFindAndModify: false }, function(err){
         if(err) console.log(err)
       });
       const eventEmitter = req.app.get('eventEmitter')
       eventEmitter.emit('orderFailed',{paymentStatus: "Failed", deliveryStatus: "Cancelled Order"})
    } else {
      Order.findOneAndUpdate({_id: req.params.id}, {paymentStatus: "Paid"}, { useFindAndModify: false }, function(err){
        if(err) console.log(err)
        delete req.session.cart
        setTimeout(function(){
          res.render("paymentStatus", {
            orderId: req.params.id,
            status: "success"
          })
        },100)
      });
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderSuccess', {paymentStatus: "Paid"})
      sendEmail(req.params.id, payment.transactions[0].custom)
    }
  });
});

//GET PAYMENT STATUS PAGE FOR MOMO WALLET AND CASH ON DELIVERY
router.get("/orders/result", function(req, res) {
  var param = req.originalUrl.substring(req.originalUrl.indexOf("?") + 1, req.originalUrl.indexOf("signature") -1 )
  console.log(param)
  var decoded = decodeURIComponent(param)
  var signature = crypto.createHmac('sha256', process.env.MOMO_SECRETKEY).update(decoded).digest('hex');
  if(Object.keys(req.query).length === 0) {
    Order.find().sort({
      _id: -1
    }).limit(1).exec(function(err, order) {
      if (order) {
        res.render("paymentStatus", {
          orderId: order[0]._id,
          status: "success"
        })
      }
    });
  }
  else if(signature === req.query.signature && Object.keys(req.query).length > 0){
    if (parseInt(req.query.errorCode) === 0) {
          delete req.session.cart
          res.render("paymentStatus", {
            orderId: req.query.orderId,
            status: "success"
          })
          const eventEmitter = req.app.get('eventEmitter')
          eventEmitter.emit('orderSuccess', {paymentStatus: "Paid"})
          sendEmail(req.query.orderId, req.query.extraData)
    } else {
      res.render("paymentStatus", {
        status: "failed"
      })
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderFailed',{paymentStatus: "Failed", deliveryStatus: "Cancelled Order"})
    }
}else{
  res.send("Error, Your signature and MoMo's signature do not match")
}
});


//POST ROUTES
//post ADD PRODUCT TO CART
router.post('/cart/add/:product', function(req, res) {
  var slug = req.params.product
  // var title = slug.charAt(0).toUpperCase() + slug.slice(1);
  // var title2 = title.replace('-', ' ')
  var quantity = req.body.quantity
  var selectedRadioBtn = req.body.size
  Product.findOne({
    slug: slug
  }, function(err, p) {
    if (err)
      console.log(err);
    if (typeof req.session.cart == "undefined") {
      req.session.cart = [];
      req.session.cart.push({
        title: p.title,
        qty: quantity,
        price: parseFloat(p.price).toFixed(2),
        image: '/product_images/' + p._id + '/' + p.image,
        size: selectedRadioBtn
      });
    } else {
      var cart = req.session.cart;
      var newItem = true;

      for (var i = 0; i < cart.length; i++) {
        if (cart[i].title == p.title) {
          if (cart[i].size == selectedRadioBtn) {
            cart[i].qty = parseInt(cart[i].qty) + parseInt(quantity);
            console.log(cart[i].qty)
            newItem = false;
            break;
          }
        }
      }

      if (newItem) {
        cart.push({
          title: p.title,
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

//POST NEW ORDER for Cash on delivery method
router.post("/orders/add", isUser, function(req, res){
  const email = req.body.email
  const order = new Order({
    customerId: req.user.id,
    products: req.session.cart,
    buyerPhone: req.body.phone,
    buyerEmail: req.body.email,
    buyerAddress: req.body.address,
    buyerName: req.body.name
  })

  order.save(function(err) {
    if (err) {
      return console.log(err);
      res.redirect("/products")
    } else {
      delete req.session.cart
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderPlaced', order)
      res.redirect("/orders/result")
    }
  })

  var id = null;
    setTimeout(function(req,res){
      Order.find().sort({
        _id: -1
      }).limit(1).exec(function(err, order) {
        if (order) {
          id = order[0]._id
          sendEmail(id,email)
        }
      });
    },1000)
})

//RECEIVING INSTANT PAYMENT NOTIFICATION FROM PAYPAL SERVICE BY POST REQUEST
router.post("/notify/paypal",function(req,res){
  console.log(req.body)
  res.sendStatus(200)
});


//RECEIVING INSTANT PAYMENT NOTIFICATION FROM MOMO SERVICE BY POST REQUEST
router.post("/notify",function(req,res){
  var param = "partnerCode=" + req.body.partnerCode +
              "&accessKey=" + req.body.accessKey +
              "&requestId=" + req.body.requestId +
              "&amount=" + req.body.amount +
              "&orderId=" + req.body.orderId +
              "&orderInfo=" + req.body.orderInfo +
              "&orderType=" + req.body.orderType +
              "&transId=" + req.body.transId +
              "&message=" + req.body.message +
              "&localMessage=" + req.body.localMessage +
              "&responseTime=" + req.body.responseTime +
              "&errorCode=" + req.body.errorCode +
              "&payType=" + req.body.payType +
              "&extraData=" + req.body.extraData
  var decoded = decodeURIComponent(param)
  var signature = crypto.createHmac('sha256', process.env.MOMO_SECRETKEY).update(decoded).digest('hex');
  if(signature === req.body.signature){
    if (parseInt(req.body.errorCode) === 0) {
      Order.findOneAndUpdate({_id : req.body.orderId}, {paymentStatus: "Paid"}, { useFindAndModify: false }, function(err){
        if(err) console.log(err)
      });

    } else {
      Order.findOneAndUpdate({_id : req.body.orderId}, {paymentStatus: "Failed", deliveryStatus: "Cancelled Order"}, { useFindAndModify: false }, function(err){
        if(err) console.log(err)
      });

    }
}else{
  res.send("Error, Your signature and MoMo's signature do not match")
}
});

//POST MOMO Charge
router.post("/cart/chargeMomo", function(req, res){
  var cart = req.session.cart;
  var email = req.body. email;
  var str = "";

  //Create order in database
  const order = new Order({
    customerId: req.user.id,
    products: req.session.cart,
    buyerPhone: req.body.phone,
    buyerEmail: req.body.email,
    buyerAddress: req.body.address,
    buyerName: req.body.name,
    paymentType: "Momo Wallet"
  })

  order.save(function(err) {
    if (err) {
      return console.log(err);
      res.redirect("/products")
    } else {
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderPlaced', order)
    }
  })
  var id = null;
  setTimeout(function(){
  //Fetch the most recent order inserted into the database to extract its id to apply in the creation of the HTTP request object to send to MOMO
  Order.find().sort({
    _id: -1
  }).limit(1).exec(function(err, order){
    id = order[0].id
  })
  },100)

  setTimeout(function(){
    var total = 0;
    cart.forEach(function(product) {
      var sub = product.qty * product.price
      total += sub
    })
    var requestId = uuidv1()
    var orderInfo = "Payment at Ecovani Apparel"
    var returnUrl = "http://localhost:3000/orders/result"
    var notifyUrl = "https://45e38aabdb15.ngrok.io/notify"
    var requestType = "captureMoMoWallet"
    var orderId = id
    var extraData = email
    var rawSignature = "partnerCode=" + process.env.MOMO_PARTNERID + "&accessKey=" + process.env.MOMO_ACCESSKEY + "&requestId=" + requestId + "&amount=" + total.toString() + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&returnUrl=" + returnUrl + "&notifyUrl=" + notifyUrl + "&extraData=" + extraData
    //puts raw signature

    //signature
    var signature = crypto.createHmac('sha256', process.env.MOMO_SECRETKEY)
      .update(rawSignature)
      .digest('hex');
    console.log("--------------------SIGNATURE----------------")
    console.log(signature)


    //json object send to MoMo endpoint
    var body = JSON.stringify({
      partnerCode: process.env.MOMO_PARTNERID,
      accessKey: process.env.MOMO_ACCESSKEY,
      requestId: requestId,
      amount: total.toString(),
      orderId: id,
      orderInfo: orderInfo,
      returnUrl: "http://localhost:3000/orders/result",
      notifyUrl: "https://45e38aabdb15.ngrok.io/notify",
      extraData: extraData,
      requestType: requestType,
      signature: signature,
    })
    //Create the HTTPS objects
    var options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/gw_payment/transactionProcessor',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    //Send the request and get the response
    var req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (body) => {
        str += body;
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });

    req.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(body);
    req.end();
    // });
  },200)
  setTimeout(function() {
    //Redirect to the MOMO payment page
    res.redirect(JSON.parse(str).payUrl)
  }, 4000)
})


//PAYPAL CHARGE
paypal.configure({
'mode': 'sandbox', //sandbox or live
'client_id': 'AYoEdxQ3MeQntn614kfhIXCIvRy5sD4L7CzaoyGKgFuEw1ZMK11lKw9j4yCaDMR7Q_Uz33Sjf_u9LhP8',
'client_secret': 'EOFnmdN8PxNoKOGipGRJNg0-9t-KDrUAWueQYa-N6SyInCcaQh0WZb-wmfyteTI5i1N6xrXZmV3nC0LY'
});

router.post("/cart/chargePaypal",function(req,res){
  var email = req.body.email;
  var cart = req.session.cart;
  var items = []
  var total = 0;
  var sub = 0;
  cart.forEach(function(p){
    sub = parseFloat(p.price * p.qty)
    total += sub
    items.push({
      "name": p.title,
      "sku": p._id,
      "price": parseFloat(p.price*0.000043).toString(),
      "currency": "USD",
      "quantity": p.qty
    })
  });

  const order = new Order({
    customerId: req.user.id,
    products: req.session.cart,
    buyerPhone: req.body.phone,
    buyerEmail: req.body.email,
    buyerAddress: req.body.address,
    buyerName: req.body.name,
    paymentType: "Paypal"
  })

  order.save(function(err) {
    if (err) {
      return console.log(err);
      res.redirect("/products")
    } else {
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderPlaced', order)
    }
  })

  var id = null;
  setTimeout(function(){
  //Fetch the most recent order inserted into the database to extract its id to apply in the creation of the HTTP request object to send to PAYPAL
  Order.find().sort({
    _id: -1
  }).limit(1).exec(function(err, order){
    id = order[0]._id
  })
  },100)

  setTimeout(function(){
    var create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://localhost:3000/paypal/status/"+id,
          "cancel_url": "http://localhost:3000/paypal/status/"+id
      },
      "transactions": [{
          "item_list": {
              "items": items
          },
          "amount": {
              "currency": "USD",
              "total": (total*0.000043).toString()
          },
          "description": "Payment at Ecovani Apparel",
          "custom": email
      }]
  };


    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
            throw error;
        } else {
          for(let i = 0;i < payment.links.length;i++){
            if(payment.links[i].rel === 'approval_url'){
              res.redirect(payment.links[i].href);
            }
          }
        }
    });
  },200)
});

//Function to send email to the buyer when a purchase is successfully made
function sendEmail(id,email){
  const html = `<h4 class="text-center">Thank you for your purchase</h4>` +
  `<p>Your Order Id is: ` + id + '</p>'+
  `<p>Please follow the link below to review your order: </p>` + `<a href=http://localhost:3000/order/` + id + `>` + `http://localhost:3000/order/` + id + `</a>`
  // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
      },
    });

    // send mail with defined transport object
    let mailOptions = {
      from: '"Ecovani Apparel" <scottkhuong@gmail.com>', // sender address
      to: email, // list of receivers
      subject: "Payment receipt from Ecovani Apparel", // Subject line
      text: "", // plain text body
      html: html, // html body
    };

    transporter.sendMail(mailOptions,(error,info) =>{
      if(error) return console.log(error)
      console.log("Message sent: %s", info.response);
      // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

      // Preview only available when sending through an Ethereal account
      // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
}


module.exports = router;
