// Do this as the first thing so that any code reading it knows the right env.});
import '@moped/env/development';
import {join} from 'path';
import {
  getHostInfoPair,
  getSingleHostInfo,
  HostInfoPair,
  HostInfoSingle,
} from '@moped/get-host-info';
import chalk from 'chalk';
import ms = require('ms');
import {Environment, Platform} from '@moped/webpack-config';
import createWebpackDevServer from '@moped/webpack-dev-server';
import clearConsole from '../helpers/clearConsole';
import openBrowser from '../helpers/openBrowser';
import paths from '../helpers/paths';
import Compiler from '../helpers/Compiler';
import {
  TypeScriptLog,
  LogLevel,
} from '../helpers/TypeScriptCheckerPluginInstance';
import webpackConfig from '../helpers/webpack-config';
import config, {AppConfig} from '../helpers/config';
import Observable from '../helpers/Observable';

// don't end in trailing `/` because it looks nicer to always have `PUBLIC_URL + '/foo'`
process.env.PUBLIC_URL = '';

const appName: string = require(paths.packageJSON).name;

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const isInteractive = process.stdout.isTTY || false;

if (isInteractive) {
  clearConsole();
}

interface Status {
  buildCompleted: boolean;
  hostInfo: HostInfoPair | HostInfoSingle;
  printStatusAndGetSuccess(): boolean;
}
async function startApp(
  config: AppConfig,
  buildDirectory: string,
  name?: string,
  usedPorts?: Set<number>,
) {
  if (usedPorts && config.port) {
    usedPorts.delete(config.port);
  }
  const hostInfoTemp = await (config.clientEntryPoint
    ? getHostInfoPair(config.port || undefined, usedPorts)
    : getSingleHostInfo(config.port || undefined, usedPorts));
  if (!hostInfoTemp) {
    return;
  }
  const hostInfo = hostInfoTemp;
  if (usedPorts) {
    if (hostInfo.isPair) {
      usedPorts.add(hostInfo.frontendPort);
      usedPorts.add(hostInfo.backendPort);
    } else {
      usedPorts.add(hostInfo.port);
    }
  }

  const backend = new Compiler(
    webpackConfig({
      buildDirectory,
      entryPoint: config.serverEntryPointDev,
      environment: Environment.Development,
      htmlTemplate: config.htmlTemplate,
      platform: Platform.Server,
      port: hostInfo.isPair ? hostInfo.backendPort : hostInfo.port,
    }),
    name
      ? hostInfo.isPair ? `${name} backend` : name
      : hostInfo.isPair ? `backend` : appName,
    webpackCompiler => {
      return new Promise((resolve, reject) => {
        webpackCompiler.watch({}, (err, stats) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  );
  const frontend =
    config.clientEntryPoint && hostInfo.isPair
      ? new Compiler(
          webpackConfig({
            buildDirectory: join(buildDirectory, 'public'),
            entryPoint: config.clientEntryPoint,
            environment: Environment.Development,
            htmlTemplate: config.htmlTemplate,
            platform: Platform.Client,
            port: hostInfo.frontendPort,
          }),
          name ? `${name} frontend` : `frontend`,
          webpackCompiler => {
            return new Promise((resolve, reject) => {
              const devServer = createWebpackDevServer(webpackCompiler, {
                allowedHost: hostInfo.lanUrlForConfig,
                proxy: 'http://localhost:' + hostInfo.backendPort,
                publicDirectoryName:
                  config.publicDirectory || join(buildDirectory, 'public'),
              });
              devServer.listen(hostInfo.frontendPort, hostInfo.host, err => {
                if (err) reject(err);
                else resolve();
              });
            });
          },
        )
      : null;
  return new Observable<Status>(onValue => {
    let ready = false;
    function onStatusChange() {
      onValue({
        buildCompleted:
          ready &&
          backend.buildCompleted() &&
          (!frontend || frontend.buildCompleted()),
        hostInfo,
        printStatusAndGetSuccess() {
          return backend.printStatus() && (!frontend || frontend.printStatus());
        },
      });
    }
    Promise.all([frontend && frontend.ready, backend.ready]).then(() => {
      ready = true;
      onStatusChange();
    });
    backend.onInvalid(() => TypeScriptLog.clear());
    backend.onStatusChange(onStatusChange);
    if (frontend) {
      frontend.onInvalid(() => TypeScriptLog.clear());
      frontend.onStatusChange(onStatusChange);
    }
    onStatusChange();
  });
}
(async () => {
  if (config.monorepo) {
    const configs = config.configs;
    const usedPorts = new Set<number>();
    let nextDefaultPort = 3000;
    Object.keys(configs).forEach(name => {
      const config = configs[name];
      if (config.port) {
        usedPorts.add(config.port);
      }
    });
    Object.keys(configs).forEach(name => {
      const config = configs[name];
      if (!config.port) {
        while (usedPorts.has(nextDefaultPort)) {
          nextDefaultPort++;
        }
        config.port = nextDefaultPort;
        usedPorts.add(nextDefaultPort);
      }
    });
    const names: string[] = [];
    const apps: Observable<Status>[] = [];
    for (const name of Object.keys(configs)) {
      names.push(name);
      const observable = await startApp(
        configs[name],
        join(paths.buildDirectory, name),
        name,
        usedPorts,
      );
      if (observable) {
        apps.push(observable);
      } else {
        process.exit(1);
      }
    }
    let startedBrowser = false;
    const startInitialBuild = Date.now();
    let endInitialBuild: null | number = null;
    Observable.addTrigger(Observable.merge(...apps), TypeScriptLog).subscribe(
      builds => {
        if (isInteractive) {
          clearConsole();
        }
        if (!builds.every(build => build.buildCompleted)) {
          console.log(chalk.cyan('Starting the development server...\n'));
          return;
        }
        if (endInitialBuild === null) {
          endInitialBuild = Date.now();
        }

        const buildSuccess = builds.every(build =>
          build.printStatusAndGetSuccess(),
        );
        if (buildSuccess && !startedBrowser) {
          openBrowser(builds[0].hostInfo.localUrlForBrowser);
          startedBrowser = true;
        }
        if (TypeScriptLog.hasError()) {
          // TODO: always log status of typescript
          console.log('');
          TypeScriptLog.print(LogLevel.warn);
          console.log('');
        }
        if (buildSuccess && !TypeScriptLog.hasError()) {
          console.log();
          console.log(
            `You can now view ${chalk.bold(appName)} in the browser.`,
          );
          console.log();
          builds.forEach((build, i) => {
            console.log(`  ${chalk.cyan(names[i])}`);
            if (build.hostInfo.lanUrlForTerminal) {
              console.log(
                `    ${chalk.bold('Local:')}            ${
                  build.hostInfo.localUrlForTerminal
                }`,
              );
              console.log(
                `    ${chalk.bold('On Your Network:')}  ${
                  build.hostInfo.lanUrlForTerminal
                }`,
              );
            } else {
              console.log(`    ${build.hostInfo.localUrlForTerminal}`);
            }
          });

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
      },
    );
  } else {
    const statusObservable = await startApp(
      config.config,
      paths.buildDirectory,
    );
    if (!statusObservable) {
      process.exit(1);
      return;
    }
    let startedBrowser = false;
    const startInitialBuild = Date.now();
    let endInitialBuild: null | number = null;
    Observable.addTrigger(statusObservable, TypeScriptLog).subscribe(
      ({buildCompleted, hostInfo, printStatusAndGetSuccess}) => {
        if (isInteractive) {
          clearConsole();
        }
        if (!buildCompleted) {
          console.log(chalk.cyan('Starting the development server...\n'));
          return;
        }
        if (endInitialBuild === null) {
          endInitialBuild = Date.now();
        }
        const buildSuccess = printStatusAndGetSuccess();
        if (buildSuccess && !startedBrowser) {
          openBrowser(hostInfo.localUrlForBrowser);
          startedBrowser = true;
        }
        if (TypeScriptLog.hasError()) {
          // TODO: always log status of typescript
          console.log('');
          TypeScriptLog.print(LogLevel.warn);
          console.log('');
        }
        if (buildSuccess && !TypeScriptLog.hasError()) {
          console.log();
          console.log(
            `You can now view ${chalk.bold(appName)} in the browser.`,
          );
          console.log();

          if (hostInfo.lanUrlForTerminal) {
            console.log(
              `  ${chalk.bold('Local:')}            ${
                hostInfo.localUrlForTerminal
              }`,
            );
            console.log(
              `  ${chalk.bold('On Your Network:')}  ${
                hostInfo.lanUrlForTerminal
              }`,
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
      },
    );
  }
})().catch(err => {
  if (err && err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(1);
});
