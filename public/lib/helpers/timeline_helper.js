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

    TimelineHelper.prototype.pluckLabel = function (hit, params) {
      let label = '';

      if (params.labelFieldSequence) { // in kibi, we have the path property of a field
        label = kibiUtils.getValuesAtPath(hit._source, params.labelFieldSequence);
      } else {
        label = _.get(hit._source, params.labelField);
      }

      if (params.useHighlight) {
        const fragmentCounts = {}; //key is fragment tag, value is count
        Object.keys(hit.highlight).forEach(function (key) {
          hit.highlight[key].forEach(function (it) {
            const fragment = extractFragment(it, '<em>', '</em>');
            if (fragmentCounts[fragment]) {
              fragmentCounts[fragment] = fragmentCounts[fragment] + 1;
            } else {
              fragmentCounts[fragment] = 1;
            }
          });
        });

        let highlighted = '';
        Object.keys(fragmentCounts).sort(function (a, b) {
          //same count, return alphabetic order
          if (fragmentCounts[a] === fragmentCounts[b]) {
            return a > b;
          }

          //return count order
          return fragmentCounts[a] < fragmentCounts[b];

        }).forEach(function (key, index) {
          if (index > 0) highlighted += ', ';
          highlighted += key + ':' + fragmentCounts[key];
        });
        label += '<div style="font-size: small">' + highlighted + '</div>';
      }
      return label;
    };

    function extractFragment(s, openTag, closeTag) {
      const openIndex = s.indexOf(openTag);
      const closeIndex = s.indexOf(closeTag);
      return s.substring(openIndex + openTag.length, closeIndex).toLowerCase().trim();
    }

    return new TimelineHelper();
  };
});
