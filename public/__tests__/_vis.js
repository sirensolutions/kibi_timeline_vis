import { stubbedLogstashIndexPatternService } from 'fixtures/stubbed_logstash_index_pattern';
import { VisProvider } from 'ui/vis';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import '../kibi_timeline';

describe('Kibi Timeline', function () {
  describe('Visualization', function () {

    let vis;

    beforeEach(function () {

      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');
        $provide.constant('kibiEnterpriseEnabled', false);
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.inject(function ($injector, Private) {
        const Vis = Private(VisProvider);
        const indexPattern = Private(stubbedLogstashIndexPatternService);
        vis = new Vis(indexPattern, {
          type: 'kibi_timeline'
        });
      });
    });

    it('check vis', function () {
      expect(vis.type.name).to.be('kibi_timeline');
    });

  });
});
