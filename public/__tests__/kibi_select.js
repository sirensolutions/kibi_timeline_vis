import SelectHelperProvider from '../lib/directives/kibi_select_helper';
import sinon from 'auto-release-sinon';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import '../lib/directives/kibi_select';

let $rootScope;
let $elem;

const init = function (initValue,items, objectType,include) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function (Private, _$rootScope_, $compile, Promise) {
    $rootScope = _$rootScope_;
    $rootScope.model = initValue;

    const selectHelper = Private(SelectHelperProvider);
    $rootScope.action = sinon.stub(selectHelper, 'getObjects').returns(Promise.resolve(items));

    let select = '<kibi-select-port ng-model="model" object-type="' + objectType + '"';

    if (include !== null && include !== undefined) {
      $rootScope.include = include;
      select += ' include="include"';
    }

    $elem = angular.element(select + '></kibi-select-port>');

    $compile($elem)($rootScope);
    $elem.scope().$digest();
  });
};

describe('Kibi Timeline', function () {
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
        const items = [
          { value: 1, label: 'bbb' },
          { value: 2, label: 'aaa' }
        ];

        init(null,items, 'search');

        expect($rootScope.action.called).to.be.ok();

        const options = $elem.find('option');
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
        const items = [ { value: 2, label: 'aaa' } ];
        const include = [ { value: 1, label: 'bbb' } ];

        init(null,items, 'search', include);

        expect($rootScope.action.called).to.be.ok();
        const options = $elem.find('option');
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
});
