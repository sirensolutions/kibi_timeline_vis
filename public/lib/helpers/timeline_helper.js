define(function (require) {
  const _ = require('lodash');
  const kibiUtils = require('kibiutils');
  const moment = require('moment-timezone');

  return function TimelineHelperFactory() {
    function TimelineHelper() {
    }

    TimelineHelper.prototype.noEndOrEqual = function (startValue, endValue) {
      return !endValue || startValue === endValue ? true : false;
    };

    TimelineHelper.prototype.createItemTemplate = function (itemDict) {
      let endfield = '';
      let dot = '';
      let hilit = '';
      let label = itemDict.labelValue;

      if (itemDict.endField) {
        endfield = `, endField: ${itemDict.endField}`;
      }
      if (this.noEndOrEqual(itemDict.startValue, itemDict.endValue)) {
        dot = `<div class="kibi-tl-dot-item" style="border-color:${itemDict.groupColor}"></div>`;
        label = `<div class="kibi-tl-label-item">${itemDict.labelValue}</div>`;
      }
      if (itemDict.useHighlight) {
        hilit = `<p class="tiny-txt">${itemDict.highlight}</p>`;
      }

      return `<div title="index: ${itemDict.indexId}, startField: ${itemDict.startField}${endfield}">` +
          `${dot}${label}${hilit}</div>`;
    };

    TimelineHelper.prototype.changeTimezone  = function (timezone) {
      if (timezone !== 'Browser') {
        return moment().tz(timezone).format('Z');
      } else {
        return timezone;
      }
    };

    /**
     * getMultiFieldValue get a field value if the field is a multi-field
     *
     * @param hit the document of the event
     * @param f field name
     * @returns field value
     */
    TimelineHelper.prototype.getMultiFieldValue = function (hit, f) {
      if (hit.fields && hit.fields[f]) {
        const val = hit.fields[f];
        return _.isArray(val) && val.length === 1 ? val[0] : val;
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
      let field;
      let value;

      // in kibi, we have the path property of a field
      if (params.labelFieldSequence && params.labelFieldSequence.length) {
        field = params.labelFieldSequence;
        value = kibiUtils.getValuesAtPath(hit._source, field);
      } else if (params.labelField) {
        field = params.labelField;
        value = kibiUtils.getValuesAtPath(hit._source, params.labelField.split('.'));
      }

      if (!value || !value.length) {
        value = this.getMultiFieldValue(hit, field);
      }

      return value && (!_.isArray(value) || value.length) ? value : 'N/A';
    };

    /**
     * pluckDate returns date field value/raw value
     *
     * @param hit the document of the event
     * @param field to represent params.startField or params.endField
     * @returns date raw value
     */
    TimelineHelper.prototype.pluckDate = function (hit, field) {
      // there is no date string value in _source in case of multi-fields
      return hit.fields[field] || [];
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
     * Creates an Elasticsearch sort object to sort in chronological order on start field
     *
     * @param params group configuraton parameters
     * @returns Elasticsearch sort object
     */
    TimelineHelper.prototype.getSortOnFieldObject = function (field, fieldSequence, orderBy) {
      const sortObj = {};
      if (fieldSequence) {
        sortObj[fieldSequence.join('.')] = { order: orderBy };
      } else {
        sortObj[field] = { order: orderBy };
      }
      return sortObj;
    };

    return new TimelineHelper();
  };
});
