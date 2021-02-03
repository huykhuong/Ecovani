const express = require("express");
const router = express.Router();
const moment = require("moment");
const path = require("path");
const mkdirp = require("mkdirp");
const fs = require("fs-extra");
const resizeImg = require("resize-img");

//GET CAtegory model
const Category = require("../models/category")
//Get product model
const Product = require("../models/product")
//Get Order model
var Order = require('../models/order');

//GET ROUTES
router.get("/", function(req, res) {
  res.render("adminHome");
})

router.get("/category", function(req, res) {
  Category.find(function(err, categories) {
    if (err) return console.log(err);
    res.render("adminCategory", {
      categories: categories
    })
  })
})

router.get("/category/add-category", function(req, res) {
  var title = "";

  res.render("adminAddCategory", {
    title: title
  });
})

router.get("/category/edit-category/:id", function(req, res) {
  Category.findById(req.params.id, function(err, category) {
    if (err) return console.log(err);

    res.render("adminEditCategory", {
      title: category.title,
      id: category._id
    })
  })
})

router.get("/category/delete-category/:id", function(req, res) {
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
    res.redirect("/admin/category/")
  })
})

//Get all products in admin screen
router.get('/product', function (req, res) {
    Product.find({})
    .exec(function(err,products){
      Product.countDocuments().exec(function (err, c) {
        if(err) console.log(err);
        res.render('adminProduct', {
            products: products,
            count: c
        });
      });
    })
});

router.get("/product/add-product", function(req, res) {
  var title = "";
  var description = "";
  var price = "";

  Category.find(function(err, categories) {
    res.render('adminAddProduct', {
      title: title,
      description: description,
      categories: categories,
      price: price
    })
  })
})

router.get("/product/edit-product/:id", function(req, res) {
  var errors;
  if (req.session.errors) errors = req.session.errors;
  req.session.errors = null;

  Category.find(function(err, categories) {
    Product.findById(req.params.id, function(err, p) {
      if (err) {
        console.log(err);
        res.redirect('adminProduct');
      } else {
        var galleryDir = 'public/product_images/' + p._id + '/gallery';
        var galleryImages = null;

        fs.readdir(galleryDir, function(err, files) {
          if (err) {
            console.log(err);
          } else {
            galleryImages = files;
            res.render('adminEditProduct', {
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

router.get("/product/delete-image/:image", function(req, res) {
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
          res.redirect('/admin/product/edit-product/' + req.query.id);
        }
      })
    }
  })
})

//Delete product
router.get('/delete-product/:id', function(req, res) {

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
      res.redirect('/admin/product');
    }
  });
});

router.get("/orders",function(req,res){
  Order.find({status: {$ne: 'completed'}}, null, {sort:{'createdAt': -1}}).exec(function(err,orders){
  res.render("adminOrderView",{orders: orders, moment: moment})
  })
});

//POST ROUTES

//ADD NEW CATEGORY
router.post("/category/add-category", function(req, res) {
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
    res.render("adminAddCategory", {
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
        res.render("adminAddCategory", {
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
          res.redirect("/admin/category");
        })
      }
    })
  }
})


//EDIT CATEGORY
router.post("/category/edit-category/:id", function(req, res) {
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
    res.render("adminEditCategory", {
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
        res.render("adminEditCategory", {
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
            res.render("adminEditCategory", {
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
router.post("/product/add-product", function(req, res) {
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

  var errors = req.validationErrors();

  if (errors) {
    Category.find(function(err, categories) {
      res.render('adminAddProduct', {
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
          res.render("adminAddProduct", {
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
          slug: slug,
          description: desc,
          price: price2,
          category: category,
          image: imageFile
        });

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
          res.redirect('/admin/product')
        })
      }
    })
  }
});

//POST edit product
router.post('/product/edit-product/:id', function (req, res) {

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
        res.redirect('/admin/product/edit-product/' + id);
    } else {
        Product.findOne({slug: slug, _id: {'$ne': id}}, function (err, p) {
            if (err)
                console.log(err);

            if (p) {
                req.flash('danger', 'Product title exists, choose another.');
                res.redirect('/admin/product/edit-product/' + id);
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
                        res.redirect('/admin/product/edit-product/' + id);
                    });

                });
            }
        });
    }

});

//POST
router.post('/product/product-gallery/:id', function(req, res) {
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
router.post('/orders/deliveryStatus',function(req,res){
  Order.updateOne({_id: req.body.orderId}, {deliveryStatus: req.body.deliveryStatus}, function(err){
    if(err) {console.log(err)}
    else{
      const eventEmitter = req.app.get('eventEmitter')
      eventEmitter.emit('orderUpdated', {id:req.body.orderId, deliveryStatus: req.body.deliveryStatus})
      res.redirect("/admin/orders")
    }
  })
})

module.exports = router;
