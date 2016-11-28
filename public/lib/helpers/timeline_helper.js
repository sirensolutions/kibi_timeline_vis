define(function (require) {
  let _ = require('lodash');
  const kibiUtils = require('kibiutils');
  const moment = require('moment');

  return function TimelineHelperFactory() {
    function TimelineHelper() {
    }

    TimelineHelper.prototype.isMultivalued = function (value) {
      return value instanceof Array && value.length > 1;
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

    TimelineHelper.prototype.pluckLabel = function (hit, params, notify) {
      let label = '';

      let field;
      if (params.labelFieldSequence) { // in kibi, we have the path property of a field
        field = kibiUtils.getValuesAtPath(hit._source, params.labelFieldSequence);
      } else {
        field = _.get(hit._source, params.labelField);
      }
      if (field) {
        if (this.isMultivalued(field)) {
          notify.warning('Label field [' + params.labelField + '] is multivalued - the first value will be used.');
        }
        label = this.pickFirstIfMultivalued(field, '');
      }
      return label;
    };

    TimelineHelper.prototype.pluckHighlights = function (hit, highlightTags) {
      if (!hit.highlight) return '';

      //Track unique highlights, count number of times highlight occurs.
      const counts = {}; //key is highlight tag, value is count
      Object.keys(hit.highlight).forEach(function (key) {
        hit.highlight[key].forEach(function (it) {
          const fragment = extractFragment(it, highlightTags.pre, highlightTags.post);
          if (counts[fragment]) {
            counts[fragment] = counts[fragment] + 1;
          } else {
            counts[fragment] = 1;
          }
        });
      });

      let highlighted = '';
      Object.keys(counts).sort(function (a, b) {
        //same count, return alphabetic order
        if (counts[a] === counts[b]) {
          return a > b;
        }
        //return count order
        return counts[a] < counts[b];
      }).forEach(function (key, index) {
        if (index > 0) highlighted += ', ';
        highlighted += key + ':' + counts[key];
      });
      return highlighted;
    };

    function extractFragment(s, openTag, closeTag) {
      const openIndex = s.indexOf(openTag);
      const closeIndex = s.indexOf(closeTag);
      return s.substring(openIndex + openTag.length, closeIndex).toLowerCase().trim();
    }

    return new TimelineHelper();
  };
});
