const expect = require('expect.js');
const timelineHelper = require('../timeline_helper')();
const moment = require('moment');

describe('Kibi Timeline', function () {
  describe('TimelineHelper', function () {
    describe('changeTimezone', function () {
      it('should return Browser for default Kibana timezone ', function () {
        expect(timelineHelper.changeTimezone('Browser')).to.be('Browser');
      });

      it('should return -04:00 for America/Nassau timezone ', function () {
        if (moment('America/Nassau').isDST()) {
          expect(timelineHelper.changeTimezone('America/Nassau')).to.be('-04:00');
        } else {
          expect(timelineHelper.changeTimezone('America/Nassau')).to.be('-05:00');
        }
      });

      it('should return 13 for Etc/GMT-13 timezone ', function () {
        expect(timelineHelper.changeTimezone('Etc/GMT-13')).to.be('+13:00');
      });

      it('should return -4 for Etc/GMT+4 timezone ', function () {
        expect(timelineHelper.changeTimezone('Etc/GMT+4')).to.be('-04:00');
      });

      it('should return 0 for Etc/GMT timezone ', function () {
        expect(timelineHelper.changeTimezone('Etc/GMT')).to.be('+00:00');
      });

      it('should return 0 for Etc/GMT0 timezone ', function () {
        expect(timelineHelper.changeTimezone('Etc/GMT0')).to.be('+00:00');
      });

      it('should return +09:30 for Australia/Darwin timezone ', function () {
        if (moment('Australia/Darwin').isDST()) {
          expect(timelineHelper.changeTimezone('Australia/Darwin')).to.be('+08:30');
        } else {
          expect(timelineHelper.changeTimezone('Australia/Darwin')).to.be('+09:30');
        }
      });

      it('should return +05:45 for Asia/Katmandu timezone ', function () {
        if (moment('Asia/Katmandu').isDST()) {
          expect(timelineHelper.changeTimezone('Asia/Katmandu')).to.be('+04:45');
        } else {
          expect(timelineHelper.changeTimezone('Asia/Katmandu')).to.be('+05:45');
        }
      });
    });
  });
});
