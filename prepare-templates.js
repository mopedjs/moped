const fs = require('fs');
const lsr = require('lsr').lsrSync;
const rimraf = require('rimraf').sync;

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((output, name) => {
      output[name] = obj[name];
      return output;
    }, {});
}

const mopedVersions = {};
fs.readdirSync(__dirname + '/packages/').forEach(dirname => {
  if (fs.statSync(__dirname + '/packages/' + dirname).isDirectory()) {
    const dirPkg = JSON.parse(
      fs.readFileSync(
        __dirname + '/packages/' + dirname + '/package.json',
        'utf8',
      ),
    );
    mopedVersions[dirPkg.name] = '^' + dirPkg.version;
  }
});

const usedMopedVersions = {};

lsr(__dirname + '/templates', {
  filter(entry) {
    return (
      entry.name !== 'node_modules' &&
      entry.name !== 'yarn.lock' &&
      entry.name !== '.cache' &&
      entry.name !== 'build' &&
      entry.name !== 'lib' &&
      entry.name !== 'coverage' &&
      entry.name !== 'yarn-error.lock'
    );
  },
}).forEach(entry => {
  const match = /^\.\/([^\/]+)\/?/.exec(entry.path);
  if (!match) {
    return;
  }
  const name = match[1];
  const localPath = entry.path.replace(/^\.\/[^\/]+\/?/, '');
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
    if (entry.name === 'package.json') {
      const pkg = JSON.parse(fs.readFileSync(entry.fullPath, 'utf8'));
      pkg.name = '<%= name %>';
      if (pkg.repository) {
        pkg.repository.url =
          'https://github.com/<%= ownerName %>/<%= name %>.git';
      }
      Object.keys(pkg.dependencies || {}).forEach(name => {
        if (mopedVersions[name]) {
          pkg.dependencies[name] =
            '<%= version_' + name.replace(/[^a-zA-Z]/g, '_') + '%>';
          usedMopedVersions[name] = mopedVersions[name];
        }
      });
      Object.keys(pkg.devDependencies || {}).forEach(name => {
        if (mopedVersions[name]) {
          pkg.devDependencies[name] =
            '<%= version_' + name.replace(/[^a-zA-Z]/g, '_') + '%>';
          usedMopedVersions[name] = mopedVersions[name];
        }
      });
      pkg.dependencies = sortObject(pkg.dependencies);
      pkg.devDependencies = sortObject(pkg.devDependencies);
      fs.writeFileSync(outputPath, JSON.stringify(pkg, null, '  ') + '\n');
    } else if (entry.name === 'env') {
      fs.writeFileSync(
        outputPath,
        fs
          .readFileSync(entry.fullPath, 'utf8')
          .replace(/app\-name/g, '<%= dbname %>'),
      );
    } else {
      fs.writeFileSync(outputPath, fs.readFileSync(entry.fullPath));
    }
  }
});

const pkg = JSON.parse(
  fs.readFileSync(__dirname + '/packages/generator-moped/package.json', 'utf8'),
);
Object.keys(usedMopedVersions).forEach(name => {
  if (pkg.dependencies[name]) {
    pkg.dependencies[name] = usedMopedVersions[name];
  } else {
    pkg.devDependencies[name] = usedMopedVersions[name];
  }
});
pkg.dependencies = sortObject(pkg.dependencies);
pkg.devDependencies = sortObject(pkg.devDependencies);

fs.writeFileSync(
  __dirname + '/packages/generator-moped/package.json',
  JSON.stringify(pkg, null, '  ') + '\n',
);
