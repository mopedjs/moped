const writeFileSync = require('fs').writeFileSync;
const babel = require('babel-core');
const lsrSync = require('lsr').lsrSync;

lsrSync(__dirname + '/packages/' + process.argv[2] + '/lib').forEach(entry => {
  if (entry.isFile() && /\.js$/.test(entry.path)) {
    writeFileSync(
      entry.fullPath,
      babel.transformFileSync(entry.fullPath, {
        babelrc: false,
        presets: [require.resolve('./packages/babel-preset/browser')],
      }).code,
    );
  }
});
