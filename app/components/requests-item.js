import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['request-item'],
  classNameBindings: ['requestClass'],
  tagName: 'li',

  isGHPages: Ember.computed('request.message', function () {
    let message = this.get('request.message');
    if (message === 'github pages branch') {
      return true;
    } else {
      return false;
    }
  }),

  requestClass: Ember.computed('request.result', function () {
    return this.get('request.result');
  }),

  type: Ember.computed('request.isPullRequest', function () {
    if (this.get('request.isPullRequest')) {
      return 'pull_request';
    } else {
      return 'push';
    }
  }),

  status: Ember.computed('request.result', function () {
    return this.get('request.result').capitalize();
  }),

  message: Ember.computed('features.proVersion', 'request.message', function () {
    let message = this.get('request.message');
    if (this.get('features.proVersion') && message === 'private repository') {
      return '';
    } else if (!message) {
      return 'Build created successfully ';
    } else {
      return message;
    }
  })
});
