const setServer = require('@moped/start-server/dev-server');
setServer(require('./server').default);

module.hot.accept('./server', () => {
  setServer(require('./server').default);
});
