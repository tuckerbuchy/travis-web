import ExpandableRecordArray from 'travis/utils/expandable-record-array';
import Model from 'ember-data/model';
import Ember from 'ember';
import attr from 'ember-data/attr';
import { belongsTo } from 'ember-data/relationships';
import { service } from 'ember-decorators/service';
import { computed } from 'ember-decorators/object';
import { oneWay } from 'ember-decorators/object/computed';

const Repo = Model.extend({
  @service ajax: null,

  permissions: attr(),
  slug: attr(),
  description: attr(),
  'private': attr('boolean'),
  githubLanguage: attr(),
  active: attr(),
  owner: attr(),
  name: attr(),
  starred: attr('boolean'),

  @oneWay('owner.@type') ownerType: null,

  @oneWay('currentBuild.finishedAt') currentBuildFinishedAt: null,
  @oneWay('currentBuild.id') currentBuildId: null,


  defaultBranch: belongsTo('branch', {
    async: false
  }),
  currentBuild: belongsTo('build', {
    async: true, inverse: 'repoCurrentBuild'
  }),

  sshKey: function () {
    this.store.find('ssh_key', this.get('id'));
    return this.store.recordForId('ssh_key', this.get('id'));
  },

  @computed('id')
  envVars(id) {
    return this.store.filter('env_var', {
      repository_id: id
    }, function (v) {
      return v.get('repo.id') === id;
    });
  },

  @computed('id')
  builds(id) {
    var array, builds;
    builds = this.store.filter('build', {
      event_type: ['push', 'api', 'cron'],
      repository_id: id
    }, function (b) {
      let eventTypes = ['push', 'api', 'cron'];
      return b.get('repo.id') + '' === id + '' && eventTypes.includes(b.get('eventType'));
    });
    array = ExpandableRecordArray.create({
      type: 'build',
      content: Ember.A([])
    });
    array.load(builds);
    array.observe(builds);
    return array;
  },

  @computed('id')
  pullRequests(id) {
    const builds = this.store.filter('build', {
      event_type: 'pull_request',
      repository_id: id
    }, function (b) {
      return b.get('repo.id') + '' === id + '' && b.get('eventType') === 'pull_request';
    });
    const array = ExpandableRecordArray.create({
      type: 'build',
      content: Ember.A([])
    });
    array.load(builds);
    id = this.get('id');
    array.observe(builds);
    return array;
  },

  @computed('id')
  crons(id) {
    const builds = this.store.filter('build', {
      event_type: 'cron',
      repository_id: id
    }, function (b) {
      return b.get('repo.id') + '' === id + '' && b.get('eventType') === 'cron';
    });
    const array = ExpandableRecordArray.create({
      type: 'build',
      content: Ember.A([])
    });
    array.load(builds);
    id = this.get('id');
    array.observe(builds);
    return array;
  },

  @computed('id')
  branches(id) {
    return this.store.filter('branch', {
      repository_id: id
    }, function (b) {
      return b.get('repoId') === id;
    });
  },

  @computed('id')
  cronJobs(id) {
    return this.store.filter('cron', {
      repository_id: id
    }, function (cron) {
      return cron.get('branch.repoId') === id;
    });
  },

  // TODO: Stop performing a `set` as part of the cp!
  @computed('slug', '_stats')
  stats(slug, stats) {
    if (slug) {
      return stats || Ember.$.get(`https://api.github.com/repos/${slug}`, (data) => {
        this.set('_stats', data);
        return this.notifyPropertyChange('stats');
      }) && {};
    }
  },

  updateTimes() {
    let currentBuild = this.get('currentBuild');
    if (currentBuild) {
      return currentBuild.updateTimes();
    }
  },

  regenerateKey(options) {
    return this.get('ajax').ajax('/repos/' + this.get('id') + '/key', 'post', options);
  },

  fetchSettings() {
    return this.get('ajax').ajax('/repo/' + this.get('id') + '/settings', 'get', {
      headers: {
        'Travis-API-Version': '3'
      },
      forceAuth: true
    }).then(data => {
      return this._convertV3SettingsToV2(data['settings']);
    });
  },

  saveSetting(name, value) {
    return this.get('ajax').ajax(`/repo/${this.get('id')}/setting/${name}`, 'patch', {
      data: {
        'setting.value': value
      }, headers: {
        'Travis-API-Version': '3'
      }
    });
  },

  _convertV3SettingsToV2(v3Settings) {
    return v3Settings.reduce((v2Settings, v3Setting) => {
      if (v3Setting) {
        v2Settings[v3Setting.name] = v3Setting.value;
      }
      return v2Settings;
    }, {});
  }
});

Repo.reopenClass({
  recent() {
    return this.find();
  },

  accessibleBy(store, reposIdsOrlogin) {
    var promise, repos, reposIds;
    reposIds = reposIdsOrlogin;
    repos = store.filter('repo', function (repo) {
      let repoId = parseInt(repo.get('id'));
      return reposIds.includes(repoId);
    });
    promise = new Ember.RSVP.Promise(function (resolve, reject) {
      return store.query('repo', {
        'repository.active': 'true',
        sort_by: 'current_build:desc',
        limit: 30
      }).then(function () {
        return resolve(repos);
      }, function () {
        return reject();
      });
    });
    return promise;
  },

  search(store, ajax, query) {
    var promise, queryString, result;
    queryString = Ember.$.param({
      search: query,
      orderBy: 'name',
      limit: 5
    });
    promise = ajax.ajax('/repos?' + queryString, 'get');
    result = Ember.ArrayProxy.create({
      content: []
    });
    return promise.then(function (data) {
      let promises = data.repos.map(function (repoData) {
        return store.findRecord('repo', repoData.id).then(function (record) {
          result.pushObject(record);
          result.set('isLoaded', true);
          return record;
        });
      });
      return Ember.RSVP.allSettled(promises).then(function () {
        return result;
      });
    });
  },

  fetchBySlug(store, slug) {
    var adapter, modelClass, promise, repos;
    repos = store.peekAll('repo').filterBy('slug', slug);
    if (repos.get('length') > 0) {
      return repos.get('firstObject');
    } else {
      promise = null;
      adapter = store.adapterFor('repo');
      modelClass = store.modelFor('repo');
      promise = adapter.findRecord(store, modelClass, slug).then(function (payload) {
        var i, len, record, ref, repo, result, serializer;
        serializer = store.serializerFor('repo');
        modelClass = store.modelFor('repo');
        result = serializer.normalizeResponse(store, modelClass, payload, null, 'findRecord');
        repo = store.push({
          data: result.data
        });
        ref = result.included;
        for (i = 0, len = ref.length; i < len; i++) {
          record = ref[i];
          store.push({
            data: record
          });
        }
        return repo;
      });
      return promise['catch'](function () {
        var error;
        error = new Error('repo not found');
        error.slug = slug;
        throw error;
      });
    }
  }
});

export default Repo;
