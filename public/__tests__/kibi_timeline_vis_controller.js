import ngMock from 'ng_mock';
import _ from 'lodash';
import expect from 'expect.js';
import $ from 'jquery';
import sinon from 'auto-release-sinon';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import '../kibi_timeline_vis_controller';
import noDigestPromises from 'test_utils/no_digest_promises';

describe('Kibi Timeline', function () {

  let $scope;
  let $element;

  function init({ savedSearches = [], indexPatterns = [], stubs = {} }) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardTitle', '');
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Private, Promise) => mockSavedObjects(Promise, Private)('savedSearches', savedSearches));
    });

    ngMock.module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', (Promise, Private) => mockSavedObjects(Promise, Private)('indexPatterns', indexPatterns));
    });

    ngMock.inject(function ($rootScope, $controller) {
      $scope = $rootScope;
      $element = $('<div></div>');
      $controller('KbnTimelineVisController', {
        $scope: $scope,
        $route: {
          current: {
            locals: {
              savedVis: {}
            }
          }
        },
        $element: $element
      });

      if (stubs.initOptions) {
        sinon.stub($scope, 'initOptions');
      }
      if (stubs.initSearchSources) {
        sinon.stub($scope, 'initSearchSources');
      }
    });
  }

  const assertGroup = function (actual, expected) {
    expect(actual.id).to.equal(expected.id);
    expect(actual.color).to.equal(expected.color);
    expect(actual.label).to.equal(expected.groupLabel);
    expect(actual.searchSource._id).to.equal(expected.searchSourceId);
    expect(actual.params.labelField).to.equal(expected.labelField);
    expect(actual.params.startField).to.equal(expected.startField);
    expect(actual.params.endField).to.equal(expected.endField);
    expect(actual.params.labelFieldSequence).to.eql(expected.labelFieldSequence);
    expect(actual.params.startFieldSequence).to.eql(expected.startFieldSequence);
    expect(actual.params.endFieldSequence).to.eql(expected.endFieldSequence);
  };

  describe('Controller', function () {
    noDigestPromises.activateForSuite();

    it('should set the vis options', function () {
      init({});

      const expectedOptions = {
        width: '100%',
        height: '100%',
        selectable: true,
        autoResize: true
      };

      $scope.initOptions();
      expect($scope.options).to.eql(expectedOptions);
    });

    it('should set the options when change:vis event is triggered', function () {
      init({
        stubs: {
          initSearchSources: true,
          initOptions: true
        }
      });

      $scope.$digest();
      $scope.$emit('change:vis');
      $scope.$digest();

      expect($scope.initOptions.calledTwice).to.be(true);
    });

    it('should init groups', function (done) {
      const groups = [
        {
          id: 'idA',
          color: 'colorA',
          endField: 'endFieldA',
          groupLabel: 'groupLabelA',
          labelField: 'labelFieldA',
          savedSearchId: 'savedSearchIdA',
          startField: 'startFieldA'
        },
        {
          id: 'idB',
          color: 'colorB',
          endField: 'endFieldB',
          groupLabel: 'groupLabelB',
          labelField: 'labelFieldB',
          savedSearchId: 'savedSearchIdB',
          startField: 'startFieldB'
        }
      ];
      const savedVis = {
        vis: {
          params: {
            groups
          }
        }
      };

      init({
        indexPatterns: [
          {
            id: 'indexA',
            timeField: '',
            fields: [
              {
                name: 'labelFieldA',
                type: 'string',
                path: [ 'labelFieldA' ]
              },
              {
                name: 'startFieldA',
                type: 'string',
                path: [ 'startFieldA' ]
              },
              {
                name: 'endFieldA',
                type: 'string',
                path: [ 'endFieldA' ]
              }
            ]
          },
          {
            id: 'indexB',
            timeField: '',
            fields: [
              {
                name: 'labelFieldB',
                type: 'string',
                path: [ 'labelFieldB' ]
              },
              {
                name: 'startFieldB',
                type: 'string',
                path: [ 'startFieldB' ]
              },
              {
                name: 'endFieldB',
                type: 'string',
                path: [ 'endFieldB' ]
              }
            ]
          }
        ],
        savedSearches: [
          {
            id: 'savedSearchIdA',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'indexA',
                  filter: [],
                  query: {}
                }
              )
            }
          },
          {
            id: 'savedSearchIdB',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'indexB',
                  filter: [],
                  query: {}
                }
              )
            }
          }
        ]
      });

      $scope.initSearchSources(savedVis)
      .then(() => {
        expect($scope.visOptions.groups).to.have.length(2);

        const expectedA = {
          labelFieldSequence: [ 'labelFieldA' ],
          startFieldSequence: [ 'startFieldA' ],
          endFieldSequence: [ 'endFieldA' ],
          searchSourceId: '_kibi_timetable_ids_source_flagidAsavedSearchIdA'
        };
        _.assign(expectedA, groups[0]);
        assertGroup($scope.visOptions.groups[0], expectedA);

        const expectedB = {
          labelFieldSequence: [ 'labelFieldB' ],
          startFieldSequence: [ 'startFieldB' ],
          endFieldSequence: [ 'endFieldB' ],
          searchSourceId: '_kibi_timetable_ids_source_flagidBsavedSearchIdB'
        };
        _.assign(expectedB, groups[1]);
        assertGroup($scope.visOptions.groups[1], expectedB);

        done();
      })
      .catch(done);
    });

    it('should init group with dotted field names', function (done) {
      const groups = [
        {
          id: 'idA',
          color: 'colorA',
          endField: 'd.o.t.endFieldA',
          groupLabel: 'groupLabelA',
          labelField: 'd.o.t.labelFieldA',
          savedSearchId: 'savedSearchIdA',
          startField: 'd.o.t.startFieldA'
        },
        {
          id: 'idB',
          color: 'colorB',
          endField: 'd.o.t.endFieldB',
          groupLabel: 'groupLabelB',
          labelField: 'd.o.t.labelFieldB',
          savedSearchId: 'savedSearchIdB',
          startField: 'd.o.t.startFieldB'
        }
      ];
      const savedVis = {
        vis: {
          params: {
            groups
          }
        }
      };

      init({
        indexPatterns: [
          {
            id: 'indexA',
            timeField: '',
            fields: [
              {
                name: 'd.o.t.labelFieldA',
                type: 'string',
                path: [ 'd.o', 't.labelFieldA' ]
              },
              {
                name: 'd.o.t.startFieldA',
                type: 'string',
                path: [ 'd.o', 't.startFieldA' ]
              },
              {
                name: 'd.o.t.endFieldA',
                type: 'string',
                path: [ 'd.o', 't.endFieldA' ]
              }
            ]
          },
          {
            id: 'indexB',
            timeField: '',
            fields: [
              {
                name: 'd.o.t.labelFieldB',
                type: 'string',
                path: [ 'd.o', 't.labelFieldB' ]
              },
              {
                name: 'd.o.t.startFieldB',
                type: 'string',
                path: [ 'd.o', 't.startFieldB' ]
              },
              {
                name: 'd.o.t.endFieldB',
                type: 'string',
                path: [ 'd.o', 't.endFieldB' ]
              }
            ]
          }
        ],
        savedSearches: [
          {
            id: 'savedSearchIdA',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'indexA',
                  filter: [],
                  query: {}
                }
              )
            }
          },
          {
            id: 'savedSearchIdB',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'indexB',
                  filter: [],
                  query: {}
                }
              )
            }
          }
        ]
      });

      $scope.initSearchSources(savedVis)
      .then(() => {
        expect($scope.visOptions.groups).to.have.length(2);

        const expectedA = {
          labelFieldSequence: [ 'd.o', 't.labelFieldA' ],
          startFieldSequence: [ 'd.o', 't.startFieldA' ],
          endFieldSequence: [ 'd.o', 't.endFieldA' ],
          searchSourceId: '_kibi_timetable_ids_source_flagidAsavedSearchIdA'
        };
        _.assign(expectedA, groups[0]);
        assertGroup($scope.visOptions.groups[0], expectedA);

        const expectedB = {
          labelFieldSequence: [ 'd.o', 't.labelFieldB' ],
          startFieldSequence: [ 'd.o', 't.startFieldB' ],
          endFieldSequence: [ 'd.o', 't.endFieldB' ],
          searchSourceId: '_kibi_timetable_ids_source_flagidBsavedSearchIdB'
        };
        _.assign(expectedB, groups[1]);
        assertGroup($scope.visOptions.groups[1], expectedB);

        done();
      })
      .catch(done);
    });

    it('should pass along the parameters of the visualization', function (done) {
      const savedVis = {
        vis: {
          params: {
            syncTime: 'sync',
            groupsOnSeparateLevels: 'sep',
            notifyDataErrors: 'notify',
            selectValue: 'date',
            groups: []
          }
        }
      };

      init({
        stubs: {
          initSearchSources: false,
          initOptions: true
        }
      });

      $scope.initSearchSources(savedVis)
      .then(() => {
        expect($scope.visOptions.syncTime).to.be('sync');
        expect($scope.visOptions.groupsOnSeparateLevels).to.be('sep');
        expect($scope.visOptions.notifyDataErrors).to.be('notify');
        expect($scope.visOptions.selectValue).to.be('date');
        done();
      })
      .catch(done);
    });
  });

});
