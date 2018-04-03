// Do this as the first thing so that any code reading it knows the right env.
import '@moped/env/production';
import {Environment, Platform} from '@moped/webpack-config';
import * as webpack from 'webpack';
import chalk from 'chalk';
import webpackConfig from '../helpers/webpack-config';
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

const CI = process.env.CI;
const isCI = CI && CI.toLowerCase() !== 'false';

export interface BuildEntryPointConfig {
  /**
   * {
   *   server: {
   *     development: config.serverEntryPointDev,
   *     production: config.serverEntryPointProd,
   *   },
   *   client: config.clientEntryPoint,
   * },
   */
  entryPoint: string;
  environment: Environment;
  htmlTemplate: string | null;
  platform: Platform;
  port?: number;
}
export interface BuildEntryPointResult {
  buildDirectory: string;
  externalDependencies: ReadonlyArray<string>;
  stats: object;
  warnings: ReadonlyArray<string>;
}

export default function buildEntryPoint(
  buildDirectory: string,
  options: BuildEntryPointConfig,
): Promise<BuildEntryPointResult> {
  const externalDependencies = new Set<string>();

  const compiler = webpack(
    webpackConfig({
      ...options,
      buildDirectory,
      onExternalDependency(externalDependency) {
        externalDependencies.add(externalDependency);
      },
    }),
  );

  return new Promise<BuildEntryPointResult>((resolve, reject) => {
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
        buildDirectory,
        externalDependencies: Array.from(externalDependencies),
        stats: stats.toJson(),
        warnings: messages.warnings,
      });
    });
  });
}
