define(function (require) {

  var vis = require('vis');
  var moment = require('moment');

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

    TimelineHelper.prototype.changeTimezone  = function (timezone) {
      if (timezone !== 'Browser') {
        return moment().tz(timezone).format('Z');
      } else {
        return timezone;
      }
    };

    return new TimelineHelper();
  };
});
