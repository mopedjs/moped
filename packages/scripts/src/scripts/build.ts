// Do this as the first thing so that any code reading it knows the right env.
import '@moped/env/production';
import {Environment, Platform} from '@moped/webpack-config';
import * as webpack from 'webpack';
import chalk from 'chalk';
import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from '../helpers/FileSizeReporter';
import * as Paths from '../helpers/Paths';
import webpackConfig from '../helpers/webpack-config';
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const fs = require('fs-extra');

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';

const appPkg = require(Paths.appPackageJson);

// don't end in trailing `/` because it looks nicer to always have `PUBLIC_URL + '/foo'`
process.env.PUBLIC_URL = '';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024; // 512KB
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024; // 1MB

(async () => {
  // TODO: build migrations bundle
  // TODO: run migrations?
  // TODO: build bicycle schema

  // First, read the current file sizes in build directory.
  // This lets us display how much they changed later.
  const previousFileSizes = await measureFileSizesBeforeBuild(
    Paths.appBuildDirectoryClient,
  );
  // Remove all content but keep the directory so that
  // if you're in it, you don't end up in Trash
  fs.emptyDirSync(Paths.appBuildDirectory);
  // Merge with the public folder
  copyPublicFolder();

  const prodPkg = {
    name: appPkg.name,
    description: appPkg.description,
    private: true,
    dependencies: {} as {[key: string]: string},
    scripts: {
      start: 'node server.js',
    },
    repository: appPkg.repository,
    engines: {
      node: process.version.substr(1),
    },
  };
  Object.keys(appPkg.dependencies).forEach(name => {
    prodPkg.dependencies[name] = require(name + '/package.json').version;
  });
  fs.writeFileSync(
    Paths.appBuildDirectory + '/package.json',
    JSON.stringify(prodPkg, null, '  '),
  );
  // TODO: buildMigrations();

  // Start the webpack build
  const [
    {stats, warnings: clientWarnings},
    {warnings: serverWarnings},
  ] = await Promise.all([buildClient(), buildServer()]);
  const warnings = clientWarnings.concat(serverWarnings);
  if (warnings.length) {
    console.log(chalk.yellow('Compiled with warnings.\n'));
    console.log(warnings.join('\n\n'));
    console.log(
      '\nSearch for the ' +
        chalk.underline(chalk.yellow('keywords')) +
        ' to learn more about each warning.',
    );
    console.log(
      'To ignore, add ' +
        chalk.cyan('// eslint-disable-next-line') +
        ' to the line before.\n',
    );
  } else {
    console.log(chalk.green('Compiled successfully.\n'));
  }

  console.log('File sizes after gzip:\n');
  printFileSizesAfterBuild(
    stats,
    previousFileSizes,
    Paths.appBuildDirectoryClient,
    WARN_AFTER_BUNDLE_GZIP_SIZE,
    WARN_AFTER_CHUNK_GZIP_SIZE,
  );
  console.log();

  console.log(`the build folder is ready to be deployed.`);
  console.log(``);
  console.log(`You can run it locally with:`);
  console.log(``);
  console.log(`  node -r dotenv/config build/server`);
  console.log(``);
  console.log(`You can deploy it to heroku with:`);
  console.log(``);
  console.log(`  npm run deploy`);
  console.log(``);
})().catch(err => {
  console.log(chalk.red('Failed to compile.\n'));
  console.log((err.message || err) + '\n');
  process.exit(1);
});

// Create the production build and print the deployment instructions.
function buildClient() {
  console.log('Creating an optimized production build of frontend...');

  const compiler = webpack(
    webpackConfig({
      environment: Environment.Production,
      platform: Platform.Client,
    }),
  );
  return new Promise<{
    stats: webpack.Stats;
    warnings: string[];
  }>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }
      const messages = formatWebpackMessages((stats as any).toJson({}, true));
      if (messages.errors.length) {
        return reject(new Error(messages.errors.join('\n\n')));
      }
      if (isCI && messages.warnings.length) {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n',
          ),
        );
        return reject(new Error(messages.warnings.join('\n\n')));
      }
      return resolve({
        stats,
        warnings: messages.warnings,
      });
    });
  });
}
function buildServer() {
  console.log('Creating an optimized production build of backend...');

  const compiler = webpack(
    webpackConfig({
      environment: Environment.Production,
      platform: Platform.Server,
    }),
  );
  return new Promise<{stats: webpack.Stats; warnings: string[]}>(
    (resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          return reject(err);
        }
        const messages = formatWebpackMessages((stats as any).toJson({}, true));
        if (messages.errors.length) {
          return reject(new Error(messages.errors.join('\n\n')));
        }
        if (isCI && messages.warnings.length) {
          console.log(
            chalk.yellow(
              '\nTreating warnings as errors because process.env.CI = true.\n' +
                'Most CI servers set it automatically.\n',
            ),
          );
          return reject(new Error(messages.warnings.join('\n\n')));
        }
        return resolve({
          stats,
          warnings: messages.warnings,
        });
      });
    },
  );
}

function copyPublicFolder() {
  fs.copySync(Paths.appPublicDirectory, Paths.appBuildDirectoryClient, {
    dereference: true,
  });
}
