// @public

import RavenType = require('raven-js');
import {Breadcrumb, CaptureOptions, User} from './interface';

export {Breadcrumb, CaptureOptions, User};

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
  showReportDialog(options?: {eventId?: string}) {},
};

if (process.env.SENTRY_DSN_CLIENT || process.env.SENTRY_DSN) {
  const Raven = require('raven-js') as typeof RavenType;
  Raven.config(
    (process.env.SENTRY_DSN_CLIENT || process.env.SENTRY_DSN)!,
  ).install();
  (window as any).onunhandledrejection = function(e: any) {
    if (Raven) {
      Raven.captureException(e.reason);
    }
  };
  output = {
    enabled: true,
    captureException(ex: Error, options?: CaptureOptions) {
      Raven.captureException(ex, options);
    },
    context<T>(fn: () => T): T {
      return Raven.context(fn) as any;
    },
    wrap<TFunc extends Function>(fn: TFunc): TFunc {
      return Raven.wrap(fn) as any;
    },
    setUserContext(user?: User) {
      user ? Raven.setUserContext(user) : Raven.setUserContext();
    },
    captureMessage(message: string, options?: CaptureOptions) {
      Raven.captureMessage(message, options);
    },
    captureBreadcrumb(crumb: Breadcrumb) {
      Raven.captureBreadcrumb(crumb);
    },
    showReportDialog(options?: {eventId?: string}) {
      Raven.showReportDialog(options);
    },
  };
}

export default output;

module.exports = output;
module.exports.default = output;
