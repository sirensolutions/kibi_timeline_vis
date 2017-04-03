import ArrayHelper from '../helpers/array_helper';
import uiModules from 'ui/modules';
import addTemplate from '../directives/array_param_add.html';

uiModules
.get('kibana')
.directive('arrayParamAddPort', function (createNotifier, arrayParamServicePort) {
  const notify = createNotifier({
    location: 'Array Param Directive'
  });

  return {
    restrict: 'E',
    replace: true,
    scope: {
      model: '=',
      disable: '=?',
      label: '@',
      postAction: '&',
      default: '@' // used to define the default element added to the array. It is an empty object if unset
    },
    template: addTemplate,
    link: function ($scope, element, attrs) {
      $scope.required = attrs.hasOwnProperty('required');

      arrayParamServicePort.required = $scope.required;
      arrayParamServicePort.label = $scope.label;

      if (!$scope.model) {
        notify.error('You must initialise the model for the button labelled "' + $scope.label + '" !');
        return;
      }

      $scope.addParam = function () {
        let el = {};
        if ($scope.default) {
          let json;
          try {
            json = JSON.parse($scope.default);
            el = json;
          } catch (err) {
            el = $scope.default;
          }
        }
        ArrayHelper.add($scope.model, el, $scope.postAction);
      };

      // if it is required, add at least one element to the array
      if ($scope.required && $scope.model.length === 0) {
        $scope.addParam();
      }
    }
  };
}).directive('arrayParamUpPort', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      model: '=',
      index: '@',
      postAction: '&'
    },
    template: '<button class="btn btn-xs btn-default" ng-click="upParam()" > <i class="fa fa-caret-up"></i> </button>',
    link: function ($scope, element, attrs) {
      $scope.upParam = function () {
        ArrayHelper.up($scope.model, $scope.index, $scope.postAction);
      };
    }
  };
}).directive('arrayParamDownPort', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      model: '=',
      index: '@',
      postAction: '&'
    },
    template: '<button class="btn btn-xs btn-default" ng-click="downParam()" > <i class="fa fa-caret-down"></i> </button>',
    link: function ($scope, element, attrs) {
      $scope.downParam = function () {
        ArrayHelper.down($scope.model, $scope.index, $scope.postAction);
      };
    }
  };
}).directive('arrayParamRemovePort', function (createNotifier, arrayParamServicePort) {
  const notify = createNotifier({
    location: 'Array Param Directive'
  });

  return {
    restrict: 'E',
    replace: true,
    scope: {
      model: '=',
      index: '@',
      postAction: '&'
    },
    template: '<button class="btn btn-xs btn-danger" ng-click="removeParam()" > <i class="fa fa-times"></i> </button>',
    link: function ($scope, element, attrs) {
      $scope.removeParam = function () {
        if (!arrayParamServicePort.required || $scope.model.length > 1) {
          ArrayHelper.remove($scope.model, $scope.index, $scope.postAction);
        } else if (arrayParamServicePort.required) {
          notify.warning('You need to add at least one ' + arrayParamServicePort.label + '.');
        }
      };
    }
  };
}).factory('arrayParamServicePort', function () {
  return { required: false, label: '' };
});
