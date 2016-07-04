var sinon = require('auto-release-sinon');
var angular = require('angular');
var _ = require('lodash');
var ngMock = require('ngMock');
var expect = require('expect.js');

require('../lib/directives/kibi_select');

var $rootScope;
var $elem;

var init = function (initValue,items, objectType,include) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function (Private, _$rootScope_, $compile, Promise) {
    $rootScope = _$rootScope_;
    $rootScope.model = initValue;

    var selectHelper = Private(require('../lib/directives/kibi_select_helper'));
    $rootScope.action = sinon.stub(selectHelper, 'getObjects').returns(Promise.resolve(items));

    var select = '<kibi-select-port ng-model="model" object-type="' + objectType + '"';

    if (include !== null && include !== undefined) {
      $rootScope.include = include;
      select += ' include="include"';
    }

    $elem = angular.element(select + '></kibi-select-port>');

    $compile($elem)($rootScope);
    $elem.scope().$digest();
  });
};

describe('Kibi Directives', function () {
  describe('kibi-select-port directive', function () {
    afterEach(function () {
      $elem.remove();
    });

    function firstElementIsEmpty(options) {
      expect(options[0]).to.be.ok();
      expect(options[0].value).to.be('null');  // after porting to 4.4 it changed from '' to 'null'
      expect(options[0].text).to.be('');
    }

    it('should sort the items by label', function () {
      var items = [
        { value: 1, label: 'bbb' },
        { value: 2, label: 'aaa' }
      ];

      init(null,items, 'search');

      expect($rootScope.action.called).to.be.ok();

      var options = $elem.find('option');
      expect(options).to.have.length(3); // the joe element plus the null one

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('aaa');
      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('1');
      expect(options[2].text).to.be('bbb');
    });

    it('should sort the included items too', function () {
      var items = [ { value: 1, label: 'bbb' } ];
      var include = [ { value: 2, label: 'aaa' } ];

      init(null,items, 'search', include);

      expect($rootScope.action.called).to.be.ok();
      var options = $elem.find('option');
      expect(options).to.have.length(3);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('aaa');

      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('1');
      expect(options[2].text).to.be('bbb');
    });
  });
});