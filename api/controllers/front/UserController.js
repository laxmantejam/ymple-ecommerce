/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var bcrypt = require('bcrypt');

module.exports = {
    profile: function (req, res) {
        var result = {};
        var skip = 0;
        var page = 1;

        if (req.query.hasOwnProperty('page')) {
            skip = (req.query.page - 1) * 10;
            page = req.query.page;
        }

        var queryOptions = {
            where: {},
            skip: skip,
            limit: 10,
            sort: 'createdAt DESC'
        };

        result.page = page;

        result.order = {};


        // we check if the session id user is set.


        if (req.session.user && req.session.user.id) {
        }
        else {


            // if not set we go to the login page


            return res.redirect('/login');

        }


        async.waterfall([
            function GetTotalCount(next) {


                Order.count({owner: req.session.user.id}, function (err, num) {
                    if (err) return next(err);

                    result.pages = [];

                    for (var i = 0, count = parseInt(num / queryOptions.limit); i <= count; i++) {
                        result.pages.push(i + 1);
                    }

                    return next(null);
                });
            },

            function GetUserAndOrders(next) {

                console.info('user id ', req.session.user.id);


                User.findOne(req.session.user.id).populate('orders', queryOptions).exec(function (err, user) {
                    if (err) return next(err);
                    if (!user) return next('NO_USER_FOUND');

                    result.user = user;
                    result.cart = req.session.cart;
                    result.orders = user.orders;

                    return next(null);
                });
            }
        ], function (err) {
            if (err) return res.serverError(err);

            return res.view('front/profile/profile.ejs', result);
        });
    },

    signup: function (req, res) {


        var data = {};

        //data = req;

        data.password = 'f';
        data.name = 'f';
        data.email = 'f@gmail.com';


        if (req.body.name && req.body.email && req.body.password) {


            CoreFrontInsertDbService.startCreateUserFront(req);

            console.log('UserController.js - step 1 subscription done');


            //  if (err) return next(err);

            return res.redirect('/');
        }
        else {

            return res.redirect('/login');

        }

        //  });


        // User.create(req.body, function (err, user) {
        // if (err) return next(err);

        // return res.redirect('/');


    },

    update: function (req, res) {
        delete req.body.email;

        console.log(req.body);

        User.update(req.params.id, req.body, function (err, user) {
            if (err) return res.serverError(err);

            return res.redirect('/profile');
        });
    },

    login: function (req, res) {
        async.waterfall([
            function GetUser(next) {
                User.findOne({'email': req.body.email}).exec(function (err, user) {
                    if (err) return next(err);

                    return next(null, user);
                });
            },

            function Validate(user, next) {


                if (user && user.password) {

                    bcrypt.compare(req.body.password, user.password, function (err, isSuccess) {
                        if (err) return next(err);

                        if (isSuccess) {
                            req.session.authenticated = true;
                            req.session.user = user;
                        }
                        else { // login view with error message
                            var dataView = [];
                            dataView.message = 'user or password not correct';
                            return res.view('front/login.ejs', dataView);

//              return res.redirect('/login?error_login');
                        }

                        return next(null, isSuccess);
                    });
                }
            }
        ], function (err, isSuccess) {
            if (err) return res.serverError(err);
            if (!isSuccess) {
                return res.serverError('Or permission. The password is different.');
            }
            else {
                return res.redirect('/');
            }


        });
    },

    reset: function (req, res) {
        async.waterfall([
            function GetUser(next) {
                User.findOne({'email': req.body.email}).exec(function (err, user) {
                    if (err) return next(err);

                    return next(null, user);
                });
            },

            function GenSalt(user, next) {
                bcrypt.genSalt(10, function (err, salt) {
                    if (err) return next(err);

                    return next(null, user, salt);
                });
            },

            function Encrypt(user, salt, next) {
                var randomPassword = randomString(10);

                bcrypt.hash(randomPassword, salt, function (err, hash) {
                    if (err) return next(err);

                    user.update({password: hash}, function (err, updatedUser) {
                        updatedUser.newPassword = randomPassword;

                        return next(null, updatedUser);
                    });
                });
            },
        ], function (err, updatedUser) {
            // 수정이 필요함 - 미완성
            if (err) return res.serverError(err);
            if (!updatedUser.newPassword) return res.serverError();

            return res.return(updatedUser);
        });
    },

    logout: function (req, res) {
        req.session.authenticated = false;
        req.session.user = undefined;

        return res.redirect('/');
    },
};

function randomString(length, chars) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';

    for (var i = length; i > 0; --i) {
        result += chars[Math.round(Math.random() * (chars.length - 1))];
    }

    return result;
}