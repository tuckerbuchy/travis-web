import PageObject from 'travis/tests/page-object';

let {
  clickable,
  collection,
  hasClass,
  text,
  visitable
} = PageObject;

function existingRepositoriesCollection(scope) {
  return collection({
    scope: scope,
    itemScope: '.profile-hooklist .row',

    item: {
      name: text('a.profile-repo'),
      isActive: hasClass('active', '.switch'),
      toggle: clickable('.switch')
    }
  });
}

export default PageObject.create({
  visit: visitable('profile/:username'),
  name: text('.profile-header h1'),

  administerableRepositories: existingRepositoriesCollection('#administerable-hooks'),
  unadministerableRepositories: existingRepositoriesCollection('#unadministerable-hooks'),

  token: {
    scope: '.profile-user-last',

    isHidden: 'strong',

    show: clickable('a.profile-token-toggle'),
    value: text('strong')
  },

  accounts: collection({
    scope: '.profile-orgs',
    itemScope: '.account',

    item: {
      name: text('h2'),
      repositoryCount: text('p strong')
    }
  })
});
