exports.isUser = function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
    }
}

exports.isAdmin = function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "admin") {
        next();
    } else {
      req.logout();
      res.redirect('/login');
    }
}

exports.isStaff = function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "staff") {
        next();
    } else {
      req.logout();
      res.redirect('/login');
    }
}
