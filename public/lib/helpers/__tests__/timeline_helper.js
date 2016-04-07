var expect = require('expect.js');
var timelineHelper = require('../timeline_helper')();

describe('TimelineHelper', function () {

  describe('getDescendantPropValue', function () {
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
});
