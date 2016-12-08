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

    /**
     * pluckLabel returns the label of an event
     *
     * @param hit the document of the event
     * @param params configuration parameters for the event
     * @param notify object for user notification
     * @returns the label as a string
     */
    TimelineHelper.prototype.pluckLabel = function (hit, params, notify) {
      let label = 'N/A';

      let field;
      if (params.labelFieldSequence) { // in kibi, we have the path property of a field
        field = kibiUtils.getValuesAtPath(hit._source, params.labelFieldSequence);
      } else {
        field = _.get(hit._source, params.labelField);
      }
      if (field && (!_.isArray(field) || field.length)) {
        if (this.isMultivalued(field)) {
          notify.warning('Label field [' + params.labelField + '] is multivalued - the first value will be used.');
        }
        label = this.pickFirstIfMultivalued(field, 'N/A');
      }
      return label;
    };

    /**
     * pluckHighlights returns the highlighted terms for the event.
     * The terms are sorted first on the number of occurrences of a term, and then alphabetically.
     *
     * @param hit the event
     * @param highlightTags the tags that wrap the term
     * @returns a comma-separated string of the highlighted terms and their number of occurrences
     */
    TimelineHelper.prototype.pluckHighlights = function (hit, highlightTags) {
      if (!hit.highlight) {
        return '';
      }

      //Track unique highlights, count number of times highlight occurs.
      const counts = new Map(); //key is highlight tag, value is count
      Object.keys(hit.highlight).forEach(function (key) {
        hit.highlight[key].forEach(function (it) {
          const fragment = extractFragment(it, highlightTags.pre, highlightTags.post);
          if (counts.has(fragment)) {
            counts.set(fragment, counts.get(fragment) + 1);
          } else {
            counts.set(fragment, 1);
          }
        });
      });

      return Array.from(counts.keys())
      .sort(function (a, b) {
        //same count, return alphabetic order
        if (counts.get(a) === counts.get(b)) {
          return a > b;
        }
        //return count order
        return counts.get(a) < counts.get(b);
      })
      .map(key => `${key}: ${counts.get(key)}`)
      .join(', ');
    };

    function extractFragment(highlightedElement, openTag, closeTag) {
      const openIndex = highlightedElement.indexOf(openTag);
      const closeIndex = highlightedElement.indexOf(closeTag);
      return highlightedElement.substring(openIndex + openTag.length, closeIndex).toLowerCase().trim();
    }

    /**
     * Create an Elasticsearch sort object to sort in chronological order
     *
     * @param params group configuraton parameters
     * @returns Elasticsearch sort object
     */
    TimelineHelper.prototype.sortObj = function (params) {
      const sortObj = {};
      if (params.startFieldSequence) {
        sortObj[params.startFieldSequence.join('.')] = { order: 'asc' };
      } else {
        sortObj[params.startField] = { order: 'asc' };
      }
      return sortObj;
    };

    return new TimelineHelper();
  };
});
