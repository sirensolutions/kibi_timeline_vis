define(function (require) {
  require('./kibi_timeline');
  require('ui/modules');

  const _ = require('lodash');

  const module = require('ui/modules').get('kibi_timeline_vis/kibi_timeline_vis', ['kibana']);
  module.controller(
    'KbnTimelineVisController',
    function (createNotifier, $location, $rootScope, $scope, $route, savedSearches, savedVisualizations, Private, $element, Promise,
              courier, timefilter, indexPatterns) {
      const notify = createNotifier({
        location: 'Kibi Timeline'
      });
      const SearchSource = Private(require('ui/courier/data_source/search_source'));
      const requestQueue = Private(require('./lib/courier/_request_queue_wrapped'));
      const queryFilter = Private(require('ui/filter_bar/query_filter'));
      const timelineHelper = Private(require('./lib/helpers/timeline_helper'));

      $scope.initOptions = function () {
        $scope.options = {
          width: '100%',
          height: '100%',
          selectable: true,
          autoResize: true
        };
      };

      const getGroupParamsHash = function (group) {
        return new Date().getTime();
        let hash = '';
        for (const key in group) {
          if (group.hasOwnProperty(key)) {
            hash += key + group[key];
          }
        }
        return hash;
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
          // delete any searchSource that was previously created
          _.each($scope.visOptions.groups, group => {
            if (group.searchSource) {
              group.searchSource.destroy();
            }
          });

          $scope.visOptions.groups = [];
          let groupsParamsHash = '';
          _.each(savedSearchesRes, function ({ savedSearch, groups }, i) {
            for (const group of groups) {
              groupsParamsHash += getGroupParamsHash(group);
              const _id = `_kibi_timetable_ids_source_flag${group.id}${savedSearch.id}`; // used only by kibi
              requestQueue.markAllRequestsWithSourceIdAsInactive(_id); // used only by kibi

              const searchSource = new SearchSource();

              searchSource.inherits(savedSearch.searchSource);
              searchSource._id = _id;
              searchSource.index(savedSearch.searchSource._state.index);
              searchSource.size(group.size || 100);
              searchSource.source(_.compact([ group.labelField, group.startField, group.endField ]));
              searchSource.set('filter', queryFilter.getFilters());
              // Add fielddata_fields to get data from multifield of type string
              searchSource._state.fielddata_fields = _.compact([ group.labelField ]);

              $scope.visOptions.groups.push({
                id: group.id,
                color: group.color,
                label: group.groupLabel,
                searchSource: searchSource,
                params: {
                  //kibi params
                  labelFieldSequence: timelineHelper.isMultifield(group.labelField) ? [group.labelField]
                    : fields[i].byName[group.labelField].path,
                  startFieldSequence: timelineHelper.isMultifield(group.startField) ? [group.startField]
                    : fields[i].byName[group.startField].path,
                  endFieldSequence: group.endField && (timelineHelper.isMultifield(group.endField)
                    ? [group.endField] : fields[i].byName[group.endField].path) || [],
                  //kibana params
                  labelField: group.labelField,
                  startField: group.startField,
                  endField: group.endField,
                  //params for both
                  useHighlight: group.useHighlight,
                  invertFirstLabelInstance: group.invertFirstLabelInstance
                }
              });
            }
          });
          const visOptionsButGroups = _.omit(savedVis.vis.params, 'groups');
          // adding a hash of group parameters to detect when they changed
          // this is needed as we are ommiting search sources when watching changes to
          // visOptions. We can not watch changes to searchSources directly
          // as this triggers the infinite loop in the watcher inside kibi_timeline directive)
          visOptionsButGroups.hash = groupsParamsHash;
          _.assign($scope.visOptions, visOptionsButGroups);
        })
        .catch(notify.error);
      };

      $scope.visOptions = {
        groups: []
      };
      // Set to true in editing mode
      const configMode = $location.path().indexOf('/visualize/') !== -1;

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
      $scope.$watch('esResponse', function (resp) {
        if (resp) {
          _.each($scope.visOptions.groups, group => {
            group.searchSource.fetchQueued();
          });
        }
      });

      // It is necessary to listen to those two events because the timeline visualization does not have
      // requiresSearch set to true since it needs more that one search.

      // on kibi, the editors.js file is updated to support requiresMultiSearch so that a courier.fetch call is executed
      const chrome = require('ui/chrome');
      const isKibi = chrome.getAppTitle() === 'Kibi';

      // update the searchSource when filters update
      $scope.$listen(queryFilter, 'update', function () {
        _.each($scope.visOptions.groups, group => group.searchSource.set('filter', queryFilter.getFilters()));
        if (!isKibi) {
          courier.fetch();
        }
      });
      // fetch when the time changes
      $scope.$listen(timefilter, 'fetch', () => {
        _.each($scope.visOptions.groups, group => {
          group.searchSource.fetchQueued();
        });
        if (!isKibi) {
          courier.fetch();
        }
      });

      if (configMode) {
        const removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
          $scope.initOptions();
          $scope.initSearchSources($scope.savedVis);
        });

        $scope.$on('$destroy', function () {
          removeVisStateChangedHandler();
        });
      }
    });
});
