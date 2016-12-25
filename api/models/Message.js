/**
 * Message.js
 *
 * @description :: Сообщения пользователей
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: 'messages',

  attributes: {
    id: {type: 'integer', primaryKey: true},
    id_user: {type: 'integer'},
    id_friend: {type: 'integer'},
    unread: {type: 'boolean'},
    message: {type: 'text'},
    date_create: {type: 'datetime'}
  }
};
