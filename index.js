module.exports = function (kibana) {

  const migrations = [
  ];

  return new kibana.Plugin({
    name: 'kibi_timeline',
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      visTypes: [
        'plugins/kibi_timeline_vis/kibi_timeline_vis'
      ]
    },
    init: function(server) {
      server.expose('getMigrations', () => migrations);
    }
  });
};

