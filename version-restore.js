const fs = require('fs');

const pkg = JSON.parse(
  fs.readFileSync(
    __dirname + '/packages/generator-moped-output-demo/package.json',
    'utf8',
  ),
);
pkg.version = fs
  .readFileSync(
    __dirname + '/packages/generator-moped-output-demo/version.txt',
    'utf8',
  )
  .trim();
fs.writeFileSync(
  __dirname + '/packages/generator-moped-output-demo/package.json',
  JSON.stringify(pkg, null, '  ') + '\n',
);
