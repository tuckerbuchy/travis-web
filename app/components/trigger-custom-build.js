import Ember from 'ember';
import { task } from 'ember-concurrency';
import YAML from 'npm:yamljs';

const { service } = Ember.inject;

export default Ember.Component.extend({
  ajax: service(),
  flashes: service(),
  router: service(),

  classNames: ['trigger-build-modal'],
  triggerBuildBranch: '',
  triggerBuildMessage: '',
  triggerBuildConfig: '',
  triggering: false,

  branches: Ember.computed.filterBy('repo.branches', 'exists_on_github', true),

  didReceiveAttrs() {
    this._super(...arguments);
    this.set('triggerBuildBranch', this.get('repo.defaultBranch.name'));
  },

  sendTriggerRequest: task(function* () {
    this.set('triggering', true);
    let config = YAML.parse(this.get('triggerBuildConfig'));

    let runInterval = 0;
    if (!Ember.testing) {
      runInterval = 2000;
    }

    let body = {
      request: {
        branch: this.get('triggerBuildBranch'),
        config: config
      }
    };

    if (! Ember.isEmpty(this.get('triggerBuildMessage'))) {
      body.request.message = this.get('triggerBuildMessage');
    }

    try {
      yield this.get('ajax').postV3(`/repo/${this.get('repo.id')}/requests`, body)
        .then((data) => {
          let reqId = data.request.id;

          Ember.run.later(this, function () {
            this.get('ajax')
              .ajax(`/repo/${this.get('repo.id')}/request/${reqId}`, 'GET',
                    { headers: { 'Travis-API-Version': '3' } })
              .then((data) => {
                let reqResult = data.result;
                let triggeredBuild = data.builds ? data.builds[0] : null;

                this.set('triggering', false);

                if (reqResult === 'approved' && triggeredBuild) {
                  this.get('onClose')();
                  this.get('router').transitionTo('build', this.get('repo'), triggeredBuild.id);
                } else if (reqResult === 'rejected') {
                  this.get('flashes').error('Your build request was rejected.');
                  this.get('router').transitionTo('requests', this.get('repo'));
                  this.get('onClose')();
                } else { // pending etc
                  this.get('flashes').notice('Your build was not ready yet.');
                  this.get('router').transitionTo('requests', this.get('repo'));
                  this.get('onClose')();
                }
              });
          }, runInterval);
        });
    } catch (e) {
      this.get('flashes').error('Oops, something went wrong, please try again.');
      this.get('onClose')();
    }
  }),

  actions: {
    triggerCustomBuild() {
      this.get('sendTriggerRequest').perform();
    },
    toggleTriggerBuildModal() {
      this.get('onClose')();
    }
  }
});
