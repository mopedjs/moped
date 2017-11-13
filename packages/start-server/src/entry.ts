import {createServer, IncomingMessage, ServerResponse} from 'http';
import Hot from './Hot';
import HotClient from './HotClient';

declare const MOPED_START_SERVER_ENTRY_POINT: string;

interface Request {
  req: IncomingMessage;
  res: ServerResponse;
}
type Handler = (req: IncomingMessage, res: ServerResponse) => {} | null | void;
let pendingRequests: Request[] = [];
let requestHandler: Handler | null = null;

const server = createServer((req, res) => {
  if (requestHandler) {
    requestHandler(req, res);
  } else {
    pendingRequests.push({req, res});
  }
});
server.listen(process.env.PORT || 3000);

function handlePendingRequests() {
  const handler = requestHandler;
  if (!handler) {
    console.warn('no request handler found');
    return;
  }
  pendingRequests.forEach(({req, res}) => handler(req, res));
  pendingRequests = [];
}

import(MOPED_START_SERVER_ENTRY_POINT)
  .then(server => {
    requestHandler = server.default;
    handlePendingRequests();
  })
  .catch(ex => {
    console.error(ex.stack);
  });

const hot: Hot | void = (module as any).hot;
if (hot) {
  hot.accept(MOPED_START_SERVER_ENTRY_POINT, () => {
    import(MOPED_START_SERVER_ENTRY_POINT)
      .then(server => {
        requestHandler = server.default;
        handlePendingRequests();
      })
      .catch(ex => {
        console.error(ex.stack);
      });
  });
  const client = new HotClient();
  process.on('message', m => client.write(m));
}
