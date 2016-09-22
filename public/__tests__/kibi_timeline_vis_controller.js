describe('Kibi Controllers', function () {
  var $scope;
  var ngMock = require('ngMock');
  var expect = require('expect.js');

  require('../kibi_timeline_vis_controller');

  function init(options) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.inject(function ($rootScope, $controller) {
      $scope = $rootScope;
      var $element = '<div></div>';

      $controller('KbnTimelineVisController', { $scope:$scope, $element:$element });
      $scope.$digest();
    });
  }

  describe('Kibi Timeline Visualization controller', function () {
    it('should not render templates if no query is set', function () {
      var params = {};

      init({ params: params });
      $scope.renderTemplates();
      expect($scope).to.be.ok();
    });
  });
});
