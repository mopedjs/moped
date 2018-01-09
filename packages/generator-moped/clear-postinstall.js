const fs = require('fs');

const pkg = JSON.parse(
  fs.readFileSync(
    __dirname + '/../generator-moped-output-demo/package.json',
    'utf8',
  ),
);
pkg.scripts = {
  _postinstall: pkg.scripts.postinstall,
  ...pkg.scripts,
};
delete pkg.scripts.postinstall;
pkg.version = fs
  .readFileSync(
    __dirname + '/../generator-moped-output-demo/version.txt',
    'utf8',
  )
  .trim();

fs.writeFileSync(
  __dirname + '/../generator-moped-output-demo/package.json',
  JSON.stringify(pkg, null, '  ') + '\n',
);
