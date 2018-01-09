const fs = require('fs');
const cp = require('child_process');
const crypto = require('crypto');
const rimraf = require('rimraf').sync;
const pack = require('tar-pack').pack;

rimraf(__dirname + '/generator/');
fs.mkdirSync(__dirname + '/generator/');
fs.writeFileSync(
  __dirname + '/generator/package.json',
  JSON.stringify(
    {
      name: 'mg',
      dependencies: {
        yo: '*',
        'generator-moped': require('./packages/generator-moped/package.json')
          .version,
      },
    },
    null,
    '  ',
  ) + '\n',
);
const result = cp.spawnSync('yarn', [], {
  cwd: __dirname + '/generator/',
  stdio: 'inherit',
});
if (result.status) {
  process.exit(result.status);
}

function updateVersions(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  fs.readdirSync(__dirname + '/packages/').forEach(dirname => {
    if (fs.statSync(__dirname + '/packages/' + dirname).isDirectory()) {
      const dirPkg = JSON.parse(
        fs.readFileSync(
          __dirname + '/packages/' + dirname + '/package.json',
          'utf8',
        ),
      );
      if (pkg.dependencies[dirPkg.name]) {
        pkg.dependencies[dirPkg.name] = '^' + dirPkg.version;
      }
      if (pkg.devDependencies[dirPkg.name]) {
        pkg.devDependencies[dirPkg.name] = '^' + dirPkg.version;
      }
    }
  });
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '  ') + '\n');
}

const pkgJsonPath =
  __dirname +
  '/generator/node_modules/generator-moped/generators/app/templates/package.json';
updateVersions(pkgJsonPath);

updateVersions(__dirname + '/templates/app/package.json');

pack(__dirname + '/generator')
  .pipe(
    fs.createWriteStream(__dirname + '/packages/scripts/lib/generator.tar.gz'),
  )
  .on('close', () => {
    const hash = crypto.createHash('sha512');
    hash.update(fs.readFileSync(__dirname + '/generator/yarn.lock'));
    hash.update(fs.readFileSync(pkgJsonPath));
    const hashString = hash
      .digest('hex')
      .toLowerCase()
      .trim();
    let oldHash = null;
    try {
      oldHash = fs
        .readFileSync(__dirname + '/packages/scripts/lib/generator.sha', 'utf8')
        .trim();
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw ex;
      }
    }
    if (hashString !== oldHash) {
      console.log('hash changed');
      fs.writeFileSync(
        __dirname + '/packages/scripts/lib/generator.sha',
        hashString,
      );
    }
    rimraf(__dirname + '/generator/');
  });
