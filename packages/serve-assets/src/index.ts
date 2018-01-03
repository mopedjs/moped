import {readFileSync} from 'fs';
import {dirname, resolve} from 'path';
import {createServer, IncomingMessage, ServerResponse} from 'http';
import {lsrSync} from 'lsr';

const prepare: (
  body: Buffer,
  headers: {[header: string]: string},
) => PreparedResponsePromise = require('prepare-response');

interface PreparedResponse {
  send(req: IncomingMessage, res: ServerResponse): void;
}
interface PreparedResponsePromise extends Promise<PreparedResponse> {
  send(req: IncomingMessage, res: ServerResponse): void;
}

interface PendingRequest {
  req: IncomingMessage;
  res: ServerResponse;
}
export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => {} | null | void;
export type AnyRequestHandler = (req: any, res: any) => any;
export interface Options {
  manifestFileName?: string;
  publicDirectoryName?: string;
  proxyHtmlRequests?: boolean;
}
export default function serveAssets(
  requestHandler:
    | AnyRequestHandler
    | {default: AnyRequestHandler}
    | Promise<AnyRequestHandler | {default: AnyRequestHandler}>,
  options: Options = {},
) {
  const proxyHtmlRequests =
    options.proxyHtmlRequests !== undefined
      ? options.proxyHtmlRequests
      : process.env.PROXY_HTML_REQUESTS === 'true';
  if (
    options.proxyHtmlRequests === undefined &&
    process.env.PROXY_HTML_REQUESTS !== undefined &&
    process.env.PROXY_HTML_REQUESTS !== 'true' &&
    process.env.PROXY_HTML_REQUESTS !== 'false'
  ) {
    throw new Error(
      'If the PROXY_HTML_REQUESTS environment variable is specified it must be either "true" or "false" but it is set to "' +
        process.env.PROXY_HTML_REQUESTS +
        '"',
    );
  }
  const manifestFileName =
    options.manifestFileName || 'public/asset-manifest.json';
  const publicDirectoryName = options.publicDirectoryName || 'public';
  const manifest = JSON.parse(readFileSync(manifestFileName, 'utf8'));
  const staticFiles: {
    [path: string]: void | PreparedResponse | PreparedResponsePromise;
  } = {};

  // manifest assets can be cached for ages
  Object.keys(manifest)
    .map(key => manifest[key])
    .forEach((filename: string) => {
      const body = readFileSync(resolve(dirname(manifestFileName), filename));
      const response = prepare(body, {
        'Content-Type': filename.split('/').pop() || '',
        'Cache-Control': '1 year',
      });
      staticFiles['/' + filename] = response;
      response
        .then(response => {
          staticFiles['/' + filename] = response;
        })
        .catch(ex => {
          console.error('Error loading ' + filename);
          console.error(ex);
          process.exit(1);
        });
    });

  // other public files are only cached for a short time
  lsrSync(publicDirectoryName).forEach(entry => {
    if (entry.isFile()) {
      const name = entry.path.substr(1);
      if (name[0] !== '/') {
        throw new Error('Expected path to start with /');
      }
      if (name in staticFiles) {
        return;
      }
      const body = readFileSync(entry.fullPath);
      const response = prepare(body, {
        'Content-Type': name.split('/').pop() || '',
        'Cache-Control': '1 minute',
      });
      staticFiles[name] = response;
      response
        .then(response => {
          staticFiles[name] = response;
        })
        .catch(ex => {
          console.error('Error loading ' + name.substr(1));
          console.error(ex);
          process.exit(1);
        });
    }
  });

  let pendingRequests: PendingRequest[] | null = [];
  let rh: RequestHandler | null = null;
  if (typeof requestHandler === 'function') {
    rh = requestHandler;
    pendingRequests = null;
  } else if (
    requestHandler &&
    typeof requestHandler === 'object' &&
    typeof (requestHandler as any).default === 'function'
  ) {
    rh = (requestHandler as any).default;
    pendingRequests = null;
  } else {
    (requestHandler as any).then((handler: any) => {
      if (typeof handler === 'function') {
        rh = handler;
      } else {
        rh = handler.default;
      }
      if (pendingRequests) {
        pendingRequests.forEach(({req, res}) => handler(req, res));
        pendingRequests = null;
      }
    });
  }
  const server = createServer((req, res) => {
    const url = req.url ? req.url.split('?')[0] : undefined;
    if (req.method === 'GET' && url && url[0] === '/') {
      const st = staticFiles[url];
      if (st) {
        return st.send(req, res);
      }
    }
    if (
      !(
        proxyHtmlRequests ||
        (req.headers.accept &&
          req.headers.accept.indexOf('text/html') === -1) ||
        (req.url && req.url.substr(0, 4) === '/__/')
      )
    ) {
      const index = staticFiles['/index.html'];
      if (index) {
        index.send(req, res);
        return;
      }
    }
    if (rh) {
      rh(req, res);
    } else if (pendingRequests) {
      pendingRequests.push({req, res});
    } else {
      throw new Error(
        'There should always be a request handler if pending reuqests has been removed',
      );
    }
  });
  server.listen(process.env.PORT || 3000);
}
module.exports = serveAssets;
module.exports.default = serveAssets;
