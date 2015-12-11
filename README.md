## Kibi Timeline Plugin    

    
### Manuall installation

```
git clone https://github.com/sirensolutions/kibi-timeline-plugin.git
cd kibi-timeline-plugin
npm install
npm run build
cp -R build/kibi-timeline-plugin KIBANA_FOLDER_PATH/installedPlugins/
```

#### Development

- Clone the repository at the same level of a Kibana > 4.2 clone
- If needed, switch to the same node version as Kibana using nvm 
  (e.g. `nvm use 0.12`)
- Install dependencies with `npm install`
- Install the plugin to Kibana and start watching for changes by running 
  `npm start`
- run tests with `npm test`

#### Breaking changes with respect to the version embedded in Kibi 0.1x and 0.2.x

This plugin is not suitable to be installed over kibana
as it depends on kibi code 

```
ui/kibi/components/courier/_request_queue_wrapped
ui/kibi/directives/array_param
ui/kibi/directives/kibi_select
ui/kibi/helpers/array_helper
```


