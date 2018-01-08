// @public

import HotClient from './HotClient';

const client = new HotClient();

process.on('message', m => {
  client.write(m);
});
