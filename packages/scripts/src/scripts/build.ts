// Do this as the first thing so that any code reading it knows the right env.
import '@moped/env/production';
import {join, relative} from 'path';
import {Environment, Platform} from '@moped/webpack-config';
import * as webpack from 'webpack';
import chalk from 'chalk';
import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from '../helpers/FileSizeReporter';
import config, {AppConfig} from '../helpers/config';
import paths from '../helpers/paths';
import {getMigrationBundles, getMigrationsPackage} from '../helpers/migrations';
import generateSchema from '../helpers/generateSchema';
import buildEntryPointAsync, {
  BuildEntryPointConfig,
  BuildEntryPointResult,
} from '../helpers/buildEntryPointAsync';
const fs = require('fs-extra');
const stringify: (obj: any) => string = require('stable-stringify');

const appPkg = require(paths.packageJSON);

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

// TODO: build bicycle schema
interface PrepareResult {
  buildDirectory: string;
  clientBuildDirectory: string;
  config: AppConfig;
  printClientSizes(stats: object): void;
}
async function prepare(
  config: AppConfig,
  buildDirectory: string,
): Promise<PrepareResult> {
  const clientBuildDirectory = join(buildDirectory, 'public');
  // First, read the current file sizes in build directory.
  // This lets us display how much they changed later.
  const previousFileSizes = await measureFileSizesBeforeBuild(
    clientBuildDirectory,
  );
  // Remove all content but keep the directory so that
  // if you're in it, you don't end up in Trash
  await fs.emptyDir(buildDirectory);
  return {
    buildDirectory,
    clientBuildDirectory,
    config,
    printClientSizes(stats: object) {
      console.log('File sizes after gzip:\n');
      printFileSizesAfterBuild(
        {toJson: () => stats} as webpack.Stats,
        previousFileSizes,
        clientBuildDirectory,
        WARN_AFTER_BUNDLE_GZIP_SIZE,
        WARN_AFTER_CHUNK_GZIP_SIZE,
      );
    },
  };
}

async function prepareDatabase() {
  const bundles = await getMigrationBundles();
  Promise.all(
    bundles.map(async bundle => {
      if (bundle.migrationsDirectory) {
        const pkg = await getMigrationsPackage(bundle);
        await pkg.upAll(bundle.databaseURL);
      }
      generateSchema(bundle);
    }),
  );
}

interface BuildAppResult {
  prepared: PrepareResult;
  clientBuildResult: BuildEntryPointResult | null;
  config: AppConfig;
  serverBuildResult: BuildEntryPointResult;
}
async function buildApp(prepared: PrepareResult): Promise<BuildAppResult> {
  const config = prepared.config;
  const [clientBuildResult, serverBuildResult] = await Promise.all<
    BuildEntryPointResult | null,
    BuildEntryPointResult
  >([
    config.clientEntryPoint
      ? buildEntryPoint(prepared.clientBuildDirectory, {
          entryPoint: config.clientEntryPoint,
          environment: Environment.Production,
          htmlTemplate: config.htmlTemplate,
          platform: Platform.Client,
        })
      : null,
    buildEntryPoint(prepared.buildDirectory, {
      entryPoint: config.serverEntryPointProd,
      environment: Environment.Production,
      htmlTemplate: config.htmlTemplate,
      platform: Platform.Server,
    }),
  ]);
  return {
    prepared,
    clientBuildResult,
    config,
    serverBuildResult,
  };
}

async function finaliseApp(buildResult: BuildAppResult) {
  await Promise.all([
    writePackageJSON(
      buildResult.serverBuildResult.externalDependencies,
      buildResult.prepared.buildDirectory,
    ),
    copyPublicFolder(buildResult.config, buildResult.prepared.buildDirectory),
  ]);
  return buildResult;
}

function printAppResult({
  prepared,
  clientBuildResult,
  config,
  serverBuildResult,
}: BuildAppResult): void {
  const warnings = (
    (clientBuildResult && clientBuildResult.warnings) ||
    []
  ).concat(serverBuildResult.warnings);
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
  if (clientBuildResult) {
    prepared.printClientSizes(clientBuildResult.stats);
  }
  console.log();

  console.log(`the build folder is ready to be deployed.`);
  console.log(``);
  console.log(`You can run it locally with:`);
  console.log(``);
  console.log(
    `  node -r dotenv/config ${relative(
      process.cwd(),
      prepared.buildDirectory,
    )}/server`,
  );
  console.log(``);
  console.log(`You can deploy it to heroku with:`);
  console.log(``);
  console.log(`  npm run deploy`);
  console.log(``);
}

(async () => {
  if (config.monorepo) {
    const configs = config.configs;
    const names = Object.keys(configs);
    const [prepared] = await Promise.all([
      Promise.all(
        names.map(name =>
          prepare(configs[name], join(paths.buildDirectory, name)),
        ),
      ),
      prepareDatabase(),
    ]);
    const buildResults = await Promise.all(prepared.map(buildApp));
    const finalised = await Promise.all(buildResults.map(finaliseApp));
    for (let i = 0; i < finalised.length; i++) {
      console.log(chalk.bold(chalk.blue(names[i])));
      console.log();
      printAppResult(finalised[i]);
      console.log();
    }
  } else {
    const [prepared] = await Promise.all([
      prepare(config.config, paths.buildDirectory),
      prepareDatabase(),
    ]);
    await printAppResult(await finaliseApp(await buildApp(prepared)));
  }
})().then(
  () => {
    process.exit(0);
  },
  err => {
    console.log(chalk.red('Failed to compile.\n'));
    console.log((err.message || err) + '\n');
    process.exit(1);
  },
);

const entryPointCache = new Map<string, Promise<BuildEntryPointResult>>();
function buildEntryPoint(
  buildDirectory: string,
  options: BuildEntryPointConfig,
): Promise<BuildEntryPointResult> {
  const key = stringify(options);
  const cached = entryPointCache.get(key);
  if (cached) {
    return cached.then(async result => {
      if (result.buildDirectory !== buildDirectory) {
        await fs.copy(result.buildDirectory, buildDirectory, {
          dereference: true,
        });
      }
      return {
        ...result,
        buildDirectory,
      };
    });
  }

  const result = buildEntryPointAsync(buildDirectory, options);

  entryPointCache.set(key, result);

  return result;
}

async function copyPublicFolder(config: AppConfig, buildDirectory: string) {
  if (config.publicDirectory && fs.existsSync(config.publicDirectory)) {
    const destination = join(buildDirectory, 'client');
    await fs.copy(config.publicDirectory, destination, {
      dereference: true,
    });
  }
}

async function writePackageJSON(
  externalDependencies: ReadonlyArray<string>,
  buildDirectory: string,
) {
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

  externalDependencies.forEach(externalDependency => {
    prodPkg.dependencies[externalDependency] = require(externalDependency +
      '/package.json').version;
  });

  if (!('source-map-support' in prodPkg.dependencies)) {
    prodPkg.dependencies[
      'source-map-support'
    ] = require('source-map-support/package.json').version;
  }

  await fs.writeFile(
    buildDirectory + '/package.json',
    JSON.stringify(prodPkg, null, '  ') + '\n',
  );
}
