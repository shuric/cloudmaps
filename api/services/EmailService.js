/**
 * isActivated
 *
 * @module      :: Service
 * @description :: Сервис отправки Email
 *
 */
module.exports = {
  sendConfirmationEmail: function(options, done) {
    var nodemailer = require('nodemailer');
    var smtpTransport = require('nodemailer-smtp-transport');
    var transporter = nodemailer.createTransport(smtpTransport({
        host: 'localhost',
        port: 25,
        ignoreTLS: true
      })
    );

    transporter.sendMail(options, function(error, info) {
      done(error);
    });
  }
};
