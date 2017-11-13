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

const hotReplacementClient = new HotClient({continueOnError: true});

process.on('message', m => {
  hotReplacementClient.write(m);
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

export default function setServer(handler: Handler) {
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
function handleRequest(req: IncomingMessage, res: ServerResponse) {
  console.log(req.method + ' ' + req.url);
  const compileError = hotReplacementClient.compileError();
  const runtimeError = hotReplacementClient.runtimeError();
  if (compileError || runtimeError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end(
      `
        There was a ${compileError ? 'build' : 'runtime'} error:
        <pre>${ansi.toHtml(compileError || runtimeError)}</pre>
      `,
    );
  } else if (!requestHandler || !hotReplacementClient.isValid()) {
    pendingRequests.push({req, res});
  } else {
    requestHandler(req, res);
  }
}
