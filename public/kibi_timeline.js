define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');
  var moment = require('moment');
  var buildRangeFilter = require('ui/filter_manager/lib/range');

  require('ui/modules').get('kibana').directive('kibiTimeline', function (Private, createNotifier, courier, es, indexPatterns) {

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
          if (selected.start && !selected.end) {
            // single point - do query match query filter
            var q = {
              query: {
                match: {}
              },
              meta: {
                index: selected.index
              }
            };

            q.query.match[selected.startField.name] = {
              query: selected.start.getTime(),
              type: 'phrase'
            };
            queryFilter.addFilters([q]);
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
                gte: selected.startField.value,
                format: selected.startField.format
              }, i);
              rangeFilter1.meta.alias = selected.startField.name + ' >= ' + selected.start;

              var rangeFilter2 = buildRangeFilter(endF, {
                lte: selected.endField.value,
                format: selected.endField.format
              }, i);
              rangeFilter2.meta.alias = selected.endField.name + ' <= ' + selected.end;

              queryFilter.addFilters([rangeFilter1, rangeFilter2]);
            });
          }
        }
      };

      var initTimeline = function () {
        if (!timeline) {
          // create a new one
          timeline = new vis.Timeline($element[0]);
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

      var convertJodaToMomentFormat = function (jodaFormat) {
        return jodaFormat.replace(/d/g, 'D').replace(/y/g, 'Y');
      };

      var tryToGetFormat = function (userProvidedMomentFormat, mappingsMap, indexId, typeId, fieldId) {
        // format not provided by the user try to use the mappings joda format
        var format;
        var momentFormat = userProvidedMomentFormat;

        try {
          format = mappingsMap[indexId].mappings[typeId][fieldId].mapping[fieldId].format;
          if (format === 'strict_date_optional_time||epoch_millis') {
            // do nothing for now
          } else {
            if (!momentFormat) {
              momentFormat = convertJodaToMomentFormat(format);
            }
          }
        } catch (err) {
          notify.warning('Could not retrieve data format for field: ' + fieldId);
        }

        return {
          format: format,
          momentFormat: momentFormat
        };
      };


      var initSingleGroup = function (group, index, mappingsMap) {
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
            var endFieldValue;

            _.each(searchResp.hits.hits, function (hit) {
              var labelFieldValue = timelineHelper.getDescendantPropValue(hit._source, params.labelField);
              var startFieldValue = timelineHelper.getDescendantPropValue(hit._source, params.startField);
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
                var startFormat = tryToGetFormat(group.startFieldFormat, mappingsMap, indexId, hit._type, params.startField);
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
                  start: startFormat.momentFormat ? moment(startValue, startFormat.momentFormat).toDate() : moment(startValue).toDate(),
                  startField: {
                    name: params.startField,
                    format: startFormat.format,
                    value: startValue
                  },
                  type: 'box',
                  group: $scope.groupsOnSeparateLevels === true ? index : 0,
                  style: 'background-color: ' + groupColor + '; color: #fff;',
                  groupId: groupId
                };

                if (params.endField) {
                  endFieldValue = timelineHelper.getDescendantPropValue(hit._source, params.endField);
                  if (timelineHelper.isMultivalued(endFieldValue)) {
                    detectedMultivaluedEnd = true;
                  }
                  if (!endFieldValue) {
                    // here the end field value missing but expected
                    // force the event to be of type point
                    e.type = 'point';
                  } else {
                    var endValue = timelineHelper.pickFirstIfMultivalued(endFieldValue);
                    var endFormat = tryToGetFormat(group.endFieldFormat, mappingsMap, indexId, hit._type, params.endField);
                    if (startValue === endValue) {
                      // also force it to be a point
                      e.type = 'point';
                    } else {
                      e.type = 'range';
                      e.end =  endFormat.momentFormat ? moment(endValue, endFormat.momentFormat).toDate() : moment(endValue).toDate();
                      e.endField = {
                        name: params.endField,
                        format: endFormat.format,
                        value: endValue
                      };
                    }
                  }
                }
                events.push(e);
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
        timeline.setOptions(newOptions);
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
            var indexIds = [];
            var fieldIds = [];
            _.each($scope.groups, (g) => {
              if (g.params.startField && fieldIds.indexOf(g.params.startField) === -1) {
                fieldIds.push(g.params.startField);
              }
              if (g.params.endField && fieldIds.indexOf(g.params.endField) === -1) {
                fieldIds.push(g.params.endField);
              }
              if (indexIds.indexOf(g.searchSource.get('index').id) === -1) {
                indexIds.push(g.searchSource.get('index').id);
              }
            });

            // grab mapping map
            es.indices.getFieldMapping({
              index: indexIds,
              field: fieldIds,
              ignoreUnavailable: false,
              allowNoIndices: false,
              includeDefaults: true
            }).then(function (mappingsMap) {
              _.each($scope.groups, (group, index) => {
                initSingleGroup(group, index, mappingsMap);
              });
              // do not use newValue as it does not have searchSource as we filtered it out
              courier.fetch();
            });
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
