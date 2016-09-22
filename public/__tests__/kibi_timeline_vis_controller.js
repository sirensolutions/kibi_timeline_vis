var ngMock = require('ngMock');
var expect = require('expect.js');
var $ = require('jquery');
require('../kibi_timeline_vis_controller');

describe('Kibi Timeline', function () {
  var $scope;
  var $element;

  function init(options) {

    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.inject(function (_$rootScope_, $controller) {
      var fakeRoute = {
        current: {
          locals: {
          }
        }
      };

      $scope = _$rootScope_;
      $scope.vis = {
        id: 'a'
      };
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

  });
});
