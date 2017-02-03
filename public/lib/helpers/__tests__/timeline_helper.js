import expect from 'expect.js';
import TimelineHelper from '../timeline_helper';
import moment from 'moment';
import sinon from 'auto-release-sinon';

describe('Kibi Timeline', function () {
  describe('TimelineHelper', function () {
    describe('getSortOnStartFieldObject', function () {
      it('should return a sort ES object from startField', function () {
        expect(TimelineHelper.getSortOnStartFieldObject({ startField: 'date' })).to.eql({
          date: {
            order: 'asc'
          }
        });
      });

      it('should return a sort ES object from startFieldSequence', function () {
        expect(TimelineHelper.getSortOnStartFieldObject({ startFieldSequence: [ 'my.other', 'date' ] })).to.eql({
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
            aaa: 'bbb'
          }
        };
        const params = {
          labelField: 'aaa'
        };

        expect(TimelineHelper.pluckLabel(hit, params, notify)).to.be('bbb');
        sinon.assert.notCalled(notify.warning);
      });

      it('should return the label of an event kibi-style', function () {
        const hit = {
          _source: {
            aaa: 'bbb'
          }
        };
        const params = {
          labelField: 'aaa',
          labelFieldSequence: [ 'aaa' ]
        };

        expect(TimelineHelper.pluckLabel(hit, params, notify)).to.eql(['bbb']);
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
      it('should return Browser for default Kibana timezone ', function () {
        expect(TimelineHelper.changeTimezone('Browser')).to.be('Browser');
      });

      it('should return -04:00 for America/Nassau timezone ', function () {
        if (moment('America/Nassau').isDST()) {
          expect(TimelineHelper.changeTimezone('America/Nassau')).to.be('-04:00');
        } else {
          expect(TimelineHelper.changeTimezone('America/Nassau')).to.be('-05:00');
        }
      });

      it('should return 13 for Etc/GMT-13 timezone ', function () {
        expect(TimelineHelper.changeTimezone('Etc/GMT-13')).to.be('+13:00');
      });

      it('should return -4 for Etc/GMT+4 timezone ', function () {
        expect(TimelineHelper.changeTimezone('Etc/GMT+4')).to.be('-04:00');
      });

      it('should return 0 for Etc/GMT timezone ', function () {
        expect(TimelineHelper.changeTimezone('Etc/GMT')).to.be('+00:00');
      });

      it('should return 0 for Etc/GMT0 timezone ', function () {
        expect(TimelineHelper.changeTimezone('Etc/GMT0')).to.be('+00:00');
      });

      it('should return +09:30 for Australia/Darwin timezone ', function () {
        if (moment('Australia/Darwin').isDST()) {
          expect(TimelineHelper.changeTimezone('Australia/Darwin')).to.be('+08:30');
        } else {
          expect(TimelineHelper.changeTimezone('Australia/Darwin')).to.be('+09:30');
        }
      });

      it('should return +05:45 for Asia/Katmandu timezone ', function () {
        if (moment('Asia/Katmandu').isDST()) {
          expect(TimelineHelper.changeTimezone('Asia/Katmandu')).to.be('+04:45');
        } else {
          expect(TimelineHelper.changeTimezone('Asia/Katmandu')).to.be('+05:45');
        }
      });
    });
  });
});
