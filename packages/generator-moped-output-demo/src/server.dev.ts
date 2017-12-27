// This file is the entry point for your server side code when running
// in development mode. It hot reloads your server for you

import setServer from '@moped/start-server/dev-server';

setServer(require('./server').default);

(module as any).hot &&
  (module as any).hot.accept('./server', () => {
    setServer(require('./server').default);
  });
