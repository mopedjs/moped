const writeFileSync = require('fs').writeFileSync;
const unlinkSync = require('fs').unlinkSync;
const babel = require('babel-core');
const lsrSync = require('lsr').lsrSync;

lsrSync(__dirname + '/packages/' + process.argv[2] + '/lib').forEach(entry => {
  if (entry.isFile() && /\.jsx?$/.test(entry.path)) {
    writeFileSync(
      entry.fullPath.replace(/\.jsx$/, '.js'),
      babel.transformFileSync(entry.fullPath, {
        babelrc: false,
        presets: [require.resolve('./packages/babel-preset/browser')],
      }).code,
    );
    if (/\.jsx$/.test(entry.fullPath)) {
      unlinkSync(entry.fullPath);
    }
  }
});
