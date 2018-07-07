import {IncomingMessage} from 'http';

export function verify(sentry: Sentry): Sentry {
  return {
    enabled: sentry.enabled,
    captureException: sentry.captureException,
    context: sentry.context,
    wrap: sentry.wrap,
    setUserContext: sentry.setUserContext,
    captureMessage: sentry.captureMessage,
    captureBreadcrumb: sentry.captureBreadcrumb,
    showReportDialog: sentry.showReportDialog,
  };
}

export type LogLevel = 'critical' | 'error' | 'warning' | 'info' | 'debug';
export type BreadcrumbType = 'navigation' | 'http';
export interface Breadcrumb {
  message?: string;
  category?: string;
  level?: LogLevel;
  data?: any;
  type?: BreadcrumbType;
}

export interface CaptureOptions {
  extra?: {[key: string]: any};
  req?: IncomingMessage;
  user?: any;
  /** In some cases you may see issues where Sentry groups multiple events together when they should be separate entities. In other cases, Sentry simply doesn’t group events together because they’re so sporadic that they never look the same. */
  fingerprint?: string[];
  /** The log level associated with this event. Default: error */
  level?: LogLevel;
  /** set to true to get the stack trace of your message */
  stacktrace?: boolean;
  /** Additional data to be tagged onto the error. */
  tags?: {[key: string]: string};
}

// export interface User {
//   [key: string]: string | number | boolean | null | void;
// }
export type User = any;

export default interface Sentry {
  enabled: boolean;
  captureException(ex: Error, options?: CaptureOptions): void;
  context<T>(fn: () => T): T;
  wrap<TFunc extends Function>(fn: TFunc): TFunc;
  setUserContext(user?: User): void;
  captureMessage(message: string, options?: CaptureOptions): void;
  captureBreadcrumb(crumb: Breadcrumb): void;
  showReportDialog: null | ((options?: {eventId?: string}) => void);
}
