import QueryFilterProvider from 'ui/filter_bar/query_filter';
import TimelineHelper from './lib/helpers/timeline_helper';
import RequestQueueProvider from './lib/courier/_request_queue_wrapped';
import 'ui/highlight/highlight_tags';
import _ from 'lodash';
import vis from 'vis';
import buildRangeFilter from 'ui/filter_manager/lib/range';
import uiModules from 'ui/modules';
import kibiUtils from 'kibiutils';

uiModules
.get('kibana')
.directive('kibiTimeline', function (Private, createNotifier, courier, indexPatterns, config, highlightTags, timefilter) {
  const NUM_FRAGS_CONFIG = 'kibi:timeline:highlight:number_of_fragments';
  const DEFAULT_NUM_FRAGS = 25;
  const requestQueue = Private(RequestQueueProvider);
  const queryFilter = Private(QueryFilterProvider);
  const notify = createNotifier({
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
            const q1 = {
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
              const startF = _.find(i.fields, function (f) {
                return f.name === selected.startField.name;
              });
              const endF = _.find(i.fields, function (f) {
                return f.name === selected.endField.name;
              });

              const rangeFilter1 = buildRangeFilter(startF, {
                gte: selected.startField.value
              }, i);
              rangeFilter1.meta.alias = selected.startField.name + ' >= ' + selected.start;

              const rangeFilter2 = buildRangeFilter(endF, {
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
          const q2 = {
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

    const initTimeline = function () {
      if (!timeline) {
        // create a new one
        $scope.timeline = timeline = new vis.Timeline($element[0]);
        if ($scope.timelineOptions) {
          const utcOffset = TimelineHelper.changeTimezone(config.get('dateFormat:tz'));
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

    const groupEvents = [];

    const updateTimeline = function (groupIndex, events) {
      const existingGroupIds = _.map($scope.visOptions.groups, function (g) {
        return g.id;
      });

      groupEvents[groupIndex] = _.cloneDeep(events);

      // make sure all events have correct group index
      // add only events from groups which still exists
      const points = [];
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

    const initSingleGroup = function (group, index) {
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
        searchSource.sort(TimelineHelper.getSortOnStartFieldObject(params));
      }

      searchSource.onResults().then(function onResults(searchResp) {
        const events = [];

        if (params.startField) {
          let startFieldValue;
          let startRawFieldValue;
          let endFieldValue;
          let endRawFieldValue;
          const uniqueLabels = [];

          _.each(searchResp.hits.hits, function (hit) {
            let labelValue = TimelineHelper.pluckLabel(hit, params, notify);
            if (labelValue.constructor === Array) {
              labelValue = labelValue.join(', ');
            }

            if (params.startFieldSequence) { // in kibi, we have the path property of a field
              startFieldValue = kibiUtils.getValuesAtPath(hit._source, params.startFieldSequence);
            } else {
              startFieldValue = _.get(hit._source, params.startField);
              if (startFieldValue && startFieldValue.constructor !== Array) {
                startFieldValue =  [ startFieldValue ];
              }
            }
            startRawFieldValue = hit.fields[params.startField];

            let endFieldValue = null;
            if (params.endField) {
              if (params.endFieldSequence) { // in kibi, we have the path property of a field
                endFieldValue = kibiUtils.getValuesAtPath(hit._source, params.endFieldSequence);
              } else {
                endFieldValue = _.get(hit._source, params.endField);
                if (endFieldValue) {
                  endFieldValue = (endFieldValue.constructor !== Array) ? [endFieldValue] : endFieldValue;
                }
              }
              endRawFieldValue = hit.fields[params.endField];

              if (endFieldValue.length !== startFieldValue.length) {
                if ($scope.visOptions.notifyDataErrors) {
                  notify.warning('Check your data - the number of values in the field \'' + params.endField + '\' ' +
                                 'must be equal to the number of values in the field \'' + params.startField +
                                 '\': document ID=' + hit._id);
                }
                return; // break
              }
            }

            if (startFieldValue && (!_.isArray(startFieldValue) || startFieldValue.length)) {
              const indexId = searchSource.get('index').id;

              _.each(startFieldValue, function (value, i) {
                const startValue = value;
                const startRawValue = startRawFieldValue[i];

                const itemDict = {
                  indexId: indexId,
                  startField: params.startField,
                  endField: params.endField,
                  labelValue: labelValue,
                  useHighlight: params.useHighlight,
                  highlight: TimelineHelper.pluckHighlights(hit, highlightTags),
                  groupColor: groupColor,
                  startValue: startValue,
                  endFieldValue: endFieldValue ? endFieldValue[i] : null
                };

                const content = TimelineHelper.createItemTemplate(itemDict);

                let style = `background-color: ${groupColor}; color: #fff;`;
                if (!endFieldValue || startValue === endFieldValue[i]) {
                  // here the end field value missing but expected
                  // or start field value === end field value
                  // force vis box look like vis point
                  style = `border-style: none; background-color: #fff; color: ${groupColor}; border-color: ${groupColor}`;
                }

                if (params.invertFirstLabelInstance &&
                  !_.includes(uniqueLabels, labelValue.toLowerCase().trim())) {
                  if (!endFieldValue || startValue === endFieldValue[i]) {
                    style = `border-style: solid; background-color: #fff; color: ${groupColor}; border-color: ${groupColor}`;
                  } else {
                    style = `background-color: #fff; color: ${groupColor};`;
                  }
                  uniqueLabels.push(labelValue.toLowerCase().trim());
                }

                const e =  {
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
                  style: style,
                  groupId: groupId
                };

                if (endFieldValue && startValue !== endFieldValue[i]) {
                  const endValue = endFieldValue[i];
                  const endRawValue = endRawFieldValue[i];
                  if (startValue !== endValue) {
                    e.type = 'range';
                    e.end =  new Date(endRawValue);
                    e.endField = {
                      name: params.endField,
                      value: endValue
                    };
                  }
                }

                events.push(e);

              });
            } else {
              if ($scope.visOptions.notifyDataErrors) {
                notify.warning('Check your data - null start date not allowed.' +
                ' You can disable these errors in visualisation configuration');
              }
              return;
            }
          });
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
