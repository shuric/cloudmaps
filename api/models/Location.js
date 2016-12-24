/**
 * Location.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: 'locations',

  attributes: {
    id: { type: 'integer', primaryKey: true },
    id_user: {
      type: 'integer',
      model: 'user'
    },
    latitude: {type: 'float'},
    longitude: {type: 'float'},
    date_locate: {type: 'datetime'}
  }
};
