/**
 * MessageController
 *
 * @description :: Server-side logic for managing messages
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  messanger: function(req, res) {
    var criteria;

    if (('id' in req.params) && (req.param('id') !== undefined)) {
      criteria = {id: req.param('id')};
    } else if ('username' in req.params) {
      criteria = {username: req.param('username')};
    }

    User.findOne(req.session.user.id).exec(function(error, user) {
      if (error){
        res.view('user/error', {message: 'Ошибка: ' + error.message});
      } else{
        if (!user) {
          return res.notFound();
        }

        if (criteria) {
          User.findOne(criteria).exec(function(error, friend) {
            if (error){
              res.view('user/error', {message: 'Ошибка: ' + error.message});
            } else{
              if (!friend) {
                return res.notFound();
              }

              Friend.count({id_user: req.session.user.id, id_friend: friend.id})
                .exec(function(error, count) {
                  if (error){
                    res.view('user/error', {message: 'Ошибка: ' + error.message});
                  } else {
                    if (count) {
                      res.view({
                        friend_id: friend.id,
                        user: _.omit(user, ['password', 'unread_messages_count'])
                      });
                    } else {
                      if (user.id == req.session.user.id)
                        return res.redirect('/messanger');
                      else
                        res.view('user/error', {message: 'Вы можете отправлять сообщения только друзьям'});
                    }
                  }
              });
            }
          });
        } else {
          res.view({
            friend_id: 0,
            user: _.omit(user, ['password', 'unread_messages_count'])
          });
        }
      }
    });
  },

  friends: function(req, res) {
    if (req.xhr) {
      switch (req.method) {
        case 'GET':
          Friend.find({
            id_user: req.session.user.id
          }, {
            sort: 'id_last_message DESC'
          }).populate('id_friend').populate('id_last_message').exec(function(error, contacts) {
            if(error)
              return res.negotiate(error);
            else{
              return res.view({contacts: contacts});
            }
          });

          break;
      }
    }
  },

  messages: function(req, res) {
    if (req.xhr) {
      switch (req.method) {
        case 'GET':
          var friend_id = parseInt(req.param('friend_id', 0));

          if (friend_id) {
            User.findOne(friend_id).exec(function(error, friend) {
              if (error)
                return res.negotiate(error);
              else {
                if (friend) {
                  Message.find({
                    or: [
                      {id_user: req.session.user.id, id_friend: friend_id},
                      {id_user: friend_id, id_friend: req.session.user.id}
                    ]
                  }, {
                    sort: 'id DESC',
                    limit: 5
                  }).exec(function(error, messages) {
                    if (error)
                      return res.negotiate(error);
                    else{
                      return res.view({friend: friend, messages: messages.reverse()});
                    }
                  });
                } else {
                  return res.badRequest();
                }
              }
            });
          } else {
            return res.badRequest();
          }

          break;
        case 'PUT':
          var friend_id = parseInt(req.param('friend_id', 0));
          var message = _.trim(req.param('message', ''));

          if (friend_id && message.length) {
            User.findOne(friend_id).exec(function(error, user){
              if (error)
                return res.negotiate(error);
              else {
                Friend.findOne({
                  id_user: friend_id,
                  id_friend: req.session.user.id
                }).exec(function(error, friend){
                  if (error)
                    return res.negotiate(error);
                  else {
                    if (friend) {
                      Message.create({
                        id_user: req.session.user.id,
                        id_friend: friend_id,
                        unread: true,
                        message: message
                      }).exec(function(error, message){
                        if (error)
                          return res.negotiate(error);
                        else {
                          var message_date = new sails.moment(message.date_create);

                          message.date_create = message_date.format('YYYY-MM-DD HH:mm:ss');
                          friend.id_last_message = message.id;
                          friend.unread_messages_count += 1;
                          user.unread_messages_count += 1;
                          friend.save();
                          user.save();

                          Friend.update({
                            id_user: req.session.user.id,
                            id_friend: friend_id
                          }, {
                            id_last_message: message.id
                          }).exec(function(error, contact){
                            if (error)
                              return res.negotiate(error);
                          });

                          User.message(friend_id, {
                            unread_messages_count: user.unread_messages_count,
                            friend: {
                              id_friend: req.session.user.id,
                              unread_messages_count: friend.unread_messages_count
                            },
                            message: message
                          });

                          return res.send({
                            success: true,
                            data: {
                              message: message
                            }
                          });
                        }
                      });
                    } else {
                      return res.badRequest();
                    }
                  }
                });
              }
            });
          } else {
            return res.badRequest();
          }

          break;
          default:
            return res.badRequest();
      }
    } else {
      return res.badRequest();
    }
  },
  unread: function(req, res){
    if (req.xhr) {
      switch (req.method) {
        case 'PUT':
          var friend_id = parseInt(req.param('friend_id', 0));

          if (friend_id) {
            User.findOne(req.session.user.id).exec(function(error, user){
              if (error)
                return res.negotiate(error);
              else {
                Friend.findOne({
                  id_user: req.session.user.id,
                  id_friend: friend_id
                }).exec(function(error, friend){
                  if (error)
                    return res.negotiate(error);
                  else {
                    if (friend) {
                      Message.update(req.session.user.id, {
                        unread: false
                      }).exec(function(error, message){
                        if (error)
                          return res.negotiate(error);
                        else {
                          user.unread_messages_count = user.unread_messages_count - friend.unread_messages_count;

                          if (user.unread_messages_count < 0)
                            user.unread_messages_count = 0;

                          friend.unread_messages_count = 0;

                          friend.save();
                          user.save();

                          return res.send({
                            success: true,
                            data: {
                              unread_messages_count: user.unread_messages_count,
                              friend: {
                                id_friend: friend_id,
                                unread_messages_count: friend.unread_messages_count
                              }
                            }
                          });
                        }
                      });
                    } else {
                      return res.badRequest();
                    }
                  }
                });
              }
            });
          } else {
            return res.badRequest();
          }

          break;
          default:
            return res.badRequest();
      }
    }
  }
};
