var HotClient = require('./lib/HotClient').default;
var client = new HotClient();

process.on('message', m => {
  client.write(m);
});
