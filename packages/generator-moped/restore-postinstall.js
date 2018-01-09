const fs = require('fs');

const pkg = JSON.parse(
  fs.readFileSync(
    __dirname + '/../generator-moped-output-demo/package.json',
    'utf8',
  ),
);
pkg.scripts = {
  postinstall: pkg.scripts._postinstall,
  ...pkg.scripts,
};
delete pkg.scripts._postinstall;
pkg.version = '0.0.0';

fs.writeFileSync(
  __dirname + '/../generator-moped-output-demo/package.json',
  JSON.stringify(pkg, null, '  ') + '\n',
);
