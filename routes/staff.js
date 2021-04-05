const express = require("express");
const router = express.Router();
const moment = require("moment");
const path = require("path");
const mkdirp = require("mkdirp");
const fs = require("fs-extra");
const resizeImg = require("resize-img");
const auth = require("../config/auth");
const isStaff = auth.isStaff;

//GET CAtegory model
const Category = require("../models/category")
//Get product model
const Product = require("../models/product")
//Get Order model
var Order = require('../models/order');

//GET ROUTES
router.get("/",isStaff ,function(req, res) {
      res.render('staffHome');
})

router.get("/category", isStaff ,function(req, res) {
  Category.find(function(err, categories) {
    if (err) return console.log(err);
    res.render("staffCategory", {
      categories: categories
    })
  })
})

router.get("/category/add-category", isStaff , function(req, res) {
  var title = "";

  res.render("staffAddCategory", {
    title: title
  });
})

router.get("/category/edit-category/:id", isStaff , function(req, res) {
  Category.findById(req.params.id, function(err, category) {
    if (err) return console.log(err);

    res.render("staffEditCategory", {
      title: category.title,
      id: category._id
    })
  })
})

router.get("/category/delete-category/:id", isStaff , function(req, res) {
  Category.findByIdAndRemove(req.params.id, function(err) {
    if (err) return console.log(err);
    Category.find(function(err, categories) {
      if (err) {
        console.log(err);
      } else {
        req.app.locals.categories = categories;
      }
    });
    req.flash('success_msg', "Category deleted");
    res.redirect("/staff/category/")
  })
})

//Get all products in staff screen
router.get('/product', isStaff , function (req, res) {
  var perPage = 10;
  var page = req.query.page ? parseInt(req.query.page) : 1
  var sortBy = ""
  Product
    .find({})
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .sort({createdAt: -1})
    .exec(function(err, products) {
      Product.countDocuments().exec(function(err, count) {
        if (err) console.log(err)
        res.render('staffProduct', {
          count: count,
          catSlug: "",
          products: products,
          current: page,
          pages: Math.ceil(count / perPage),
          sortBy: sortBy,
          moment: moment
        })
      })
    })
});

router.get("/product/add-product", isStaff , function(req, res) {
  var title = "";
  var description = "";
  var price = "";

  Category.find(function(err, categories) {
    res.render('staffAddProduct', {
      title: title,
      description: description,
      categories: categories,
      price: price
    })
  })
})

router.get("/product/edit-product/:id", isStaff , function(req, res) {
  var errors;
  if (req.session.errors) errors = req.session.errors;
  req.session.errors = null;

  Category.find(function(err, categories) {
    Product.findById(req.params.id, function(err, p) {
      if (err) {
        console.log(err);
        res.redirect('staffProduct');
      } else {
        var galleryDir = 'public/product_images/' + p._id + '/gallery';
        var galleryImages = null;

        fs.readdir(galleryDir, function(err, files) {
          if (err) {
            console.log(err);
          } else {
            galleryImages = files;
            res.render('staffEditProduct', {
              title: p.title,
              errors: errors,
              desc: p.description,
              categories: categories,
              category: p.category.replace(/\s+/g, '-').toLowerCase(),
              price: parseFloat(p.price).toFixed(2),
              image: p.image,
              galleryImages: galleryImages,
              id: p._id
            })
          }
        })
      }
    })
  })
})

router.get("/product/delete-image/:image", isStaff , function(req, res) {
  var originalImage = 'public/product_images/' + req.query.id + '/gallery/' + req.params.image;
  var thumbImage = 'public/product_images/' + req.query.id + '/gallery/thumbs/' + req.params.image;

  fs.remove(originalImage, function(err) {
    if (err) {
      console.log(err);
    } else {
      fs.remove(thumbImage, function(err) {
        if (err) {
          console.log(err);
        } else {
          req.flash('success_msg', 'Image deleted');
          res.redirect('/staff/product/edit-product/' + req.query.id);
        }
      })
    }
  })
})

//Delete product
router.get('/delete-product/:id', isStaff , function(req, res) {

  var id = req.params.id;
  var path = 'public/product_images/' + id;

  fs.remove(path, function(err) {
    if (err) {
      console.log(err);
    } else {
      Product.findByIdAndRemove(id, function(err) {
        console.log(err);
      });

      req.flash('success_msg', 'Product deleted!');
      res.redirect('/staff/product');
    }
  });
});

//Get all orders
router.get("/orders", isStaff ,function(req,res){
  var perPage = 30;
  var page = req.query.page ? parseInt(req.query.page) : 1
  var sortBy = ""
  Order
    .find({})
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .sort({createdAt: -1})
    .exec(function(err, orders) {
      Order.countDocuments().exec(function(err, count) {
        if (err) console.log(err)
        res.render('staffOrderView', {
          catSlug: "",
          orders: orders,
          current: page,
          pages: Math.ceil(count / perPage),
          sortBy: sortBy,
          moment: moment
        })
      })
    })
});

