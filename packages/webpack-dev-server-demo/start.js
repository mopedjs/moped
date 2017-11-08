const getHostInfo = require('@moped/get-host-info');
const createDevServer = require('@moped/webpack-dev-server');
const webpack = require('webpack');
const config = require('./webpack.config');

getHostInfo().then(info => {
  const server = createDevServer(webpack(config), {
    publicDirectoryName: __dirname + '/src/public',
  });
  server.listen(info.frontendPort, info.host, () => {
    console.log('Listening on port ' + info.frontendPort);
  });
});
