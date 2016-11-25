const angular = require('angular');
const expect = require('expect.js');
const _ = require('lodash');
const ngMock = require('ngMock');
const moment = require('moment');

require('plugins/kibi_timeline_vis/kibi_timeline_vis_controller');

let $rootScope;
let $scope;
let searchSource;

let init = function ($elem, props) {
  ngMock.inject(function (_$rootScope_, $compile, _$timeout_) {
    $rootScope = _$rootScope_;
    $compile($elem)($rootScope);
    $elem.scope().$digest();
    $scope = $elem.isolateScope();
    _.assign($scope, props);
    $scope.$digest();
  });
};

let destroy = function () {
  $scope.$destroy();
  $rootScope.$destroy();
};

describe('KibiTimeline Directive', function () {
  let $elem;

  function initTimeline({ withFieldSequence, endField, startField, labelField }) {
    ngMock.module('kibana', $provide => {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardTitle', '');
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });
    const directive = `<kibi-timeline
                        groups="groups"
                        groups-on-separate-levels="groupsOnSeparateLevels"
                        select-value="selectValue"
                        notify-data-errors="notifyDataErrors"
                        options="options">
                      </kibi-timeline>`;
    $elem = angular.element(directive);
    ngMock.inject(function (Private) {
      searchSource = Private(require('fixtures/stubbed_search_source'));
    });

    const params = { endField, labelField, startField };
    if (withFieldSequence) {
      params.startFieldSequence = startField.split('.');
      params.endFieldSequence = endField.split('.');
      params.labelFieldSequence = labelField.split('.');
    }

    init($elem, {
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

  it('should correcty return a timeline', function () {
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
      expect(data.value).to.be('linux');
      expect(data.start.valueOf()).to.be(dateObj.valueOf());
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
