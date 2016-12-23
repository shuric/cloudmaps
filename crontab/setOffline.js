/**
 * setOnline
 *
 * @description :: Поскольку пользователь не всегда генерирует событие logout, то
 * необходимо отслеживать таких пользователей и по таймауту принудительно делать их offline.
 * Возьмем таймаут равным 1440 секундам (время жизни сессии по умолчанию)
 *
 */

module.exports = {
  run : function() {
    var offline_date = new Date();

    offline_date.setSeconds(offline_date.getSeconds() - 1440);

    User.update({
      online: true,
      date_last_online: {'<=': offline_date}
    }, {online: false}).exec(function(err, updated) {
      if (err) {
        console.log(err);
      } else {
        if (updated.length) {
          var statuses = [];

          for (var i in updated) {
              statuses.push({
                id: updated[i].id, online: false
              });
          }

          sails.sockets.blast('user_status', statuses);
        }
      }
    });
  }
};
