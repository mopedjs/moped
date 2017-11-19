const serveAssets = require('@moped/serve-assets');

serveAssets({
  manifestFileName: __dirname + '/../build/asset-manifest.json',
  publicDirectoryName: __dirname + '/../build',
  requestHandler(req, res) {
    if (req.url === '/favicon.ico') {
      res.statusCode = 404;
      res.end('Not Found');
    } else if (req.url === '/ajax-ftw') {
      res.end('' + process.pid);
    } else if (req.url === '/__/foo') {
      res.end('Server Rendered. Process ID: ' + process.pid);
    } else {
      throw new Error(
        'Do not request arbitrary urls from this server: ' + req.url,
      );
    }
  },
});
