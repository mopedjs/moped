// Do this as the first thing so that any code reading it knows the right env.});
import '@moped/env/development';
import getHostInfo from '@moped/get-host-info';
import chalk from 'chalk';
import ms = require('ms');
import {Environment, Platform} from '@moped/webpack-config';
import createWebpackDevServer from '@moped/webpack-dev-server';
import clearConsole from '../helpers/clearConsole';
import openBrowser from '../helpers/openBrowser';
import * as Paths from '../helpers/Paths';
import Compiler from '../helpers/Compiler';
import {
  TypeScriptLog,
  LogLevel,
} from '../helpers/TypeScriptCheckerPluginInstance';
import webpackConfig from '../helpers/webpack-config';

// don't end in trailing `/` because it looks nicer to always have `PUBLIC_URL + '/foo'`
process.env.PUBLIC_URL = '';

const appName: string = require(Paths.appPackageJson).name;
const startInitialBuild = Date.now();
let endInitialBuild: number | null = null;

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// const startServer = require('./utils/startServer');
// const startWebpack = require('./utils/startWebpack');

const isInteractive = process.stdout.isTTY || false;

if (isInteractive) {
  clearConsole();
}

(async () => {
  const hostInfoTemp = await getHostInfo();
  if (!hostInfoTemp) {
    return;
  }
  const hostInfo = hostInfoTemp;
  const backend = new Compiler(
    webpackConfig({
      environment: Environment.Development,
      platform: Platform.Server,
      port: hostInfo.backendPort,
    }),
    'backend',
    webpackCompiler => {
      return new Promise((resolve, reject) => {
        webpackCompiler.watch({}, (err, stats) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  );
  const frontend = new Compiler(
    webpackConfig({
      environment: Environment.Development,
      platform: Platform.Client,
    }),
    'frontend',
    webpackCompiler => {
      return new Promise((resolve, reject) => {
        const devServer = createWebpackDevServer(webpackCompiler, {
          allowedHost: hostInfo.lanUrlForConfig,
          proxy: 'http://localhost:' + hostInfo.backendPort,
          publicDirectoryName: Paths.appPublicDirectory,
        });
        devServer.listen(hostInfo.frontendPort, hostInfo.host, err => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  );

  backend.onInvalid(() => TypeScriptLog.clear());
  frontend.onInvalid(() => TypeScriptLog.clear());
  TypeScriptLog.onLog(() => onStatusChange());
  backend.onStatusChange(onStatusChange);
  frontend.onStatusChange(onStatusChange);
  let ready = false;
  let started = false;
  function onStatusChange() {
    if (isInteractive) {
      clearConsole();
    }
    if (
      ready &&
      !started &&
      backend.buildCompleted() &&
      frontend.buildCompleted()
    ) {
      openBrowser(hostInfo.localUrlForBrowser);
      started = true;
    }
    if (!started) {
      console.log(chalk.cyan('Starting the development server...\n'));
      return;
    }
    const backendSuccess = backend.printStatus();
    const frontendSuccess = frontend.printStatus();
    if (TypeScriptLog.hasError()) {
      // TODO: always log status of typescript
      console.log('');
      TypeScriptLog.print(LogLevel.warn);
      console.log('');
    }
    if (backendSuccess && frontendSuccess && endInitialBuild === null) {
      endInitialBuild = Date.now();
    }
    if (backendSuccess && frontendSuccess && !TypeScriptLog.hasError()) {
      console.log();
      console.log(`You can now view ${chalk.bold(appName)} in the browser.`);
      console.log();

      if (hostInfo.lanUrlForTerminal) {
        console.log(
          `  ${chalk.bold('Local:')}            ${
            hostInfo.localUrlForTerminal
          }`,
        );
        console.log(
          `  ${chalk.bold('On Your Network:')}  ${hostInfo.lanUrlForTerminal}`,
        );
      } else {
        console.log(`  ${hostInfo.localUrlForTerminal}`);
      }

      console.log();
      if (endInitialBuild) {
        console.log(
          `Initial build took ${chalk.bold(
            ms(endInitialBuild - startInitialBuild),
          )}.`,
        );
        console.log();
      }
      console.log('Note that the development build is not optimized.');
      console.log(
        `To create a production build, use ` +
          `${chalk.cyan(`npm run build`)}.`,
      );
      console.log();
    }
  }

  await Promise.all([frontend.ready, backend.ready]);
  ready = true;
  onStatusChange();
})().catch(err => {
  if (err && err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(1);
});
