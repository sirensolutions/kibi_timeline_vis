import TemplateVisTypeTemplateVisTypeProvider from 'ui/template_vis_type/template_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import 'plugins/kibi_timeline_vis/kibi_timeline_vis.less';
import 'plugins/kibi_timeline_vis/kibi_timeline_vis_controller';
import 'plugins/kibi_timeline_vis/kibi_timeline_vis_params';
import visTypesRegisty from 'ui/registry/vis_types';
import template from 'plugins/kibi_timeline_vis/kibi_timeline_vis.html';

function KibiTimelineVisProvider(Private) {
  const TemplateVisType = Private(TemplateVisTypeTemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'kibi_timeline',
    title: 'Kibi timeline',
    icon: 'fak-timeline',
    description: 'Timeline widget for visualization of events',
    template,
    params: {
      defaults: {
        groups: [],
        groupsOnSeparateLevels: false,
        selectValue: 'id',
        notifyDataErrors: false,
        syncTime: false
      },
      editor: '<kibi-timeline-vis-params></kibi-timeline-vis-params>'
    },
    defaultSection: 'options',
    requiresSearch: false,
    requiresMultiSearch: true,
    delegateSearch: true
  });
}

visTypesRegisty.register(KibiTimelineVisProvider);
