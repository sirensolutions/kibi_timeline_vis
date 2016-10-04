var expect = require('expect.js');
var timelineHelper = require('../timeline_helper')();

describe('TimelineHelper', function () {

  describe('getDescendantPropValue', function () {
    it('no data', function () {
      var o = {};
      expect(timelineHelper.getDescendantPropValue(o, 'p1.p2')).to.be(undefined);
    });

    it('one level', function () {
      var o = {
        p1: {
          p2: 7
        }
      };
      expect(timelineHelper.getDescendantPropValue(o, 'p1.p2')).to.be(7);
    });

    it('one level array', function () {
      var o = {
        p1: {
          p2: [7]
        }
      };
      expect(timelineHelper.getDescendantPropValue(o, 'p1.p2')).to.eql([7]);
    });


    it('two levels', function () {
      var o = {
        p1: {
          p2: {
            p3: 7
          }
        }
      };
      expect(timelineHelper.getDescendantPropValue(o, 'p1.p2.p3')).to.be(7);
    });

    it('two levels array', function () {
      var o = {
        p1: {
          p2: {
            p3: [7]
          }
        }
      };
      expect(timelineHelper.getDescendantPropValue(o, 'p1.p2.p3')).to.eql([7]);
    });
  });

  describe('changeTimezone', function () {
    it('should return Browser for default Kibana timezone ', function () {
      expect(timelineHelper.changeTimezone('Browser')).to.be('Browser');
    });

    it('should return -04:00 for America/Nassau timezone ', function () {
      expect(timelineHelper.changeTimezone('America/Nassau')).to.be('-04:00');
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
      expect(timelineHelper.changeTimezone('Australia/Darwin')).to.be('+09:30');
    });

    it('should return +05:45 for Asia/Katmandu timezone ', function () {
      expect(timelineHelper.changeTimezone('Asia/Katmandu')).to.be('+05:45');
    });
  });
});
