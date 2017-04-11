import Ember from 'ember';
import computed from 'ember-computed-decorators';
import config from 'travis/config/environment';

const { service } = Ember.inject;

export default Ember.Component.extend({
  statusImages: service(),
  externalLinks: service(),
  isShowingTriggerBuildModal: false,
  isShowingStatusBadgeModal: false,

  @computed('repo.slug', 'repo.defaultBranch.name')
  statusImageUrl(slug, branchName) {
    return this.get('statusImages').imageUrl(slug, branchName);
  },

  @computed('repo.slug')
  urlGithub(slug) {
    return this.get('externalLinks').githubRepo(slug);
  },

  // @TODO fix this copy pasta :/
  branches: Ember.computed('popupName', 'repo', function () {
    let repoId = this.get('repo.id');

    let array = Ember.ArrayProxy.create({ content: [] }),
      apiEndpoint = config.apiEndpoint,
      options = {
        headers: {
          'Travis-API-Version': '3'
        }
      };

    if (this.get('auth.signedIn')) {
      options.headers.Authorization = `token ${this.auth.token()}`;
    }

    let url = `${apiEndpoint}/repo/${repoId}/branches?limit=100`;
    Ember.$.ajax(url, options).then(response => {
      if (response.branches.length) {
        let branchNames = response.branches.map(branch => branch.name);
        array.pushObjects(branchNames);
      } else {
        array.pushObject('master');
      }
    });

    return array;
  }),

  actions: {
    toggleStatusBadgeModal() {
      this.toggleProperty('isShowingStatusBadgeModal');
    },
    toggleTriggerBuildModal() {
      this.toggleProperty('isShowingTriggerBuildModal');
    }
  }
});
