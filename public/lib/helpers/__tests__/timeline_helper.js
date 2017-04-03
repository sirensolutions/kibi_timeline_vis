import expect from 'expect.js';
import TimelineHelper from '../timeline_helper';
import moment from 'moment';
import sinon from 'auto-release-sinon';

describe('Kibi Timeline', function () {
  describe('TimelineHelper', function () {
    describe('getSortOnFieldObject', function () {
      it('should return a sort ES object from startField', function () {
        expect(TimelineHelper.getSortOnFieldObject('date', '', 'asc')).to.eql({
          date: {
            order: 'asc'
          }
        });
      });

      it('should return a sort ES object from startFieldSequence', function () {
        expect(TimelineHelper.getSortOnFieldObject('', [ 'my.other', 'date' ], 'asc')).to.eql({
          'my.other.date': {
            order: 'asc'
          }
        });
      });
    });

    describe('pluckLabel', function () {
      let notify;

      beforeEach(function () {
        notify = {
          warning: sinon.spy()
        };
      });

      it('should return the label of an event kibana-style', function () {
        const hit = {
          _source: {
            aaa: {
              bbb: {
                ccc: 'ddd'
              }
            }
          }
        };
        const params = {
          labelField: 'aaa.bbb.ccc'
        };

        expect(TimelineHelper.pluckLabel(hit, params, notify)).to.eql([ 'ddd' ]);
        sinon.assert.notCalled(notify.warning);
      });

      it('should return the label of an event kibi-style', function () {
        const hit = {
          _source: {
            aaa: {
              bbb: {
                ccc: 'ddd'
              }
            }
          }
        };
        const params = {
          labelField: 'aaa.bbb.ccc',
          labelFieldSequence: [ 'aaa', 'bbb', 'ccc' ]
        };

        expect(TimelineHelper.pluckLabel(hit, params, notify)).to.eql(['ddd']);
        sinon.assert.notCalled(notify.warning);
      });

      it('should return N/A if the event does not a value for the labelField', function () {
        const hit = {
          _source: {
            ccc: 'ddd'
          }
        };
        const params = {
          labelField: 'aaa',
          labelFieldSequence: [ 'aaa' ]
        };

        expect(TimelineHelper.pluckLabel(hit, params, notify)).to.be('N/A');
        sinon.assert.notCalled(notify.warning);
      });

      it('should return a label value in case of multi-fields, kibi-style', function () {
        const hit = {
          _source: {
            'city': 'Galway'
          },
          fields: {
            'city.raw': ['Galway']
          }
        };
        const params = {
          labelField: 'city.raw',
          labelFieldSequence: [ 'city.raw' ]
        };

        expect(TimelineHelper.pluckLabel(hit, params)).to.eql('Galway');
        sinon.assert.notCalled(notify.warning);
      });

      it('should return a label value in case of multi-fields, kibana-style', function () {
        const hit = {
          _source: {},
          fields: {
            'city.raw': ['Galway']
          }
        };
        const params = {
          labelField: 'city.raw',
          labelFieldSequence: undefined
        };

        expect(TimelineHelper.pluckLabel(hit, params)).to.eql('Galway');
        sinon.assert.notCalled(notify.warning);
      });
    });

    describe('pluckDate', function () {

      it('should return a date string value and raw value, in case of multi-fields', function () {
        const hit = {
          _source: {},
          fields: {
            'arrive.raw': [ Date.parse('Wed, 09 Aug 1995 00:00:00 GMT') ]
          }
        };
        const params = {
          startField: 'arrive.raw',
          startFieldSequence: [ 'arrive.raw' ],
        };

        const date = TimelineHelper.pluckDate(hit, params.startField, params.startFieldSequence);
        expect(date).to.eql([ 807926400000 ]);
      });

    });

    describe('pluckHighlights', function () {
      const highlightTags = {
        pre: '<em>',
        post: '</em>'
      };

      it('should return an empty string if the hit has no highlight object', function () {
        const hit = {
          _source: {
            aaa: 'bbb'
          }
        };

        expect(TimelineHelper.pluckHighlights(hit, highlightTags)).to.be('');
      });

      it('should return the highlighted terms in the event', function () {
        const hit = {
          _source: {
            field1: 'bbb'
          },
          highlight: {
            field1: [
              '<em>ddd</em>nope',
              'nope<em>bbb</em>nope',
              'nope<em>ccc</em>'
            ],
            field2: [
              'nope<em>bbb</em>nope'
            ]
          }
        };

        expect(TimelineHelper.pluckHighlights(hit, highlightTags)).to.be('bbb: 2, ccc: 1, ddd: 1');
      });
    });

    describe('changeTimezone', function () {
      it('should return Browser for default Kibana timezone', function () {
        expect(TimelineHelper.changeTimezone('Browser')).to.be('Browser');
      });

      it('should be a moment object', function () {
        expect(TimelineHelper.changeTimezone('America/Nassau')).to.match(/[-+][0-9]{2}:[0-9]{2}/);
      });
    });

  });
});
