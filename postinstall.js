const {readdirSync, writeFileSync, statSync, readFileSync} = require('fs');
const prettier = require('prettier');

const LICENSE = readFileSync(__dirname + '/LICENSE.md');

const tsconfigBuild = `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "lib"
  }
}`;
const tsconfig = `{
  "extends": "../../tsconfig.json"
}`;

const prettierOptions = prettier.resolveConfig(__filename, {});

const dependencies = require('./package.json').devDependencies;
readdirSync(__dirname + '/packages').forEach(directory => {
  if (!statSync(__dirname + '/packages/' + directory).isDirectory()) {
    return;
  }
  writeFileSync(__dirname + '/packages/' + directory + '/LICENSE.md', LICENSE);
  writeFileSync(
    __dirname + '/packages/' + directory + '/tsconfig.json',
    tsconfig,
  );
  writeFileSync(
    __dirname + '/packages/' + directory + '/tsconfig.build.json',
    tsconfigBuild,
  );
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
  if (!pkg.devDependencies) {
    pkg.devDependencies = {};
  }
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
  pkg.dependencies['@types/node'] = dependencies['@types/node'];
  pkg.scripts.prepublish = 'tsc -p tsconfig.build.json';

  pkg.repository =
    'https://github.com/mopedjs/moped/tree/master/packages/' + directory;
  pkg.license = 'MIT';

  prettierOptions
    .then(options => {
      options.parser = 'json';
      const output = prettier.format(JSON.stringify(pkg), options);
      writeFileSync(
        __dirname + '/packages/' + directory + '/package.json',
        output,
      );
    })
    .catch(ex => {
      console.error(ex);
      process.exit(1);
    });
});
