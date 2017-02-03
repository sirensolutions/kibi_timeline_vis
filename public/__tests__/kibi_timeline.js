import SearchSourceProvider from 'fixtures/stubbed_search_source';
import TimelineHelper from '../lib/helpers/timeline_helper';
import sinon from 'auto-release-sinon';
import angular from 'angular';
import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import moment from 'moment';
import 'plugins/kibi_timeline_vis/kibi_timeline_vis_controller';

describe('Kibi Timeline', function () {
  describe('KibiTimeline Directive', function () {
    let $elem;
    let $rootScope;
    let $scope;
    let searchSource;
    let highlightTags;

    let getSortOnStartFieldObjectSpy;

    const init = function ($elem, props) {
      ngMock.inject(function (_$rootScope_, $compile) {
        $rootScope = _$rootScope_;
        $compile($elem)($rootScope);
        $elem.scope().$digest();
        $scope = $elem.isolateScope();
        _.assign($scope, props);
        $scope.$digest();
      });
    };

    const destroy = function () {
      $scope.$destroy();
      $rootScope.$destroy();
    };

    function initTimeline({ invertFirstLabelInstance = false, useHighlight = false, withFieldSequence, endField, startField, labelField }) {
      ngMock.module('kibana', $provide => {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });
      const directive = `<kibi-timeline
      vis-options="visOptions"
      timeline-options="timelineOptions">
        </kibi-timeline>`;
      $elem = angular.element(directive);
      ngMock.inject(function (_highlightTags_, Private) {
        getSortOnStartFieldObjectSpy = sinon.spy(TimelineHelper, 'getSortOnStartFieldObject');

        highlightTags = _highlightTags_;

        searchSource = Private(SearchSourceProvider);
        searchSource.highlight = sinon.stub();
        searchSource.sort = sinon.stub();
      });

      const params = { invertFirstLabelInstance, useHighlight, endField, labelField, startField };
      if (withFieldSequence) {
        params.startFieldSequence = startField.split('.');
        params.endFieldSequence = endField.split('.');
        params.labelFieldSequence = labelField.split('.');
      }

      init($elem, {
        visOptions: {
          groups: [
            {
              id: 1,
              color: '#ff0000',
              label: 'logs',
              params,
              searchSource
            }
          ],
          groupsOnSeparateLevels: false,
          selectValue: 'id',
          notifyDataErrors: false
        }
      });
      $scope.$digest();
    }

    afterEach(function () {
      destroy();
    });

    it('should compile', function () {
      initTimeline({});
      expect($elem.text()).to.not.be.empty();
    });

    it('should correctly return a timeline', function () {
      initTimeline({
        startField: '@timestamp',
        endField: '',
        labelField: 'machine.os'
      });

      const date = '25-01-1995';
      const dateObj = moment(date, 'DD-MM-YYYY');
      const results = {
        took: 73,
        timed_out: false,
        _shards: {
          total: 144,
          successful: 144,
          failed: 0
        },
        hits: {
          total : 49487,
          max_score : 1.0,
          hits: [
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '61',
              _score: 1,
              _source: {
                '@timestamp': date,
                machine: {
                  os: 'linux'
                }
              },
              fields: {
                '@timestamp': [ dateObj ]
              }
            }
          ]
        }
      };
      searchSource.crankResults(results);
      $scope.$digest();
      expect($scope.timeline.itemsData.length).to.be(1);
      $scope.timeline.itemsData.forEach(data => {
        sinon.assert.notCalled(searchSource.highlight);
        expect(data.value).to.be('linux');
        expect(data.start.valueOf()).to.be(dateObj.valueOf());
      });
    });

    it('should return an event with the all the labels joined', function () {
      initTimeline({
        startField: '@timestamp',
        endField: '',
        labelField: 'machine.os'
      });

      const date = '25-01-2015';
      const dateObj = moment(date, 'DD-MM-YYYY');
      const results = {
        took: 73,
        timed_out: false,
        _shards: {
          total: 144,
          successful: 144,
          failed: 0
        },
        hits: {
          total : 49487,
          max_score : 1.0,
          hits: [
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '61',
              _score: 1,
              _source: {
                '@timestamp': date,
                machine: {
                  os: [ 'linux', 'mac' ]
                }
              },
              fields: {
                '@timestamp': [ dateObj ],
              }
            }
          ]
        }
      };
      searchSource.crankResults(results);
      $scope.$digest();
      expect($scope.timeline.itemsData.length).to.be(1);
      $scope.timeline.itemsData.forEach(data => {
        sinon.assert.notCalled(searchSource.highlight);
        expect(data.value).to.be('linux, mac');
        expect(data.start.valueOf()).to.be(dateObj.valueOf());
      });
    });

    it('should return an event for each start/end pairs', function () {
      initTimeline({
        startField: '@timestamp',
        endField: '',
        labelField: 'machine.os'
      });

      const dates = [ '25-01-2015', '16-12-2016' ];
      const dateObjs = _.map(dates, date => moment(date, 'DD-MM-YYYY'));
      const results = {
        took: 73,
        timed_out: false,
        _shards: {
          total: 144,
          successful: 144,
          failed: 0
        },
        hits: {
          total : 49487,
          max_score : 1.0,
          hits: [
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '61',
              _score: 1,
              _source: {
                '@timestamp': dates,
                machine: {
                  os: 'linux'
                }
              },
              fields: {
                '@timestamp': dateObjs,
              }
            }
          ]
        }
      };
      searchSource.crankResults(results);
      $scope.$digest();
      expect($scope.timeline.itemsData.length).to.be(2);
      let i = 0;
      $scope.timeline.itemsData.forEach(data => {
        sinon.assert.notCalled(searchSource.highlight);
        expect(data.value).to.be('linux');
        expect(data.start.valueOf()).to.be(dateObjs[i].valueOf());
        i++;
      });
    });

    it('should get the highlighted terms of events if useHighlight is true', function () {
      initTimeline({
        useHighlight: true,
        startField: '@timestamp',
        endField: '',
        labelField: 'machine.os'
      });

      const date = '25-01-1995';
      const dateObj = moment(date, 'DD-MM-YYYY');
      const results = {
        took: 73,
        timed_out: false,
        _shards: {
          total: 144,
          successful: 144,
          failed: 0
        },
        hits: {
          total : 49487,
          max_score : 1.0,
          hits: [
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '61',
              _score: 1,
              _source: {
                '@timestamp': date,
                machine: {
                  os: 'linux'
                }
              },
              fields: {
                '@timestamp': [ dateObj ]
              },
              highlight: {
                'machine.os': [
                  `${highlightTags.pre}BEST BEST${highlightTags.post}`
                ]
              }
            }
          ]
        }
      };
      searchSource.crankResults(results);
      $scope.$digest();
      expect($scope.timeline.itemsData.length).to.be(1);
      sinon.assert.called(searchSource.highlight);
      $scope.timeline.itemsData.forEach(data => {
        expect(data.content).to.match(/best best/);
        expect(data.value).to.be('linux');
        expect(data.start.valueOf()).to.be(dateObj.valueOf());
      });
    });

    it('should sort on the start field if invertFirstLabelInstance', function () {
      initTimeline({
        invertFirstLabelInstance: true,
        startField: '@timestamp',
        endField: '',
        labelField: 'machine.os'
      });

      const date1 = '25-01-1995';
      const date1Obj = moment(date1, 'DD-MM-YYYY');
      const date2 = '26-01-1995';
      const date2Obj = moment(date2, 'DD-MM-YYYY');
      const date3 = '27-01-1995';
      const date3Obj = moment(date3, 'DD-MM-YYYY');

      const results = {
        took: 73,
        timed_out: false,
        _shards: {
          total: 144,
          successful: 144,
          failed: 0
        },
        hits: {
          total : 49487,
          max_score : 1.0,
          hits: [
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '61',
              _score: 1,
              _source: {
                '@timestamp': date1,
                machine: {
                  os: 'linux'
                }
              },
              fields: {
                '@timestamp': [ date1Obj ]
              }
            },
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '62',
              _score: 1,
              _source: {
                '@timestamp': date2,
                machine: {
                  os: 'mac'
                }
              },
              fields: {
                '@timestamp': [ date2Obj ]
              }
            },
            {
              _index: 'logstash-2014.09.09',
              _type: 'apache',
              _id: '63',
              _score: 1,
              _source: {
                '@timestamp': date3,
                machine: {
                  os: 'linux'
                }
              },
              fields: {
                '@timestamp': [ date3Obj ]
              }
            }
          ]
        }
      };
      searchSource.crankResults(results);
      $scope.$digest();
      expect($scope.timeline.itemsData.length).to.be(3);
      sinon.assert.called(getSortOnStartFieldObjectSpy);
      sinon.assert.called(searchSource.sort);

      let itemIndex = 0;
      $scope.timeline.itemsData.forEach(data => {
        switch (itemIndex) {
          case 0:
            expect(data.value).to.be('linux');
            expect(data.start.valueOf()).to.be(date1Obj.valueOf());
            // emphasized, border style is solid
            expect(data.style).to.match(/color: #ff0000/);
            expect(data.style).to.match(/border-style: solid/);
            break;
          case 1:
            expect(data.value).to.be('mac');
            expect(data.start.valueOf()).to.be(date2Obj.valueOf());
            // emphasized, border style is solid
            expect(data.style).to.match(/color: #ff0000/);
            expect(data.style).to.match(/border-style: solid/);
            break;
          case 2:
            expect(data.value).to.be('linux');
            expect(data.start.valueOf()).to.be(date3Obj.valueOf());
            // border style is none
            expect(data.style).to.match(/color: #ff0000/);
            expect(data.style).to.match(/border-style: none/);
            break;
          default:
            expect().fail(`Should not have the case itemIndex=${itemIndex}`);
        }
        itemIndex++;
      });
    });

    describe('Missing data', function () {
      it('should support documents with missing label', function () {
        initTimeline({
          startField: '@timestamp',
          endField: '',
          labelField: 'machine.os'
        });

        const date = '25-01-1995';
        const dateObj = moment(date, 'DD-MM-YYYY');
        const results = {
          took: 73,
          timed_out: false,
          _shards: {
            total: 144,
            successful: 144,
            failed: 0
          },
          hits: {
            total : 49487,
            max_score : 1.0,
            hits: [
              {
                _index: 'logstash-2014.09.09',
                _type: 'apache',
                _id: '61',
                _score: 1,
                _source: {
                  '@timestamp': date
                },
                fields: {
                  '@timestamp': [ dateObj ]
                }
              }
            ]
          }
        };
        searchSource.crankResults(results);
        $scope.$digest();
        expect($scope.timeline.itemsData.length).to.be(1);
        $scope.timeline.itemsData.forEach(data => {
          sinon.assert.notCalled(searchSource.highlight);
          expect(data.value).to.be('N/A');
          expect(data.start.valueOf()).to.be(dateObj.valueOf());
        });
      });

      [
        {
          withFieldSequence: true
        },
        {
          withFieldSequence: false
        }
      ].forEach(({ withFieldSequence }) => {
        it(`should support documents with missing start date with ${withFieldSequence ? 'kibi' : 'kibana'}`, function () {
          initTimeline({
            withFieldSequence,
            startField: '@timestamp',
            endField: '',
            labelField: 'machine.os'
          });

          const results = {
            took: 73,
            timed_out: false,
            _shards: {
              total: 144,
              successful: 144,
              failed: 0
            },
            hits: {
              total : 49487,
              max_score : 1.0,
              hits: [
                {
                  _index: 'logstash-2014.09.09',
                  _type: 'apache',
                  _id: '61',
                  _score: 1,
                  _source: {
                    '@timestamp': null,
                    machine: {
                      os: 'linux'
                    }
                  },
                  fields: {}
                }
              ]
            }
          };
          searchSource.crankResults(results);
          $scope.$digest();
          expect($scope.timeline.itemsData.length).to.be(0);
        });
      });
    });
  });
});
