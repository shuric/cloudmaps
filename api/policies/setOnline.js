/**
 * setOnline
 *
 * @module      :: Policy
 * @description :: Отслеживает активность пользователя
 *
 */
module.exports = function setOnline(req, res, next) {
    var current_date = new Date();

    User.update(req.session.user.id, {
      online: true,
      date_last_online: current_date
    }).exec(function(error, updated) {
      if (error) {
        console.log(error);
      } else {
        if (!updated[0].online) {
          req.session.user.online = true;
          req.session.user.date_last_online = current_date;

          sails.sockets.blast('user_status', {
            id: req.session.user.id,
            online: true
          });
        }
      }
    });

    return next();
};
