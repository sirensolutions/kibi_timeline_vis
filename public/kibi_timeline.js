define(function (require) {
  require('ui/highlight/highlight_tags');
  let _ = require('lodash');
  let vis = require('vis');
  let buildRangeFilter = require('ui/filter_manager/lib/range');

  require('ui/modules').get('kibana').directive('kibiTimeline',
  function (Private, createNotifier, courier, indexPatterns, config, highlightTags, timefilter) {
    const kibiUtils = require('kibiutils');
    const NUM_FRAGS_CONFIG = 'kibi:timeline:highlight:number_of_fragments';
    const DEFAULT_NUM_FRAGS = 25;
    let requestQueue = Private(require('./lib/courier/_request_queue_wrapped'));
    let timelineHelper = Private(require('./lib/helpers/timeline_helper'));

    let queryFilter = Private(require('ui/filter_bar/query_filter'));

    let notify = createNotifier({
      location: 'Kibi Timeline'
    });

    return {
      scope: {
        timelineOptions: '=',
        visOptions: '='
      },
      restrict: 'E',
      replace: true,
      link: _link
    };

    function _link($scope, $element) {
      let timeline;
      let data;

      const onSelect = function (properties) {
        // pass this to a scope variable
        const selected = data._data[properties.items];
        if (selected) {
          if ($scope.visOptions.selectValue === 'date') {
            if (selected.start && !selected.end) {
              // single point - do query match query filter
              let q1 = {
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
                let startF = _.find(i.fields, function (f) {
                  return f.name === selected.startField.name;
                });
                let endF = _.find(i.fields, function (f) {
                  return f.name === selected.endField.name;
                });

                let rangeFilter1 = buildRangeFilter(startF, {
                  gte: selected.startField.value
                }, i);
                rangeFilter1.meta.alias = selected.startField.name + ' >= ' + selected.start;

                let rangeFilter2 = buildRangeFilter(endF, {
                  lte: selected.endField.value
                }, i);
                rangeFilter2.meta.alias = selected.endField.name + ' <= ' + selected.end;

                queryFilter.addFilters([rangeFilter1, rangeFilter2]);
              });
            }
          } else if ($scope.visOptions.selectValue === 'id') {
            let searchField = undefined;
            for (let i = 0; i < $scope.visOptions.groups.length; i++) {
              if (selected.groupId === $scope.visOptions.groups[i].id) {
                searchField = $scope.visOptions.groups[i].params.labelField;
              }
            }
            let q2 = {
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

      let initTimeline = function () {
        if (!timeline) {
          // create a new one
          $scope.timeline = timeline = new vis.Timeline($element[0]);
          if ($scope.timelineOptions) {
            const utcOffset = timelineHelper.changeTimezone(config.get('dateFormat:tz'));
            if (utcOffset !== 'Browser') {
              $scope.timelineOptions.moment = function (date) {
                return vis.moment(date).utcOffset(utcOffset);
              };
            }
            timeline.setOptions($scope.timelineOptions);
          }
          timeline.on('select', onSelect);
          timeline.on('rangechanged', function (props) {
            if ($scope.visOptions.syncTime && props.byUser) {
              timefilter.time.mode = 'absolute';
              timefilter.time.from = props.start.toISOString();
              timefilter.time.to = props.end.toISOString();
            }
          });
        }
      };

      let groupEvents = [];

      let updateTimeline = function (groupIndex, events) {
        let existingGroupIds = _.map($scope.visOptions.groups, function (g) {
          return g.id;
        });

        groupEvents[groupIndex] = _.cloneDeep(events);

        // make sure all events have correct group index
        // add only events from groups which still exists
        let points = [];
        _.each(groupEvents, function (events, index) {
          _.each(events, function (e) {
            e.group = $scope.visOptions.groupsOnSeparateLevels === true ? index : 0;
            if (existingGroupIds.indexOf(e.groupId) !== -1) {
              points.push(e);
            }
          });
        });

        data = new vis.DataSet(points);
        timeline.setItems(data);
        timeline.fit();
      };

      let initSingleGroup = function (group, index) {
        const searchSource = group.searchSource;
        const params = group.params;
        const groupId = group.id;
        const groupColor = group.color;

        let numFrags = parseInt(config.get(NUM_FRAGS_CONFIG, NaN), 10);
        //(numFrags !== numFrags) is required instead of (numFrags === NaN) because NaN does not equals itself!
        if (numFrags !== numFrags || numFrags < 0) {
          numFrags = DEFAULT_NUM_FRAGS;
          config.set(NUM_FRAGS_CONFIG, DEFAULT_NUM_FRAGS);
        }

        if (params.useHighlight) {
          searchSource.highlight({
            pre_tags: [highlightTags.pre],
            post_tags: [highlightTags.post],
            fields: {
              '*': {
                fragment_size: 0,
                number_of_fragments: numFrags
              }
            },
            require_field_match: false
          });
        }
        if (params.invertFirstLabelInstance) {
          searchSource.sort(timelineHelper.getSortOnStartFieldObject(params));
        }

        searchSource.onResults().then(function onResults(searchResp) {
          let events = [];

          if (params.startField) {
            let detectedMultivaluedStart;
            let detectedMultivaluedEnd;
            let startFieldValue;
            let startRawFieldValue;
            let endFieldValue;
            let endRawFieldValue;
            const uniqueLabels = [];

            _.each(searchResp.hits.hits, function (hit) {
              let labelValue = timelineHelper.pluckLabel(hit, params, notify);
              if (params.startFieldSequence) { // in kibi, we have the path property of a field
                startFieldValue = kibiUtils.getValuesAtPath(hit._source, params.startFieldSequence);
              } else {
                startFieldValue = _.get(hit._source, params.startField);
              }
              startRawFieldValue = hit.fields[params.startField];

              let endFieldValue = null;

              if (startFieldValue && (!_.isArray(startFieldValue) || startFieldValue.length)) {
                if (timelineHelper.isMultivalued(startFieldValue)) {
                  detectedMultivaluedStart = true;
                }
                let indexId = searchSource.get('index').id;
                let startValue = timelineHelper.pickFirstIfMultivalued(startFieldValue);
                let startRawValue = timelineHelper.pickFirstIfMultivalued(startRawFieldValue);
                let content =
                  '<div title="index: ' + indexId +
                  ', startField: ' + params.startField +
                  (params.endField ? ', endField: ' + params.endField : '') +
                  '">' + labelValue +
                  (params.useHighlight ? '<p class="tiny-txt">' + timelineHelper.pluckHighlights(hit, highlightTags) + '</p>' : '') +
                  '</div>';

                let style = 'background-color: ' + groupColor + '; color: #fff;';
                if (params.invertFirstLabelInstance &&
                  !_.includes(uniqueLabels, labelValue.toLowerCase().trim())) {
                  style = 'background-color: #fff; color: ' + groupColor + ';';
                  uniqueLabels.push(labelValue.toLowerCase().trim());
                }

                let e =  {
                  index: indexId,
                  content: content,
                  value: labelValue,
                  start: new Date(startRawValue),
                  startField: {
                    name: params.startField,
                    value: startValue
                  },
                  type: 'box',
                  group: $scope.visOptions.groupsOnSeparateLevels === true ? index : 0,
                  style: style,
                  groupId: groupId
                };

                if (params.endField) {
                  if (params.endFieldSequence) { // in kibi, we have the path property of a field
                    endFieldValue = kibiUtils.getValuesAtPath(hit._source, params.endFieldSequence);
                  } else {
                    endFieldValue = _.get(hit._source, params.endField);
                  }
                  endRawFieldValue = hit.fields[params.endField];
                  if (timelineHelper.isMultivalued(endFieldValue)) {
                    detectedMultivaluedEnd = true;
                  }
                  if (!endFieldValue) {
                    // here the end field value missing but expected
                    // force the event to be of type point
                    e.type = 'point';
                  } else {
                    let endValue = timelineHelper.pickFirstIfMultivalued(endFieldValue);
                    let endRawValue = timelineHelper.pickFirstIfMultivalued(endRawFieldValue);
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
                if ($scope.visOptions.notifyDataErrors) {
                  notify.warning('Check your data - null start date not allowed.' +
                  ' You can disable these errors in visualisation configuration');
                }
                return;
              }
            });

            if (detectedMultivaluedStart) {
              notify.warning('Start Date field [' + params.startField + '] is multivalued - the first date will be used.');
            }
            if (detectedMultivaluedEnd) {
              notify.warning('End Date field [' + params.endField + '] is multivalued - the first date will be used.');
            }

          }

          updateTimeline(index, events);

          return searchSource.onResults().then(onResults.bind(this));

        }).catch(notify.error);
      };

      const initGroups = function () {
        const groups = [];
        if ($scope.visOptions.groupsOnSeparateLevels === true) {
          _.each($scope.visOptions.groups, function (group, index) {
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
        const dataGroups = new vis.DataSet(groups);
        timeline.setGroups(dataGroups);
      };

      $scope.$watch('timelineOptions', function (newOptions, oldOptions) {
        if (!newOptions || newOptions === oldOptions) {
          return;
        }
        initTimeline();
        timeline.redraw();
      }, true); // has to be true in other way the change in height is not detected

      const prereq = (function () {
        const fns = [];

        return function register(fn) {
          fns.push(fn);

          return function () {
            fn.apply(this, arguments);

            if (fns.length) {
              _.pull(fns, fn);
              if (!fns.length) {
                $scope.$root.$broadcast('ready:vis');
              }
            }
          };
        };
      }());

      const update = prereq(function update(newValue, oldValue) {
        if (newValue === oldValue) {
          return;
        }
        initTimeline();
        if ($scope.visOptions.groups) {
          initGroups();
          _.each($scope.visOptions.groups, (group, index) => {
            initSingleGroup(group, index);
          });
          courier.fetch();
        }
      });

      $scope.$watch(function ($scope) {
        // here to make a comparison use all properties except a searchSource as it was causing angular to
        // enter an infinite loop when trying to determine the object equality
        if (!$scope.visOptions) {
          return;
        }
        const groupsWithoutSearchSource = _.map($scope.visOptions.groups, g => _.omit(g, 'searchSource'));
        return _.assign({}, $scope.visOptions, { groups: groupsWithoutSearchSource });
      }, update, true);

      $scope.$watch('_.pluck(visOptions.groups, "searchSource")', update);

      $element.on('$destroy', function () {
        _.each($scope.visOptions.groups, (group) => {
          requestQueue.markAllRequestsWithSourceIdAsInactive(group.searchSource._id);
        });
        if (timeline) {
          timeline.off('select', onSelect);
        }
      });
    } // end of link function
  });
});
