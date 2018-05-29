import { VislibComponentsColorColorProvider } from 'ui/vis/components/color/color';
// === ported kibi directives ===
import './lib/directives/array_param';
import './lib/directives/kibi_select';
// === ported kibi directives ===
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from 'plugins/kibi_timeline_vis/kibi_timeline_vis_params.html';

function controller($rootScope, savedSearches, Private, Promise) {
  const color = Private(VislibComponentsColorColorProvider);

  return {
    restrict: 'E',
    template,
    link: function ($scope, $element, attr) {
      // here deal with the parameters
      // Emit an event when state changes
      $scope.$watch('vis.dirty', function () {
        if ($scope.vis.dirty === false) {
          $rootScope.$emit('kibi:vis:state-changed');
        }
      });

      const _pickNextFreeId = function (takenIds) {
        // we start from 5000 to avoid confusion with index
        // index can not be used as user can move elements up and down
        // and if we use index that would affect colors
        if (takenIds.length === 0) {
          return 5000;
        }
        return takenIds[takenIds.length - 1] + 1;
      };

      let savedSearchToIndexPatternMap;
      const init = function () {
        if (savedSearchToIndexPatternMap) {
          return Promise.resolve(savedSearchToIndexPatternMap);
        }
        return savedSearches.find().then(savedSearches => {
          const map = {};
          _.each(savedSearches.hits, hit => {
            try {
              const searchSource = JSON.parse(hit.kibanaSavedObjectMeta.searchSourceJSON);
              map[hit.id] = {
                index: searchSource.index,
                title: hit.title
              };
            } catch (e) {
              // should never happen
            }
          });
          savedSearchToIndexPatternMap = map;
        });
      };

      $scope.$watch('vis.params.groups', function (groups) {
        init().then(() => {
          const existingGroupIds = [];
          _.each($scope.vis.params.groups, function (group) {
            if (group.id) {
              existingGroupIds.push(group.id);
            }
          });
          existingGroupIds.sort();

          _.each($scope.vis.params.groups, function (group) {
            // we need unique ids to manage data series in timeline component
            if (!group.id) {
              group.id = _pickNextFreeId(existingGroupIds);
            }
            if (group.savedSearchId) {
              if (!group.groupLabel) {
                group.groupLabel = savedSearchToIndexPatternMap[group.savedSearchId].title;
              }
              // we use $$ prefix to avoid saving this temporary value into the model
              // Angular strips values prefixed with $$ automatically
              group.$$indexPatternId = savedSearchToIndexPatternMap[group.savedSearchId].index;
              delete group.__new;
            }
          });

          // 0 should always be there in case user switch to mixed mode
          const mapGroupIdToColor = color([0].concat(_.map($scope.vis.params.groups, 'id')));
          _.each($scope.vis.params.groups, function (group) {
            group.color = mapGroupIdToColor(group.id);
          });

        });
      }, true);
    }
  };
}

uiModules
.get('kibi_timeline_vis/kibi_timeline_vis')
.directive('kibiTimelineVisParams', controller);
