import { transform, get, cloneDeep } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Timeline - Migration 1.
 *
 * Looks for groups object with an obsolete indexPattern property
 *
 * - delets it when found
 */

export default class Migration1 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._logger = configuration.logger;
    this._type = 'visualization';
  }

  static get description() {
    return 'Delete obsolete indexPattern property';
  }

  _isUpgradeable(visState) {
    if (visState.type === 'kibi_timeline_vis' && get(visState, 'params.groups')) {
      for (let i = 0; i < visState.params.groups.length; i++) {
        const group = visState.params.groups[i];
        if (group.indexPatternId !== undefined) {
          return true;
        }
      }
    }

    return false;
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type);
    return objects.reduce((count, obj) => {
      if (obj._source && obj._source.visState) {
        const visState = JSON.parse(obj._source.visState);
        if (this._isUpgradeable(visState)) {
          return count + 1;
        }
      }
      return count;
    }, 0);
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let count = 0;
    for (const obj of objects) {
      const visState = JSON.parse(obj._source.visState);
      if (this._isUpgradeable(visState)) {
        const newVisState = cloneDeep(visState);

        for (let i = 0; i < newVisState.params.groups.length; i++) {
          const group = newVisState.params.groups[i];
          if (group.indexPatternId !== undefined) {
            delete group.indexPatternId;
          }
        }

        obj._source.visState = JSON.stringify(newVisState);
        body += JSON.stringify({
          update: {
            _index: obj._index,
            _type: obj._type,
            _id: obj._id
          }
        }) + '\n' + JSON.stringify({ doc: obj._source }) + '\n';
        count++;
      }
    }

    if (count > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return count;
  }

}

