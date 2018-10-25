/**
 * Defines the following objects:
 *
 * - a timeline visualization which should be upgraded
 * - a timeline visualization which should NOT be upgraded
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'timeline-to-upgrade'
    }
  },
  {
    description : '',
    kibanaSavedObjectMeta : {},
    title : 'timeline1',
    uiStateJSON : '{}',
    version : 1,
    visState : JSON.stringify({
      title: 'timeline1',
      type: 'kibi_timeline_vis',
      params: {
        groups: [
          {
            id: 5000,
            indexPatternId: 'article',
          }
        ]
      }
    })
  },
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'timeline-to-not-upgrade'
    }
  },
  {
    description : '',
    kibanaSavedObjectMeta : {},
    title : 'timeline2',
    uiStateJSON : '{}',
    version : 1,
    visState : JSON.stringify({
      title: 'timeline2',
      type: 'kibi_timeline_vis'
    })
  }
];
