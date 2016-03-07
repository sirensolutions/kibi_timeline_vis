describe('Visualization', function () {
  var ngMock = require('ngMock');
  var expect = require('expect.js');

  var Vis;

  var vis;
  var init;

  beforeEach(ngMock.module('kibana', 'kibi_timeline_vis/kibi_timeline_vis'));

  beforeEach(ngMock.inject(function ($injector) {
    var Private = $injector.get('Private');
    Vis = Private(require('ui/Vis'));
    var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

    init = function () {
      vis = new Vis(indexPattern, {
        type: 'kibi_timeline'
      });

    };
  }));

  it('check vis', function () {
    init();
    expect(vis.type.name).to.be('kibi_timeline');
  });

});