//Delete a product
router.get('/product/delete-product/:id', isStaff , function (req, res) {

    var id = req.params.id;
    var path = 'public/product_images/' + id;

    fs.remove(path, function (err) {
        if (err) {
            console.log(err);
        } else {
            Product.findByIdAndRemove(id, function (err) {
                console.log(err);
            });

            req.flash('success_msg', 'Product deleted!');
            res.redirect('/staff/product');
        }
    });

});

//POST ROUTES

//ADD NEW CATEGORY
router.post("/category/add-category", isStaff , function(req, res) {
  let categoryErrors = [];
  let categorySuccess = [];

  var title = req.body.title;
  var slug = title.replace(/\s+/g, '-').toLowerCase();

  if (!title) {
    categoryErrors.push({
      msg: "Category cannot be left empty"
    });
  }
  if (categoryErrors.length > 0) {
    res.render("staffAddCategory", {
      categoryErrors: categoryErrors,
      title: title
    })
  } else {
    Category.findOne({
      title: title
    }, function(err, category) {
      if (category) {
        categoryErrors.push({
          msg: "Category already existed"
        });
        res.render("staffAddCategory", {
          categoryErrors: categoryErrors,
          title: title
        });
      } else {
        var category = new Category({
          title: title,
          slug: slug
        });

        category.save(function(err) {
          if (err)
            return console.log(err);
          Category.find(function(err, categories) {
            if (err) {
              console.log(err);
            } else {
              req.app.locals.categories = categories;
            }
          });
          req.flash("success", "Category added");
          res.redirect("/staff/category");
        })
      }
    })
  }
})


//EDIT CATEGORY
router.post("/category/edit-category/:id", isStaff , function(req, res) {
  let categoryErrors = [];
  let categorySuccess = [];

  var title = req.body.title;
  var slug = title.replace(/\s+/g, '-').toLowerCase();
  var id = req.params.id;

  if (!title) {
    categoryErrors.push({
      msg: "Category cannot be left empty"
    });
  }
  if (categoryErrors.length > 0) {
    res.render("staffEditCategory", {
      categoryErrors: categoryErrors,
      title: title,
      id: id
    })
  } else {
    Category.findOne({
      slug: slug,
      _id: {
        '$ne': id
      }
    }, function(err, category) {
      if (category) {
        categoryErrors.push({
          msg: "Category already existed"
        });
        res.render("staffEditCategory", {
          categoryErrors: categoryErrors,
          title: title,
          id: id
        });
      } else {
        Category.findById(id, function(err, category) {
          if (err) return console.log(err);

          category.title = title;
          category.slug = slug;

          category.save(function(err) {
            if (err)
              return console.log(err);
            Category.find(function(err, categories) {
              if (err) {
                console.log(err);
              } else {
                req.app.locals.categories = categories;
              }
            });
            categorySuccess.push({
              msg: "Category succesfully edited"
            })
            res.render("staffEditCategory", {
              categorySuccess: categorySuccess,
              title: title,
              id: id
            });
          })
        })
      }
    })
  }
})

//ADD PRODUCT
router.post("/product/add-product", isStaff , function(req, res) {
  if (!req.files) {
    imageFile = "";
  }
  if (req.files) {
    var imageFile = typeof(req.files.image) !== "undefined" ? req.files.image.name : ""
  }
  req.checkBody('title', 'Title must have a value').notEmpty();
  req.checkBody('description', "Description must have a value").notEmpty();
  req.checkBody('price', 'Price must have a value').isDecimal();
  req.checkBody('image', "You must upload an image").isImage(imageFile);

  var title = req.body.title;
  var slug = title.replace(/\s+/g, '-').toLowerCase();
  var desc = req.body.description;
  var price = req.body.price;
  var category = req.body.category;
  var featured = req.body.featuredOption;

  var errors = req.validationErrors();

  if (errors) {
    Category.find(function(err, categories) {
      res.render('staffAddProduct', {
        errors: errors,
        title: title,
        description: desc,
        category: categories,
        price: price
      })
    })
  } else {
    Product.findOne({
      slug: slug
    }, function(err, product) {
      if (product) {
        req.flash('error', 'Product title already existed');
        Category.find(function(err, categories) {
          res.render("staffAddProduct", {
            title: title,
            description: desc,
            categories: categories,
            price: price
          });
        });
      } else {
        var price2 = parseFloat(price).toFixed(2);

        var product = new Product({
          title: title,
          featured: featured,
          slug: slug,
          description: desc,
          price: price2,
          category: category,
          image: imageFile
        });

        if(featured === "featured"){
          Product.findOneAndUpdate({featured : "featured" }, {featured: "notFeatured"}, { useFindAndModify: false }, function(err){
            if(err) console.log(err)
          });
        }

        product.save(function(err) {
          if (err) return console.log(err);

          mkdirp('public/product_images/' + product._id, function(err) {
            return console.log(err);
          });

          mkdirp('public/product_images/' + product._id + '/gallery', function(err) {
            return console.log(err);
          });

          mkdirp('public/product_images/' + product._id + '/gallery/thumbs', function(err) {
            return console.log(err);
          });

          if (imageFile != "") {
            var productImage = req.files.image;
            var path = 'public/product_images/' + product._id + '/' + imageFile;

            productImage.mv(path, function(err) {
              return console.log(err);
            });

            var path2 = 'public/product_images/' + product._id + '/gallery/' + imageFile;
            var thumbPath2 = 'public/product_images/' + product._id + '/gallery/thumbs/' + imageFile;
            productImage.mv(path2, function(err) {
              if (err) console.log(err)
              resizeImg(fs.readFileSync(path2), {
                width: 100,
                height: 100
              }).then(function(buf) {
                fs.writeFileSync(thumbPath2, buf);
              })
            });
          }

          req.flash('success_msg', "Product added");
          res.redirect('/staff/product')
        })
      }
    })
  }
});

