import Ember from 'ember';
import config from 'travis/config/environment';

let { service } = Ember.inject;

export default Ember.Service.extend({
  auth: service(),
  isShowingTriggerBuildModal: false,

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

  toggleTriggerBuildModal() {
    this.toggleProperty('isShowingTriggerBuildModal');
  }
});
