/**
 * isActivated
 *
 * @module      :: Policy
 * @description :: Политика доступа, проверяет, активирован ли пользователь
 *
 */
module.exports = function isActivated(req, res, next) {
    if (req.session.user.active) {
      return next();
    } else {
      return res.redirect('/reactivate');
    }
};
