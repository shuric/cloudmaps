var Utils = {
  isArray: function(value){
    return (typeof value == 'object') && (value instanceof Array);
  },
  isFunction: function(value){
    return (typeof value == 'function');
  },
  escapeHtml: function(html){
    return $("<div>").text(html).html();
  }
};
