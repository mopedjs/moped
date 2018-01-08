// @public

import {createHash} from 'crypto';
import {createServer, IncomingMessage, ServerResponse} from 'http';
import HotClient from './HotClient';
const AnsiToHtml = require('ansi-to-html');

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'You should not use @moped/start-server/dev-server in production.  Change your entry point to directly reference the server.',
  );
}

const ansi = new AnsiToHtml({
  escapeXML: true,
  bg: '#FFF',
  fg: '#000',
});

interface Request {
  req: IncomingMessage;
  res: ServerResponse;
}

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => {} | null | void;

let requestHandler: Handler | null = null;
const pendingRequests: Request[] = [];

export default function setServer(handler: (req: any, res: any) => any) {
  if (typeof handler !== 'function') {
    throw new TypeError(
      'Expected handler to be a function accepting (req: IncomingMessage, req: ServerResponse) but got ' +
        (handler === null
          ? 'null'
          : Array.isArray(handler) ? 'Array' : typeof handler),
    );
  }
  requestHandler = handler;
  handlePendingRequests();
}

const server = createServer(handleRequest);
server.listen(process.env.PORT || 3000);

function handlePendingRequests() {
  const requests = pendingRequests.splice(0, pendingRequests.length);
  requests.forEach(({req, res}) => handleRequest(req, res));
}

const POLLING_URL = '/__/moped/start-server/ok/';
const pollingRequests: Request[] = [];
const hotReplacementClient = new HotClient({continueOnError: true}, () => {
  pollingRequests.forEach(({res}) => res.end('build'));
  pollingRequests.splice(0, pollingRequests.length);
});

process.on('message', m => {
  hotReplacementClient.write(m);
});

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const compileError = hotReplacementClient.compileError();
  const runtimeError = hotReplacementClient.runtimeError();
  const errorHash = createHash('sha512');
  errorHash.write(compileError || runtimeError || '');
  const errorHashString = errorHash.digest('hex');
  const isPolling =
    req.method === 'POST' && req.url && req.url.startsWith(POLLING_URL);
  if (compileError || runtimeError) {
    if (isPolling) {
      const requestHash = req.url ? req.url.split('/').pop() : '';
      if (requestHash !== errorHashString) {
        res.end('new-error');
        return;
      }
      const pair = {req, res};
      pollingRequests.push(pair);
      setTimeout(() => {
        const index = pollingRequests.indexOf(pair);
        if (index !== -1) {
          pollingRequests.splice(index, 1);
          res.end('poll');
        }
      }, 60000);
      return;
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end(
      `
        There was a ${compileError ? 'build' : 'runtime'} error:
        <pre>${ansi.toHtml(compileError || runtimeError)}</pre>
        <script>
          function poll() {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
              if (xhr.readyState === 4) {
                if (xhr.responseText === 'poll') {
                  poll();
                } else {
                  location.reload();
                }
              }
            };        
            xhr.open('POST', '/__/moped/start-server/ok/${errorHashString}', true);
            xhr.send('poll');
          }
          poll();
        </script>
      `,
    );
  } else if (!requestHandler || !hotReplacementClient.isValid()) {
    if (isPolling) {
      res.end('ok');
    }
    pendingRequests.push({req, res});
  } else {
    if (isPolling) {
      res.end('ok');
    }
    requestHandler(req, res);
  }
}

module.exports = setServer;
module.exports.default = setServer;
