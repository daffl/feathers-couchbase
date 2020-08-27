const { NotFound } = require('@feathersjs/errors');
const { _ } = require('@feathersjs/commons');
const { AdapterService } = require('@feathersjs/adapter-commons');
const shortid = require('shortid');

class Service extends AdapterService {
  constructor (options = {}) {
    super(_.extend({
      id: 'id'
    }, options));

    this.cluster = options.cluster;
    this.bucket = this.cluster.bucket(options.name);
    this.Model = this.bucket.defaultCollection();
  }

  async query (query, options) {
    return this.cluster.query(query, {
      ...this.options.couchbase,
      ...options
    });
  }

  async _find (params = {}) {
    const query = `SELECT \`${this.options.name}\`.* FROM \`${this.options.name}\`;`;
    const { rows } = await this.query(query);

    return rows;
  }

  async _get (id, params = {}) {
    const query = `SELECT \`${this.options.name}\`.* FROM \`${this.options.name}\` USE KEYS '${id}'`;
    const { rows } = await this.query(query);

    if (rows && rows[0]) {
      return rows[0];
    }

    throw new NotFound(`No record found for id ${id}`);
  }

  async _create (data, params = {}) {
    const id = data[this.id] || shortid.generate();
    const doc = {
      ...data,
      [this.id]: id
    };
    
    await this.Model.insert(id, doc);

    return this._get(id, params);
  }

  async _update (id, data, params = {}) {
    await this.Model.replace(id, data);

    return this._get(id, params);
  }

  async _patch (id, data, params = {}) {
    const original = await this._get(id, params);

    return this._update(id, {
      ...original,
      ...data
    });
  }

  async _remove (id, params = {}) {
    const model = await this._get(id, params);

    await this.Model.remove(id);

    return model;
  }
}

module.exports = options => {
  return new Service(options);
};

module.exports.Service = Service;
