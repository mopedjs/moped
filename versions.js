const fs = require('fs');
const cp = require('child_process');
const semver = require('semver');

const result = cp.spawnSync('git', ['tag', '--list']);
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(1);
}

const versions = new Map();
result.stdout
  .toString('utf8')
  .replace(/^(.+)\@([^@]+)$/gm, (_, name, version) => {
    const oldVersion = versions.get(name);
    if ((version = semver.valid(version))) {
      if (!oldVersion || semver.gt(version, oldVersion)) {
        versions.set(name, version);
      }
    }
  });

fs.readdirSync(__dirname + '/packages').forEach(dirname => {
  try {
    const pkgFilename = `${__dirname}/packages/${dirname}/package.json`;
    const pkg = JSON.parse(fs.readFileSync(pkgFilename, 'utf8'));
    if (
      versions.get(pkg.name) &&
      (!pkg.version || semver.gt(versions.get(pkg.name), pkg.version))
    ) {
      pkg.version = versions.get(pkg.name);
      fs.writeFileSync(pkgFilename, JSON.stringify(pkg, null, '  ') + '\n');
    }
  } catch (ex) {
    if (ex.code !== 'ENOENT' && ex.code !== 'ENOTDIR') {
      throw ex;
    }
  }
});
