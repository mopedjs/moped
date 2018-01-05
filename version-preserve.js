const fs = require('fs');

const pkg = JSON.parse(
  fs.readFileSync(
    __dirname + '/packages/generator-moped-output-demo/package.json',
    'utf8',
  ),
);
fs.writeFileSync(
  __dirname + '/packages/generator-moped-output-demo/version.txt',
  pkg.version + '\n',
);
