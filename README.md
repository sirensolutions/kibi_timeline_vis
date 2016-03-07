## Kibi/Kibana Timeline Plugin    

This is a plugin for Kibana 4.3+ and Kibi 0.3 (our extention of Kibana for Relational Data).

The plugin displays a timeline of events taken from multiple saved searches.
    
##Installation

This plugin can be installed in both:
 
 * [Kibana: 4.3+](https://www.elastic.co/downloads/past-releases/kibana-4-3-0)
 * [Kibi: 0.3+](https://siren.solutions/kibi) (Coming soon ...)

### Automatic

```
bin/kibana plugin --install sirensolutions/kibi_timeline_vis/0.1.1
```

### Manual    

```
git clone https://github.com/sirensolutions/kibi_timeline_vis.git
cd kibi_timeline_vis
npm install
npm run build
cp -R build/kibi_timeline_vis KIBANA_FOLDER_PATH/installedPlugins/
```

## Uninstall

```
bin/kibana plugin  --remove kibi_timeline_vis
```
## Development

- Clone the repository at the same level of a Kibana > 4.2 clone
- If needed, switch to the same node version as Kibana using nvm 
  (e.g. `nvm use 0.12`)
- Install dependencies with `npm install`
- Install the plugin to Kibana and start watching for changes by running 
  `npm start`
- run tests with `npm test`

If you are running kibana from folder with a name other than kibana, e.g. kibi

```
gulp dev  --kibanahome=kibi
gulp test --kibanahome=kibi
```


## Breaking changes with respect to the version embedded in Kibi 0.1x and 0.2.x

Dependencies ported from kibi so it can be installed in kibana

```
ui/kibi/components/courier/_request_queue_wrapped
ui/kibi/directives/array_param
ui/kibi/directives/kibi_select
ui/kibi/helpers/array_helper
```


