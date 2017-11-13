import {IncomingMessage, ServerResponse} from 'http';

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => {} | null | void;

declare function setServer(handler: Handler): void;

export default setServer;
