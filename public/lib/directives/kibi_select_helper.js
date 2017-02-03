import chrome from 'ui/chrome';
import _ from 'lodash';

export default function KibiSelectHelperFactory(config, indexPatterns, savedSearches) {
  class KibiSelectHelper {
    getObjects(type, filter) {
      return savedSearches.find(filter).then(function (resp) {
        const items = _.map(resp.hits, function (hit) {
          return {
            label: hit.title,
            value: hit.id
          };
        });
        return items;
      });
    }

    getFields(indexPatternId, fieldTypes) {
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
    }
  }

  return new KibiSelectHelper();
};
