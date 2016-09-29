const ngMock = require('ngMock');
const expect = require('expect.js');
const $ = require('jquery');
const sinon = require('auto-release-sinon');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');

require('../kibi_timeline_vis_controller');

describe('Kibi Timeline', function () {

  require('testUtils/noDigestPromises').activateForSuite();

  var $scope;
  var $element;
  var $location;

  function init(options) {

    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);

      $provide.service('savedSearches', (Promise, Private) => {

        const StubIndexPattern = Private(require('testUtils/stub_index_pattern'));

        var indexPatternAStub = new StubIndexPattern('logstash-*', 'time', []);
        var indexPatternBStub = new StubIndexPattern('logstash-*', 'time', []);

        var fakeSavedSearches = [
          {
            id: 'savedSearchIdA',
            searchSource: {
              _state: {
                index: indexPatternAStub
              }
            }
          },
          {
            id: 'savedSearchIdB',
            searchSource: {
              _state: {
                index: indexPatternAStub
              }
            }
          }
        ];
        return mockSavedObjects(Promise)('savedSearches', fakeSavedSearches);
      });
    });

    ngMock.inject(function (_$rootScope_, $controller, _$location_) {
      var fakeRoute = {
        current: {
          locals: {

          }
        }
      };
      $location = _$location_;
      $scope = _$rootScope_;
      $scope.vis = {
        id: 'a'
      };
      $scope.savedVis = {};
      $element = $('<div></div>');
      $controller('KbnTimelineVisController', {
        $scope: $scope,
        $route: fakeRoute,
        $element: $element
      });
      $scope.$digest();
    });
  }

  describe('Controller', function () {

    it('Should set the correct options when change:vis event is triggered', function () {
      init();
      expect($scope.options).not.to.be.ok();

      $element.offsetHeight = 20;
      $scope.$emit('change:vis');

      var expectedOptions = {
        width: '100%',
        height: '175px',
        selectable: true,
        autoResize: false
      };

      expect($scope.options).to.eql(expectedOptions);
    });

    it('Should init search source without values', function () {
      init();
      expect($scope.savedObj.groups).to.be.undefined;
      expect($scope.savedObj.groupsOnSeparateLevels).to.be.undefined;
    });


    it('Should correctly init search sources for each group', function (done) {
      init();
      $scope.savedVis = {
        vis: {
          params: {
            groups: [{
              color: 'colorA',
              endField: 'endFieldA',
              groupLabel: 'groupLabelA',
              id: 'idA',
              indexPatternId: 'indexPatternIdA',
              labelField: 'labelFieldA',
              savedSearchId: 'savedSearchIdA',
              startField: 'startFieldA'
            },{
              color: 'colorB',
              endField: 'endFieldB',
              groupLabel: 'groupLabelB',
              id: 'idB',
              indexPatternId: 'indexPatternIdB',
              labelField: 'labelFieldB',
              savedSearchId: 'savedSearchIdB',
              startField: 'startFieldB'
            }]
          }
        }
      };

      $scope.$digest();
      // here there is async action in the controller to fetch the saved searches so
      // we have to wait a bit before they are ready

      setTimeout(function () {
        var group0 = $scope.savedObj.groups[0];
        var group1 = $scope.savedObj.groups[1];

        expect(group0.searchSource._id).to.equal('_kibi_timetable_ids_source_flagsavedSearchIdA');
        expect(group1.searchSource._id).to.equal('_kibi_timetable_ids_source_flagsavedSearchIdB');
        done();
      }, 200);
    });

  });
});
