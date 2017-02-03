import ColorProvider from 'ui/vis/components/color/color';
// === ported kibi directives ===
import './lib/directives/array_param';
import './lib/directives/kibi_select';
// === ported kibi directives ===
import _ from 'lodash';
import vis from 'vis';
import uiModules from 'ui/modules';
import template from 'plugins/kibi_timeline_vis/kibi_timeline_vis_params.html';

function controller($rootScope, savedSearches, Private) {
  const color = Private(ColorProvider);

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

      $scope.$watch('vis.params.groups', function (groups) {

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
            savedSearches.get(group.savedSearchId)
            .then(function (savedSearch) {
              if (!group.groupLabel) {
                group.groupLabel = savedSearch.title;
              }
              group.indexPatternId = savedSearch.searchSource._state.index.id;
            });
          }
        });
        // 0 should always be there in case user switch to mixed mode
        const mapGroupIdToColor = color([0].concat(_.map($scope.vis.params.groups, 'id')));
        _.each($scope.vis.params.groups, function (group) {
          group.color = mapGroupIdToColor(group.id);
        });
      }, true);
    }
  };
}

uiModules
.get('kibi_timeline_vis/kibi_timeline_vis')
.directive('kibiTimelineVisParams', controller);