//POST edit product
router.post('/product/edit-product/:id', isStaff , function (req, res) {

  if (!req.files) {
    imageFile = "";
  }
  if (req.files) {
    var imageFile = typeof(req.files.image) !== "undefined" ? req.files.image.name : ""
  }

    req.checkBody('title', 'Title must have a value.').notEmpty();
    req.checkBody('desc', 'Description must have a value.').notEmpty();
    req.checkBody('price', 'Price must have a value.').isDecimal();


    var title = req.body.title;
    var slug = title.replace(/\s+/g, '-').toLowerCase();
    var desc = req.body.desc;
    var price = req.body.price;
    var category = req.body.category;
    var pimage = req.body.pimage;
    var id = req.params.id;

    var errors = req.validationErrors();

    if (errors) {
        req.session.errors = errors;
        res.redirect('/staff/product/edit-product/' + id);
    } else {
        Product.findOne({slug: slug, _id: {'$ne': id}}, function (err, p) {
            if (err)
                console.log(err);

            if (p) {
                req.flash('danger', 'Product title exists, choose another.');
                res.redirect('/staff/product/edit-product/' + id);
            } else {
                Product.findById(id, function (err, p) {
                    if (err)
                        console.log(err);

                    p.title = title;
                    p.slug = slug;
                    p.description = desc;
                    p.price = parseFloat(price).toFixed(2);
                    p.category = category;
                    if (imageFile != "") {
                        p.image = imageFile;
                    }

                    p.save(function (err) {
                        if (err)
                            console.log(err);

                        if (imageFile != "") {
                            if (pimage != "") {
                                fs.remove('public/product_images/' + id + '/' + pimage, function (err) {
                                    if (err)
                                        console.log(err);
                                });
                            }

                            var productImage = req.files.image;
                            var path = 'public/product_images/' + id + '/' + imageFile;

                            productImage.mv(path, function (err) {
                                return console.log(err);
                            });

                        }

                        req.flash('success', 'Product edited!');
                        res.redirect('/staff/product/edit-product/' + id);
                    });

                });
            }
        });
    }

});

//POST product's gallery
router.post('/product/product-gallery/:id', isStaff , function(req, res) {
  var productImage = req.files.file;
  var id = req.params.id;
  var path = 'public/product_images/' + id + '/gallery/' + req.files.file.name;
  var thumbPath = 'public/product_images/' + id + '/gallery/thumbs/' + req.files.file.name;

  productImage.mv(path, function(err) {
    if (err) console.log(err)
    resizeImg(fs.readFileSync(path), {
      width: 100,
      height: 100
    }).then(function(buf) {
      fs.writeFileSync(thumbPath, buf);
    })
  });
  res.sendStatus(200);
})

//POST Update delivery status of orders
router.post('/orders/deliveryStatus', isStaff ,function(req,res){
  Order.updateOne({_id: req.body.orderId}, {deliveryStatus: req.body.deliveryStatus}, function(err){
    if(err) {console.log(err)}
    else{
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderUpdated', {id:req.body.orderId, deliveryStatus: req.body.deliveryStatus})
      res.redirect('back')
      // console.log(req.body.link)
      // console.log(decodeURIComponent(req.body.link))
    }
  })
})

//POST Update paymentStatus of orders
router.post('/orders/paymentStatus',function(req,res){
  Order.updateOne({_id: req.body.orderId}, {paymentStatus: req.body.paymentStatus}, function(err){
    if(err) {console.log(err)}
    else{
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderUpdated', {id:req.body.orderId, paymentStatus: req.body.paymentStatus})
      res.redirect("back")
    }
  })
})

module.exports = router;
