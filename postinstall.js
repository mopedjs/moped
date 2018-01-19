const {readdirSync, writeFileSync, statSync, readFileSync} = require('fs');

const LICENSE = readFileSync(__dirname + '/LICENSE.md');

const tsconfigBuild = `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "lib"
  }
}`;
const tsconfigBuildYeoman = `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "generators-src",
    "outDir": "generators"
  }
}`;
const tsconfig = `{
  "extends": "../../tsconfig.json"
}`;

const dependencies = require('./package.json').devDependencies;
readdirSync(__dirname + '/packages').forEach(directory => {
  if (directory === 'generator-moped-output-demo') {
    return;
  }
  if (!statSync(__dirname + '/packages/' + directory).isDirectory()) {
    return;
  }
  let pkg = {};
  try {
    pkg = JSON.parse(
      readFileSync(
        __dirname + '/packages/' + directory + '/package.json',
        'utf8',
      ),
    );
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
  }
  writeFileSync(__dirname + '/packages/' + directory + '/LICENSE.md', LICENSE);
  writeFileSync(
    __dirname + '/packages/' + directory + '/tsconfig.json',
    tsconfig,
  );
  writeFileSync(
    __dirname + '/packages/' + directory + '/tsconfig.build.json',

    pkg['@moped/target'] === 'yeoman' ? tsconfigBuildYeoman : tsconfigBuild,
  );
  const before = JSON.stringify(pkg);
  if (!pkg.name) {
    pkg.name = '@moped/' + directory;
  }
  if (!pkg.version) {
    pkg.version = '0.0.0';
  }
  if (!pkg.description) {
    pkg.description = '';
  }
  if (!pkg.main) {
    pkg.main = './lib/index.js';
  }
  if (!pkg.types) {
    pkg.types = './lib/index.d.ts';
  }
  if (!pkg.dependencies) {
    pkg.dependencies = {};
  }
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
  pkg.dependencies['@types/node'] = dependencies['@types/node'];
  if (!/\-demo$/.test(directory)) {
    pkg.scripts.prepublish =
      'node ../../prebuild ' +
      directory +
      '&& tsc -p tsconfig.build.json && node ../../prepare ' +
      directory;
    const entries = pkg['dependency-check-entries'] || [];
    const checkRequired =
      'dependency-check package.json' +
      entries.map(e => ' "' + e + '"').join('') +
      ' --quiet';
    const checkUsed =
      'dependency-check ./package.json' +
      entries.map(e => ' "' + e + '"').join('') +
      ' --quiet --unused --no-dev' +
      Object.keys(pkg.dependencies || {})
        .concat(Object.keys(pkg.devDependencies || {}))
        .filter(name => name.startsWith('@types') || name === 'bicycle')
        .map(name => ' --ignore-module "' + name + '"')
        .join('');
    if (
      directory !== 'babel-preset' &&
      !directory.startsWith('rule-') &&
      directory !== 'webpack-config'
    ) {
      pkg.scripts['dependency-check'] = checkRequired + ' && ' + checkUsed;
    } else {
      pkg.scripts['dependency-check'] = checkRequired;
    }
  }

  pkg.repository =
    'https://github.com/mopedjs/moped/tree/master/packages/' + directory;
  pkg.license = 'MIT';
  if (!pkg.private) {
    pkg.publishConfig = {
      access: 'public',
    };
  }
  const after = JSON.stringify(pkg);
  if (before === after) {
    return;
  }
  writeFileSync(
    __dirname + '/packages/' + directory + '/package.json',
    JSON.stringify(pkg, null, '  ') + '\n',
  );
});
