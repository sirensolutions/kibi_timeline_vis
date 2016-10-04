define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');
  var buildRangeFilter = require('ui/filter_manager/lib/range');

  require('ui/modules').get('kibana').directive('kibiTimeline', function (Private, createNotifier, courier, es, indexPatterns, config) {

    var requestQueue = Private(require('./lib/courier/_request_queue_wrapped'));
    var timelineHelper = Private(require('./lib/helpers/timeline_helper'));

    var queryFilter = Private(require('ui/filter_bar/query_filter'));

    var notify = createNotifier({
      location: 'Kibi Timeline'
    });

    return {
      scope: {
        groups: '=',
        groupsOnSeparateLevels: '=',
        options: '=',
        selectValue: '=',
        notifyDataErrors: '='
      },
      restrict: 'E',
      replace: true,
      link: _link
    };

    function _link($scope, $element) {
      var timeline;
      var data;

      var onSelect = function (properties) {
        // pass this to a scope variable
        var selected = data._data[properties.items];
        if (selected) {
          if ($scope.selectValue === 'date') {
            if (selected.start && !selected.end) {
              // single point - do query match query filter
              var q1 = {
                query: {
                  match: {}
                },
                meta: {
                  index: selected.index
                }
              };

              q1.query.match[selected.startField.name] = {
                query: selected.start.getTime(),
                type: 'phrase'
              };
              queryFilter.addFilters([q1]);
            } else if (selected.start && selected.end) {
              // range - do 2 range filters
              indexPatterns.get(selected.index).then(function (i) {
                var startF = _.find(i.fields, function (f) {
                  return f.name === selected.startField.name;
                });
                var endF = _.find(i.fields, function (f) {
                  return f.name === selected.endField.name;
                });

                var rangeFilter1 = buildRangeFilter(startF, {
                  gte: selected.startField.value
                }, i);
                rangeFilter1.meta.alias = selected.startField.name + ' >= ' + selected.start;

                var rangeFilter2 = buildRangeFilter(endF, {
                  lte: selected.endField.value
                }, i);
                rangeFilter2.meta.alias = selected.endField.name + ' <= ' + selected.end;

                queryFilter.addFilters([rangeFilter1, rangeFilter2]);
              });
            }
          } else if ($scope.selectValue === 'id') {
            var searchField = undefined;
            for (var i = 0; i < $scope.groups.length; i++) {
              if (selected.groupId === $scope.groups[i].id) {
                searchField = $scope.groups[i].params.labelField;
              }
            }
            var q2 = {
              query: {
                match: {}
              },
              meta: {
                index: selected.index
              }
            };
            q2.query.match[searchField] = {
              query: selected.value,
              type: 'phrase'
            };
            queryFilter.addFilters([q2]);
          }
        }
      };

      var initTimeline = function () {
        if (!timeline) {
          // create a new one
          timeline = new vis.Timeline($element[0]);
          var utcOffset = null;
          utcOffset = timelineHelper.changeTimezone(config.get('dateFormat:tz'));
          if (utcOffset !== 'Browser') {
            $scope.options.moment = function (date) {
              return vis.moment(date).utcOffset(utcOffset);
            };
          }
          if ($scope.options) {
            timeline.setOptions($scope.options);
          }
          timeline.on('select', onSelect);
        }
      };

      var groupEvents = [];

      var updateTimeline = function (groupIndex, events) {
        initTimeline();
        var existingGroupIds = _.map($scope.groups, function (g) {
          return g.id;
        });

        groupEvents[groupIndex] = _.cloneDeep(events);

        // make sure all events have correct group index
        // add only events from groups which still exists
        var points = [];
        _.each(groupEvents, function (events, index) {
          _.each(events, function (e) {
            e.group = $scope.groupsOnSeparateLevels === true ? index : 0;
            if (existingGroupIds.indexOf(e.groupId) !== -1) {
              points.push(e);
            }
          });
        });

        data = new vis.DataSet(points);
        timeline.setItems(data);
        timeline.fit();
      };

      var initSingleGroup = function (group, index) {
        var searchSource = group.searchSource;
        var params = group.params;
        var groupId = group.id;
        const groupColor = group.color;
        searchSource.onResults().then(function onResults(searchResp) {
          var events = [];

          if (params.startField) {
            var detectedMultivaluedLabel;
            var detectedMultivaluedStart;
            var detectedMultivaluedEnd;
            var labelFieldValue;
            var startFieldValue;
            var startRawFieldValue;
            var endFieldValue;
            var endRawFieldValue;

            _.each(searchResp.hits.hits, function (hit) {
              startRawFieldValue = hit.fields[params.startField];
              labelFieldValue = timelineHelper.getDescendantPropValue(hit._source, params.labelField);
              startFieldValue = timelineHelper.getDescendantPropValue(hit._source, params.startField);

              var endFieldValue = null;

              if (startFieldValue) {

                if (timelineHelper.isMultivalued(startFieldValue)) {
                  detectedMultivaluedStart = true;
                }
                if (timelineHelper.isMultivalued(labelFieldValue)) {
                  detectedMultivaluedLabel = true;
                }
                var indexId = searchSource.get('index').id;
                var startValue = timelineHelper.pickFirstIfMultivalued(startFieldValue);
                var startRawValue = timelineHelper.pickFirstIfMultivalued(startRawFieldValue);
                var labelValue = timelineHelper.pickFirstIfMultivalued(labelFieldValue, '');
                var content =
                  '<div title="index: ' + indexId +
                  ', startField: ' + params.startField +
                  (params.endField ? ', endField: ' + params.endField : '') +
                  '">' + labelValue + '</div>';

                var e =  {
                  index: indexId,
                  content: content,
                  value: labelValue,
                  start: new Date(startRawValue),
                  startField: {
                    name: params.startField,
                    value: startValue
                  },
                  type: 'box',
                  group: $scope.groupsOnSeparateLevels === true ? index : 0,
                  style: 'background-color: ' + groupColor + '; color: #fff;',
                  groupId: groupId
                };

                if (params.endField) {
                  endFieldValue = timelineHelper.getDescendantPropValue(hit._source, params.endField);
                  endRawFieldValue = hit.fields[params.endField];
                  if (timelineHelper.isMultivalued(endFieldValue)) {
                    detectedMultivaluedEnd = true;
                  }
                  if (!endFieldValue) {
                    // here the end field value missing but expected
                    // force the event to be of type point
                    e.type = 'point';
                  } else {
                    var endValue = timelineHelper.pickFirstIfMultivalued(endFieldValue);
                    var endRawValue = timelineHelper.pickFirstIfMultivalued(endRawFieldValue);
                    if (startValue === endValue) {
                      // also force it to be a point
                      e.type = 'point';
                    } else {
                      e.type = 'range';
                      e.end =  new Date(endRawValue);
                      e.endField = {
                        name: params.endField,
                        value: endValue
                      };
                    }
                  }
                }
                events.push(e);
              } else {
                if ($scope.notifyDataErrors) {
                  notify.warning('Check your data - null start date not allowed.' +
                  ' You can disable these errors in visualisation configuration');
                }
                return;
              }
            });

            if (detectedMultivaluedLabel) {
              notify.warning('Label field [' + params.labelField + '] is multivalued - the first value will be used.');
            }
            if (detectedMultivaluedStart) {
              notify.warning('Start Date field [' + params.startField + '] is multivalued - the first date will be used.');
            }
            if (detectedMultivaluedEnd) {
              notify.warning('End Date field [' + params.endField + '] is multivalued - the first date will be used.');
            }

          }

          updateTimeline(index, events);

          return searchSource.onResults().then(onResults);

        }).catch(notify.error);
      };

      var initGroups = function () {
        initTimeline();

        var groups = [];
        if ($scope.groupsOnSeparateLevels === true) {
          _.each($scope.groups, function (group, index) {
            groups.push({
              id: index,
              content: group.label,
              style: 'background-color:' + group.color + '; color: #fff;'
            });
          });
        } else {
          // single group
          // - a bit of hack but currently the only way I could make it work
          groups.push({
            id: 0,
            content: '',
            style: 'background-color: none;'
          });
        }
        var dataGroups = new vis.DataSet(groups);
        timeline.setGroups(dataGroups);
      };


      $scope.$watch('options', function (newOptions, oldOptions) {
        if (!newOptions || newOptions === oldOptions) {
          return;
        }
        initTimeline();
        timeline.redraw();
      }, true); // has to be true in other way the change in height is not detected


      $scope.$watch(
        function ($scope) {
          // here to make a comparison use all properties except a searchSource as it was causing angular to
          // enter an infinite loop when trying to determine the object equality
          var arr =  _.map($scope.groups, function (g) {
            return _.omit(g, 'searchSource');
          });

          arr.push($scope.groupsOnSeparateLevels);
          return arr;
        },
        function (newValue, oldValue) {
          if (newValue === oldValue) {
            return;
          }
          initTimeline();
          if ($scope.groups) {
            initGroups();
            _.each($scope.groups, (group, index) => {
              initSingleGroup(group, index);
            });
            courier.fetch();
          }
        },
        true
      );


      $element.on('$destroy', function () {
        _.each($scope.groups, (group) => {
          requestQueue.markAllRequestsWithSourceIdAsInactive(group.searchSource._id);
        });
        if (timeline) {
          timeline.off('select', onSelect);
        }
      });
    } // end of link function


  });
});
