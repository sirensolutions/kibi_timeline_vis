import chrome from 'ui/chrome';
import _ from 'lodash';

export default function KibiSelectHelperFactory(config, indexPatterns, savedSearches, $injector) {
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

      let defaultIndexPattern;
      if (indexPatternId) {
        defaultIndexPattern = indexPatterns.get(indexPatternId);
      } else {
        if ($injector.has('kibiDefaultIndexPattern')) {
          // kibi
          defaultIndexPattern = $injector.get('kibiDefaultIndexPattern').getDefaultIndexPattern();
        } else {
          // kibana
          defaultIndexPattern = indexPatterns.get(config.get('defaultIndex'));
        }
      }

      return defaultIndexPattern.then(function (index) {
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
