const choosePort: (
  host: string,
  defaultPort: number,
) => Promise<number | null> = require('react-dev-utils/WebpackDevServerUtils')
  .choosePort;

const detectPort: (
  defaultPort: number,
  host: string,
) => Promise<number> = require('detect-port-alt');

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

export interface HostInfo {
  protocol: 'http' | 'https';
  host: string;
  frontendPort: number;
  backendPort: number;

  lanUrlForConfig: string;
  lanUrlForTerminal: string;
  localUrlForTerminal: string;
  localUrlForBrowser: string;
}

export default async function getHostInfo(): Promise<HostInfo | null> {
  // Tools like Cloud9 rely on this.
  const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  // We attempt to use the default port but if it is busy, we ask the user if
  // they want to run on a different port.
  const frontendPort = await choosePort(HOST, DEFAULT_PORT);
  if (frontendPort == null) {
    // we did not find a port to run the frontend on
    return null;
  }

  // We default to running the backend on the next available port, but it should
  // be invisible to the user, do we don't ask for confirmation.
  const backendPort = await detectPort(frontendPort + 1, HOST);

  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
  const urls = prepareUrls(protocol, HOST, frontendPort);
  return {
    protocol,
    host: HOST,
    frontendPort,
    backendPort,
    ...urls,
  };
}
