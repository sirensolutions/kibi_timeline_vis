define(function (require) {
  return function TimelineHelperFactory() {

    function TimelineHelper() {
    }

    TimelineHelper.prototype.getDescendantPropValue = function (obj, propertyPath) {
      var arr = propertyPath.split('.');
      while (arr.length && (obj = obj[arr.shift()]));
      return obj;
    };

    TimelineHelper.prototype.isMultivalued = function (value) {
      return value instanceof Array;
    };

    TimelineHelper.prototype.pickFirstIfMultivalued  = function (value, defaultValue) {
      if (!value) {
        return defaultValue || '';
      } else {
        if (value instanceof Array && value.length > 0) {
          return value[0];
        } else {
          return value;
        }
      }
    };

    return new TimelineHelper();
  };
});
