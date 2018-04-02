import chalk from 'chalk';
import {prompt} from 'inquirer';
const _detectPort: (
  defaultPort: number,
  host: string,
) => Promise<number> = require('detect-port-alt');
const clearConsole: () => void = require('react-dev-utils/clearConsole');
const getProcessForPort: (
  port: number,
) => string | null = require('react-dev-utils/getProcessForPort');
const isRoot: () => boolean = require('is-root');
const isInteractive = process.stdout.isTTY;

export async function choosePort(
  host: string,
  defaultPort: number,
  usedPorts?: Set<number>,
) {
  const port = await detectPort(host, defaultPort, usedPorts).catch(err => {
    throw new Error(
      chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
        '\n' +
        ('Network error message: ' + err.message || err) +
        '\n',
    );
  });
  if (port === defaultPort) {
    return port;
  }
  const needsAdminPermissions =
    process.platform !== 'win32' && defaultPort < 1024 && !isRoot();
  const message = needsAdminPermissions
    ? `Admin permissions are required to run a server on a port below 1024.`
    : `Something is already running on port ${defaultPort}.`;
  if (isInteractive) {
    clearConsole();
    const existingProcess =
      usedPorts && usedPorts.has(defaultPort)
        ? null
        : getProcessForPort(defaultPort);
    const question = {
      type: 'confirm',
      name: 'shouldChangePort',
      message:
        chalk.yellow(
          message +
            `${existingProcess ? ` Probably:\n  ${existingProcess}` : ''}`,
        ) + '\n\nWould you like to run the app on another port instead?',
      default: true,
    };
    if (
      (await prompt<{shouldChangePort: boolean}>(question)).shouldChangePort
    ) {
      return port;
    } else {
      return null;
    }
  } else {
    console.log(chalk.red(message));
    return null;
  }
}
export async function detectPort(
  host: string,
  defaultPort: number,
  usedPorts?: Set<number>,
) {
  let result = await _detectPort(defaultPort, host);
  while (usedPorts && usedPorts.has(result)) {
    result = await _detectPort(result + 1, host);
  }
  return result;
}

const prepareUrls: (
  protocol: 'http' | 'https',
  host: string,
  port: number,
) => PreparedURLs = require('react-dev-utils/WebpackDevServerUtils')
  .prepareUrls;

interface PreparedURLs {
  lanUrlForConfig: string;
  lanUrlForTerminal: string;
  localUrlForTerminal: string;
  localUrlForBrowser: string;
}

export interface BaseHostInfo {
  protocol: 'http' | 'https';
  host: string;

  lanUrlForConfig: string;
  lanUrlForTerminal: string;
  localUrlForTerminal: string;
  localUrlForBrowser: string;
}
export interface HostInfoPair extends BaseHostInfo {
  isPair: true;
  frontendPort: number;
  backendPort: number;
}
export interface HostInfoSingle extends BaseHostInfo {
  isPair: false;
  port: number;
}
async function getHostInfo(
  pair: boolean,
  defaultPort?: number,
  usedPorts?: Set<number>,
): Promise<HostInfoSingle | HostInfoPair | null> {
  // Tools like Cloud9 rely on this.
  const DEFAULT_PORT = defaultPort || parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  // We attempt to use the default port but if it is busy, we ask the user if
  // they want to run on a different port.
  const frontendPort = await choosePort(HOST, DEFAULT_PORT, usedPorts);
  if (frontendPort == null) {
    // we did not find a port to run the frontend on
    return null;
  }

  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
  const urls = prepareUrls(protocol, HOST, frontendPort);
  if (pair) {
    // We default to running the backend on the next available port, but it should
    // be invisible to the user, do we don't ask for confirmation.
    const backendPort = await detectPort(HOST, frontendPort + 1, usedPorts);
    return {
      isPair: true,
      protocol,
      host: HOST,
      frontendPort,
      backendPort,
      ...urls,
    };
  } else {
    return {
      isPair: false,
      protocol,
      host: HOST,
      port: frontendPort,
      ...urls,
    };
  }
}
export async function getSingleHostInfo(
  defaultPort?: number,
  usedPorts?: Set<number>,
): Promise<HostInfoSingle | null> {
  return getHostInfo(
    false,
    defaultPort,
    usedPorts,
  ) as Promise<HostInfoSingle | null>;
}
export async function getHostInfoPair(
  defaultPort?: number,
  usedPorts?: Set<number>,
): Promise<HostInfoPair | null> {
  return getHostInfo(
    true,
    defaultPort,
    usedPorts,
  ) as Promise<HostInfoPair | null>;
}
export default getHostInfoPair;

module.exports = getHostInfo;
module.exports.default = getHostInfo;
module.exports.choosePort = choosePort;
module.exports.detectPort = detectPort;
module.exports.getSingleHostInfo = getSingleHostInfo;
module.exports.getHostInfoPair = getHostInfoPair;
