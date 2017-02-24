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
     * isMultiField checks if the field is a multi-field
     *
     * @param hit the document of the event
     * @param field name
     * @returns true or false
     */
    TimelineHelper.prototype.isMultiField = function (hit, field) {
      return hit.fields && hit.fields[field] && !hit._source[field];
    };

    /**
     * getMultiFieldValue get a field value if the field is a multi-field
     *
     * @param hit the document of the event
     * @param f field name
     * @param style 'kibi' or 'date'
     * @returns field value
     */
    TimelineHelper.prototype.getMultiFieldValue = function (hit, f, style = false) {
      if (style === 'date') {
        // date field and value are absent in _source
        if (hit.fields[f]) {
          const date = new Date(hit.fields[f][0]);
          const dateString = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
          const timeString = [date.getHours(), date.getMinutes(), date.getMilliseconds()].join(':');
          console.log('------------------------DEBUG-----------------------------');
          console.log(`${dateString} ${timeString}`);
          return `${dateString} ${timeString}`;
        } else {
          return [];
        }
      }

      if (style === 'kibi') {
        // '' if the field value is null
        return !hit.fields || !hit.fields[f] || hit.fields[f][0] === '' ? undefined : hit.fields[f];
      } else {
        return !hit.fields || !hit.fields[f] || hit.fields[f] === '' ? undefined : hit.fields[f];
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
      if (params.labelFieldSequence || this.isMultiField(hit, params.labelField)) {
        field = params.labelFieldSequence;
        value = kibiUtils.getValuesAtPath(hit._source, field);

        if (!value || !value.length) {
          field = !field || !field.length ? params.labelField : field.join('.');
          value = this.getMultiFieldValue(hit, field, 'kibi');
        }
      } else if (params.labelField) {
        field = params.labelField;
        value = _.get(hit._source, field);

        if (!value) {
          value = this.getMultiFieldValue(hit, field);
        }
      }

      return value && (!_.isArray(value) || value.length) ? value : 'N/A';
    };

    /**
     * pluckDate returns date field value/raw value
     *
     * @param hit the document of the event
     * @param field to represent params.startField or params.endField
     * @param fieldSequence to represent params.startFieldSequence or params.endFieldSequence
     * @returns object with two properties: value and raw value
     */
    TimelineHelper.prototype.pluckDate = function (hit, field, fieldSequence) {
      let value = [];

      if (fieldSequence && fieldSequence.length) {
        fieldValue = kibiUtils.getValuesAtPath(hit._source, fieldSequence);
      } else {
        value = _.get(hit._source, field);
      }

      if (value && !value.length) {
        value = this.getMultiFieldValue(hit, field, 'date');
      }

      return {
        value: (value && value.constructor !== Array) ? [ value ] : value,
        raw: hit.fields[field]
      };
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
