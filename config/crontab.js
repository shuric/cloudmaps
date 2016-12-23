module.exports.crontab = {
  crontabs: function() {
    var jsonArray = [];

    jsonArray.push({interval: '*/5 * * * * * ', method: 'setOffline'});

    return jsonArray;
  },

  setOffline: function() {
    require('../crontab/setOffline.js').run();
  }
};
