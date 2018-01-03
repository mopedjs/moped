const fs = require('fs');
const lsr = require('lsr').lsrSync;
const rimraf = require('rimraf').sync;

lsr(__dirname + '/templates', {
  filter(entry) {
    return entry.name !== 'node_modules' && entry.name !== 'yarn.lock';
  },
}).forEach(entry => {
  const match = /\.\/([^\/]+)\/?/.exec(entry.path);
  if (!match) {
    return;
  }
  const name = match[1];
  const localPath = entry.path.replace(/\.\/[^\/]+\/?/, '');
  const outputPath =
    __dirname +
    '/packages/generator-moped/generators/' +
    name +
    '/templates/' +
    localPath;
  if (entry.isDirectory()) {
    try {
      fs.mkdirSync(outputPath);
    } catch (ex) {
      if (ex.code !== 'EEXIST') {
        throw ex;
      }
      rimraf(outputPath);
      fs.mkdirSync(outputPath);
    }
  }
  if (entry.isFile()) {
    if (/package\.json$/.test(entry.path)) {
      const pkg = JSON.parse(fs.readFileSync(entry.fullPath, 'utf8'));
      pkg.name = '<%= name %>';
      fs.writeFileSync(outputPath, JSON.stringify(pkg, null, '  ') + '\n');
    } else if (/\.env$/.test(entry.path)) {
      fs.writeFileSync(
        outputPath,
        fs
          .readFileSync(entry.fullPath, 'utf8')
          .replace(/app\-name/g, '<%= name %>'),
      );
    } else {
      fs.writeFileSync(outputPath, fs.readFileSync(entry.fullPath));
    }
  }
});
