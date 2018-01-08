// @public

import {IncomingMessage, ServerResponse} from 'http';
import RavenType = require('raven');
import {Breadcrumb, CaptureOptions, User} from './interface';

export {Breadcrumb, CaptureOptions, User};

function isPromise<T>(p: T | Promise<T>): p is Promise<T> {
  return (
    p &&
    (typeof p === 'object' || typeof p === 'function') &&
    typeof (p as Promise<T>).then === 'function'
  );
}

let output = {
  enabled: false,
  captureException(ex: Error, options?: CaptureOptions) {},
  context<T>(fn: () => T): T {
    return fn();
  },
  wrap<TFunc extends Function>(fn: TFunc): TFunc {
    return fn;
  },
  setUserContext(user?: User) {},
  captureMessage(message: string, options?: CaptureOptions) {},
  captureBreadcrumb(crumb: Breadcrumb) {},
  requestHandler<TReq extends IncomingMessage, TRes extends ServerResponse>(
    getUser?: ((
      req: TReq,
      res: TRes,
    ) => Promise<User | null | void> | User | null | void),
  ): (req: TReq, res: TRes, next: () => void) => void {
    return (req, res, next) => next();
  },
  errorHandler(): (
    e: Error,
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: Error) => void,
  ) => void {
    return (e, req, res, next) => next(e);
  },
  showReportDialog: null,
};

if (process.env.SENTRY_DSN_SERVER || process.env.SENTRY_DSN) {
  const Raven = require('raven') as typeof RavenType;
  Raven.config(
    (process.env.SENTRY_DSN_SERVER || process.env.SENTRY_DSN)!,
  ).install();
  output = {
    enabled: true,
    captureException(ex: Error, options?: CaptureOptions) {
      Raven.captureException(ex, options);
    },
    context<T>(fn: () => T): T {
      return Raven.context(fn) as any;
    },
    wrap<TFunc extends Function>(fn: TFunc): TFunc {
      return Raven.wrap(fn as any) as any;
    },
    setUserContext(user?: User) {
      Raven.setContext({user});
    },
    captureMessage(message: string, options?: CaptureOptions) {
      Raven.captureMessage(message, options);
    },
    captureBreadcrumb(crumb: Breadcrumb) {
      Raven.captureBreadcrumb(crumb);
    },
    requestHandler<TReq extends IncomingMessage, TRes extends ServerResponse>(
      getUser?: ((
        req: TReq,
        res: TRes,
      ) => Promise<User | null | void> | User | null | void),
    ): (req: TReq, res: TRes, next: (err?: Error) => void) => void {
      const handler = Raven.requestHandler();
      return (req, res, next) => {
        handler(req, res, () => {
          if (!getUser) {
            return next();
          }
          const user = getUser(req, res);
          if (!isPromise(user)) {
            if (user) {
              Raven.setContext({user});
            }
            return next();
          }
          Promise.resolve(user)
            .then(user => {
              if (user) {
                Raven.setContext({user});
              }
            })
            .then(() => next(), next);
        });
      };
    },
    errorHandler(): (
      e: Error,
      req: IncomingMessage,
      res: ServerResponse,
      next: (err?: Error) => void,
    ) => void {
      return Raven.errorHandler();
    },
    showReportDialog: null,
  };
}

export default output;

module.exports = output;
module.exports.default = output;
