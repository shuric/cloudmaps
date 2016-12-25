var Message = {
  friends: function(callback){
    $.ajax({
      url: '/message/friends',
      method: 'GET'
    }).done(function(response){
      if (Utils.isFunction(callback))
        callback(response);
    });
  },
  messages: function(data, callback){
    data = data || {};

    $.ajax({
      url: '/message/messages',
      method: 'GET',
      data: data
    }).done(function(response){
      if (Utils.isFunction(callback))
        callback(response);
    });
  },
  send: function(data, callback){
    data = data || {};

    $.ajax({
      url: '/message/messages',
      method: 'PUT',
      data: data
    }).done(function(response){
      if (Utils.isFunction(callback))
        callback(response);
    });
  },
  unread: function(data, callback){
    data = data || {};

    $.ajax({
      url: '/message/unread',
      method: 'PUT',
      data: data
    }).done(function(response){
      if (Utils.isFunction(callback))
        callback(response);
    });
  }
};
