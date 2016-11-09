define(function (require) {
  require('./kibi_timeline');
  require('ui/modules');

  var _ = require('lodash');

  var module = require('ui/modules').get('kibi_timeline_vis/kibi_timeline_vis', ['kibana']);
  module.controller(
    'KbnTimelineVisController',
    function (createNotifier, $location, $rootScope, $scope, $route, savedSearches, savedVisualizations, Private, $element, Promise,
              indexPatterns) {
      var notify = createNotifier({
        location: 'Kibi Timeline'
      });
      var SearchSource = Private(require('ui/courier/data_source/search_source'));
      var requestQueue = Private(require('./lib/courier/_request_queue_wrapped'));

      $scope.initOptions = function () {
        var height = $element[0].offsetHeight;
        // make sure that it is never too small
        // as the height might be reported wrongly when element is not yet fully rendered
        if (height >= 20) {
          height -= 20;
        }
        if (height < 175) {
          height = 175;
        }
        var options = {
          width: '100%',
          height: height + 'px',
          selectable: true,
          // ! does not work correctly inside the panel
          // instead we would have to calculate the proper height on panel resize and change it
          // on change timeline directive should call redraw()
          autoResize: false
        };
        $scope.options = options;
      };

      $scope.initSearchSources = function (savedVis) {
        const getSavedSearches = Promise.all(
          _(savedVis.vis.params.groups)
          .filter(group => group.savedSearchId)
          .groupBy('savedSearchId')
          .map((groups, savedSearchId) => {
            return savedSearches.get(savedSearchId)
            .then(savedSearch => {
              return { savedSearch, groups };
            });
          })
          .value()
        );

        const fields = getSavedSearches.then(results => {
          return Promise.all(_.map(results, res => {
            return indexPatterns.get(res.savedSearch.searchSource._state.index.id)
            .then(indexPattern => indexPattern.fields);
          }));
        });

        return Promise.all([ getSavedSearches, fields ])
        .then(function ([ savedSearchesRes, fields ]) {
          $scope.savedObj.groups = [];
          _.each(savedSearchesRes, function ({ savedSearch, groups }, i) {
            for (let group of groups) {
              var _id = `_kibi_timetable_ids_source_flag${group.id}${savedSearch.id}`; // used only by kibi
              requestQueue.markAllRequestsWithSourceIdAsInactive(_id); // used only by kibi

              const searchSource = new SearchSource();

              searchSource.inherits(savedSearch.searchSource);
              searchSource._id = _id;
              searchSource.index(savedSearch.searchSource._state.index);
              searchSource.size(group.size || 100);
              searchSource.source(_.compact([ group.labelField, group.startField, group.endField ]));

              $scope.savedObj.groups.push({
                id: group.id,
                color: group.color,
                label: group.groupLabel,
                searchSource: searchSource,
                params: {
                  labelFieldSequence: fields[i].byName[group.labelField].path,
                  startFieldSequence: fields[i].byName[group.startField].path,
                  endFieldSequence: group.endField && fields[i].byName[group.endField].path || [],

                  labelField: group.labelField,
                  startField: group.startField,
                  endField: group.endField
                }
              });
            }
          });

          $scope.savedObj.groupsOnSeparateLevels = savedVis.vis.params.groupsOnSeparateLevels;
        })
        .catch(notify.error);
      };

      $scope.savedObj = {
        groups: []
      };
      // Set to true in editing mode
      var configMode = $location.path().indexOf('/visualize/') !== -1;

      $scope.savedVis = $route.current.locals.savedVis;
      if (!$scope.savedVis) {
        // NOTE: reloading the visualization to get the searchSource,
        // which would otherwise be unavailable by design
        if ($scope.vis.id) {
          savedVisualizations.get($scope.vis.id).then(function (savedVis) {
            $scope.vis = savedVis.vis;
            $scope.savedVis = savedVis;
          }).catch(notify.error);
        } else {
          savedVisualizations.find($scope.vis.title).then(function (results) {
            const vis = _.find(results.hits, function (hit) {
              return hit.title === $scope.vis.title;
            });
            if (!vis) {
              notify.error('Unable to find visualization with title == "' + $scope.vis.title + '"');
              return;
            }
            return savedVisualizations.get(vis.id).then(function (savedVis) {
              $scope.vis = savedVis.vis;
              $scope.vis.id = vis.id;
              $scope.savedVis = savedVis;
            });
          }).catch(notify.error);
        }
      }

      $scope.$on('change:vis', function () {
        $scope.initOptions();
      });

      $scope.$watch('savedVis', function () {
        if ($scope.savedVis) {
          $scope.initOptions();
          $scope.initSearchSources($scope.savedVis);
        }
      });

      // used also in autorefresh mode
      $scope.$watch('esResponse', function () {
        if ($scope.savedObj && $scope.savedObj.searchSources) {
          _.each($scope.savedObj.searchSources, function (ss) {
            ss.fetchQueued();
          });
        }
      });

      if (configMode) {
        var removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
          $scope.initOptions();
          $scope.initSearchSources($scope.savedVis);
        });

        $scope.$on('$destroy', function () {
          removeVisStateChangedHandler();
        });
      }

    });
});

