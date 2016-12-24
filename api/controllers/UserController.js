/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var crypto = require('crypto');

module.exports = {
  register: function(req, res){
    if(req.method == 'POST'){
      var model = req.allParams();
      model.password = crypto.createHash('sha256').update(model.password).digest('hex');
      delete model.id;
      User.create(model, function(error, data){
        if(error){
          res.view('user/error', {message: 'При регистрации пользователя произошла ошибка: ' + error.message});
        }
        else{
          var mailOptions ={
            from: 'test@cloudmaps.ru' ,
            to: model.email,
            subject: 'User Activation Email',
            text: 'http://localhost:1337/user/register/?id='+data.id+'&t='+model.password
          };

          EmailService.sendConfirmationEmail(mailOptions, function(error, info) {
            if(error){
              res.view('user/error', {message: 'При отправке письма произошла ошибка: ' + error.message});
            }
            else res.view('user/after_register');
          });
        }
      });
    }
    else if(req.method == 'GET'){
      if(req.param('id') && req.param('t')){
        var id = parseInt(req.param('id')),
            token = req.param('t');
        User.findOne(id).exec(function(error,user){
          if(error){
            res.view('user/error',{message: 'При активации пользователя произошла ошибка: ' + error.message});
          }
          else{
            if(user.password == token){
              User.update(id, {active: true}).exec(function(error){
                if(error){
                  res.view('user/error',{message: 'При активации пользователя произошла ошибка: ' + error.message});
                }
                else{
                  if (req.session.user)
                    req.session.user.active = true;

                  res.redirect('/login');
                }
              });
            }
            else{
              res.view('user/error',{message: 'При активации пользователя произошла ошибка: неверный ключ активации'});
            }
          }
        });
      }
      else{
        res.view();
      }
    }
  },

  reactivate: function(req, res) {
    var user = req.session.user;

    if (user) {
      if (req.param('reactivate')) {
        var mailOptions ={
          from: 'test@cloudmaps.ru' ,
          to: user.email,
          subject: 'User Activation Email',
          text: 'http://localhost:1337/user/register/?id='+user.id+'&t='+user.password
        };

        EmailService.sendConfirmationEmail(mailOptions, function(error, info) {
          if (error) {
            res.view('user/error', {message: 'При отправке письма произошла ошибка: ' + error.message});
          }
          else res.view('user/after_register');
        });
      } else {
        res.view('user/reactivate');
      }
    } else {
      res.redirect('/login');
    }
  },

  login: function(req, res){
    if(req.method == 'POST'){
      User.findOne({username: req.param('username')}).exec(function(error, user){
        if(error){
          res.view('user/error', {message: 'При проверке логина и пароля произошла ошибка: ' + error.message});
        }
        else{
          if (user && (user.password == crypto.createHash('sha256').update(req.param('password')).digest('hex'))) {
            user.online = true;
            user.date_last_online = new Date();
            user.save();

            req.session.user = user;
            req.session.authenticated = true;

            sails.sockets.blast('user_status', {
              id: req.session.user.id,
              online: true
            });

            return res.redirect('/user/profile/'+user.id);
          }
          else{
            res.view('user/error',{message: 'Неверный логин или пароль'});
          }
        }
      });
    }
    else{
      if(typeof req.session.user == 'undefined'){
        return res.view();
      }
      else{
        return res.redirect('/user/profile/'+req.session.user.id);
      }
    }
  },

  profile: function(req, res) {
    var criteria = {};

    if (('id' in req.params) && (req.param('id') !== undefined)) {
      criteria = {id: req.param('id')};
    } else if ('username' in req.params) {
      criteria = {username: req.param('username')};
    } else {
      return res.redirect('/user/profile/' + req.session.user.id);
    }

    User.findOne(criteria).exec(function(error, user) {
      if (error){
        res.view('user/error', {message: 'Ошибка: ' + error.message});
      } else{
        if (!user) {
          return res.notFound();
        }

        if (user.id == req.session.user.id) {
          res.view('user/profile_owner', {
            user: _.omit(user, 'password')
          });
        } else {
          Friend.count({id_user: user.id, id_friend: req.session.user.id})
            .exec(function(error, count) {
              if (error){
                res.view('user/error', {message: 'Ошибка: ' + error.message});
              } else {
                if (count) {
                  res.view('user/profile_friend', {
                    user: _.omit(user, 'password')
                  });
                } else {
                  res.view('user/error', {message: 'Вы можете просматривать только профили пользователей, которые добавили Вас в друзья'});
                }
              }
          });
        }
      }
    });
  },

  friends: function(req, res){
    if(req.xhr){
      switch(req.method){
        case 'GET':
          var user_id = parseInt(req.param('id', 0));
          User.findOne(user_id).populate('friends').exec(function(error, user) {
            if(error)
              return res.negotiate(error);
            else {
              var friend_ids = _.map(user.friends, function(friend){return friend.id_friend;});
              User.find(friend_ids).exec(function(error, friends){
                if(error)
                  return res.negotiate(error);
                else{
                  return res.view({owner: user_id == req.session.user.id, friends: friends});
                }
              });
            }
          });
          break;
        case 'DELETE':
          var id = parseInt(req.param('id'));
          Friend.destroy({
            id_user: [id, req.session.user.id],
            id_friend: [id, req.session.user.id]
          }).exec(function(error){
            if(error){
              return res.negotiate(error);
            }
            else{
              sails.sockets.blast('delete_friend',{
                id_user: req.session.user.id,
                id_friend: id
              });
              return res.ok();
            }
          });
          break;
        default:
          return res.badRequest();
      }
    }
    else{
      return res.badRequest();
    }
  },

  requests: function(req, res){
    if(req.xhr){
      switch(req.method){
        case 'GET':
          Request.find({
            id_requested: parseInt(req.param('id', 0))
          }).populate('id_requesting').exec(function(error, requests){
            if(error){
              return res.negotiate(error);
            }
            else {
              return res.view({requests: _.map(requests, function(request){return request.id_requesting;})});
            }
          });
          break;
        case 'PUT':
          Friend.create([{
            id_user: req.session.user.id,
            id_friend: parseInt(req.param('id'))
          },{
            id_friend: req.session.user.id,
            id_user: parseInt(req.param('id'))
          }]).exec(function(error, data){
            if(error)
              return res.negotiate(error);
            else{
              Friend.publishCreate(data[0], req);
              Request.destroy({
                id_requesting: parseInt(req.param('id')),
                id_requested: req.session.user.id
              }).exec(function(error){
                if(error)
                  return res.negotiate(error);
                else{
                  return res.ok();
                }
              });
            }
          });
          break;
        case 'DELETE':
          Request.destroy({
            id_requesting: parseInt(req.param('id')),
            id_requested: req.session.user.id
          }).exec(function(error){
            if(error)
              return res.negotiate(error);
            else{
              return res.ok();
            }
          });
          break;
        default:
          return res.badRequest();
      }
    }
    else{
      return res.badRequest();
    }
  },

  avatar: function(req, res) {
    var fs = require('fs');
    var avatar_dir = sails.config.rootPath + '/avatars/';

    if ('image' in req.params) {
      avatar_dir += 'thumbnails/';
    }

    if (req.method == 'GET') {
      var avatar = avatar_dir + req.param('id') + '.jpg';

      fs.stat(avatar, function(error, stats){
        if(error){
          return res.sendfile(avatar_dir + 'default-avatar.jpg');
        }
        else if(stats.isFile()){
          return res.sendfile(avatar);
        }
        else{
          return res.notFound();
        }
      });
    }
    else if(req.method == 'POST') {
      req.file('file').upload({}, function(error, files){
        if(error)
          return res.negotiate(error);
        else{
          fs.rename(files[0].fd, avatar_dir+req.session.user.id+'.jpg', function(error){
            if(error)
              return res.negotiate(error);
            else
              return res.ok();
          });
        }

      });
    }
  },

  logout: function(req, res){
    if (req.session.user) {
      var user_id = req.session.user.id;

      User.update(user_id, {
        online: false,
        date_last_online: new Date()
      }).exec(function(error, updated) {
        if (error) {
          return res.negotiate(error);
        } else {
          sails.sockets.blast('user_status', {
            id: user_id,
            online: false
          });
        }
      });
    }

    delete req.session.user;

    return res.redirect('/');
  },

  list: function(req, res){
    if(req.xhr){
      Friend.find({id_user: req.session.user.id}).exec(function(error, friends){
        if(error)
          return res.negotiate(error);
        else{
          var exclude = _.map(friends, function(friend){return friend.id_friend;});
          Request.find({id_requesting: req.session.user.id}).exec(function(error, requests){
            if(error)
              return res.negotiate(error);
            else{
              exclude = exclude.concat(_.map(requests, function(request){return request.id_requested;}));
              exclude.push(req.session.user.id);
              User.find({id: {'!': exclude}}).exec(function(error, list){
                if(error)
                  return res.negotiate(error);
                else {
                  return res.view({list: list});
                }
              });
            }
          });
        }
      });
    }
    else{
      return res.badRequest();
    }
  },

  subscribe: function(req, res){
    if (req.isSocket && req.session.user) {
      User.findOne(req.session.user.id).populate('friends').exec(function(error, user) {
        if (error)
          return res.serverError(error);
        else {
          // Для обмена личными сообщениями
          User.subscribe(req, user, 'message');

          // Для получения обновлений друзей
          if (user.friends.length) {
            User.subscribe(req, _.pluck(user.friends, 'id'), 'update');
          }
        }
      });

      Request.watch(req);
      Friend.watch(req);
    }
    return res.ok();
  },

  request: function(req, res){
    if(req.xhr){
      var id_requested = req.param('id_requested');

      Request.count({
        id_requesting: req.session.user.id,
        id_requested: id_requested
      }).exec(function(error, count){
        if(error)
          return res.negotiate(error);
        else{
          if(!count){
            Request.create({
              id_requesting: req.session.user.id,
              id_requested: id_requested
            }).exec(function(error, request){
              if(error){
                return res.send({
                  success: false,
                  error: error
                });
              }
              else{
                Request.findOne(request.id).populateAll().exec(function(error, request){
                  request.id_requesting = _.omit(request.id_requesting, 'password');
                  Request.publishCreate(request, req);

                  return res.send({
                    success: true,
                    message: "Заявка успешно отправлена"
                  });
                });
              }
            });
          }
          else{
            return res.send({
              success: true,
              message: "Заявка уже существует"
            });
          }
        }
      });
    }
    else{
      return res.badRequest();
    }
  },

  ping: function(req, res) {
    if (req.xhr) {
      return res.send({
        ping: true
      });
    } else {
      return res.badRequest();
    }
  },

  location: function(req, res) {
    if (req.xhr) {
      var latitude = parseFloat(req.param('latitude'));
      var longitude = parseFloat(req.param('longitude'));
      var located = parseInt(req.param('located')) ? true : false;

      if (located) {
        Location.create({
          id_user: req.session.user.id,
          latitude: latitude,
          longitude: longitude
        }).exec(function(error, data){
          if (error)
            return res.negotiate(error);
          else{
            var location = {
              latitude_last: latitude,
              longitude_last: longitude,
              date_last_locate: new Date(),
              located: true
            };

            User.update(req.session.user.id, location).exec(function(error, updated) {
              if (error) {
                return res.negotiate(error);
              } else {
                User.publishUpdate(updated[0].id, {
                  location: location
                }, req, {
                  previous: {
                    location: {
                      latitude_last: updated[0].latitude_last,
                      longitude_last: updated[0].longitude_last,
                      date_last_locate: updated[0].date_last_locate,
                      located: updated[0].located
                    }
                  }
                });
              }
            });
          }
        });
      } else {
        User.update(req.session.user.id, {
          located: false
        }).exec(function(error, updated) {
          if (error) {
            return res.negotiate(error);
          } else {
            User.publishUpdate(updated[0].id, {
              location: {
                located: false
              }
            }, req, {
              previous: {
                location: {
                  latitude_last: updated[0].latitude_last,
                  longitude_last: updated[0].longitude_last,
                  date_last_locate: updated[0].date_last_locate,
                  located: updated[0].located
                }
              }
            });
          }
        });
      }

      return res.send({
        location: true
      });

    } else {
      return res.badRequest();
    }
  },
};
