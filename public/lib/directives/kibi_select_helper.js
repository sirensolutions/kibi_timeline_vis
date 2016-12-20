define(function (require) {

  const chrome = require('ui/chrome');

  return function KibiSelectHelperFactory(
    config, $http, courier, indexPatterns, timefilter, Private, Promise, kbnIndex
    ) {

    function KibiSelectHelper() {
    }

    const _ = require('lodash');

    const searchRequest = function (type) {
      return $http.get(chrome.getBasePath() + '/elasticsearch/' + kbnIndex + '/' + type + '/_search?size=100');
    };

    KibiSelectHelper.prototype.getObjects = function (type) {
      return searchRequest(type).then(function (objects) {
        if (objects.data.hits && objects.data.hits.hits) {
          const items = _.map(objects.data.hits.hits, function (hit) {
            return {
              label: hit._source.title,
              value: hit._id
            };
          });
          return items;
        }
      });
    };


    KibiSelectHelper.prototype.getFields = function (indexPatternId, fieldTypes) {
      let defId;
      if (indexPatternId) {
        defId = indexPatternId;
      } else {
        defId = config.get('defaultIndex');
      }

      return indexPatterns.get(defId).then(function (index) {
        const fields = _.chain(index.fields)
        .filter(function (field) {
          // filter some fields
          if (fieldTypes instanceof Array && fieldTypes.length > 0) {
            return fieldTypes.indexOf(field.type) !== -1 && field.name && field.name.indexOf('_') !== 0;
          } else {
            return field.type !== 'boolean' && field.name && field.name.indexOf('_') !== 0;
          }
        }).sortBy(function (field) {
          return field.name;
        }).map(function (field) {
          return {
            label: field.name,
            value: field.name,
            options: {
              analyzed: field.analyzed
            }
          };
        }).value();
        return fields;
      });
    };

    return new KibiSelectHelper();
  };
});
