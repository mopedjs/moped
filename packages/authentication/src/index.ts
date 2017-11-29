import {inspect} from 'util';
import {IncomingMessage, ServerResponse} from 'http';
import {URL} from 'url';
import {NextFunction, Router, Request, Response} from 'express';
import Cookies = require('cookies');
import helmet = require('helmet');
import createError = require('http-errors');

const COOKIE_NAME = 'moped-authentication-sid';
// milliseconds:
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const COOKIE_MAX_AGE = 365 * ONE_DAY;

// TODO: logout
// TODO: Google Login

export interface BaseSession<SessionIdType, UserIdType> {
  id: SessionIdType;
  userID: UserIdType;
}
export interface BaseUser<UserIdType> {
  id: UserIdType;
}
export interface AuthenticationOptions<
  SessionIdType,
  UserIdType,
  SessionType extends BaseSession<SessionIdType, UserIdType> = BaseSession<
    SessionIdType,
    UserIdType
  >,
  UserType extends BaseUser<UserIdType> = BaseUser<UserIdType>
> {
  /**
   * The keys are used to sign the cookies.
   */
  keys: string[];
  /**
   * Helmet adjusts the headers sent by express to be
   * more security concious.  You can modify this by
   * passing options here, or disable it entirely by
   * passing false.  The defaults should be fine for most
   * applications.
   */
  helmetOptions?: helmet.IHelmetConfiguration | false;
  /**
   * By default authentication cookies are included in
   * cross site requests. This can cause security problems.
   * Modern browsers allow disabling this by setting "Same Site"
   * for cookies.  There are two modes:
   *
   * - lax - only send cookies with GET requests and requests from
   *         the same origin.  This is the default as it provides
   *         reasonable security without compromising usability.
   *         N.B. it's important that side effects are only applied
   *         on POST requests for this protection to work.
   * - strict - Only send cookies with requests from the same origin.
   *            This setting will work if you are not doing server
   *            side rendering, but would show an initial signed-out
   *            view when authenticated users follow links to your
   *            site (if using server side rendering).
   *
   * At time of writing, this setting is only supported by chrome, so
   * other protection approaches are still needed.
   */
  sameSiteCookie?: 'lax' | 'strict' | false;
  /**
   * Used in preventing cross origin request forgery
   * (see: https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)_Prevention_Cheat_Sheet)
   *
   * Defaults to process.env.BASE_URL. You must provide a value if that env var is not set.
   */
  origin?: string;
  getUser(id: UserIdType): null | UserType | Promise<null | UserType>;
  getSession(
    id: SessionIdType,
  ): null | SessionType | Promise<null | SessionType>;
  createSession(
    userID: UserIdType,
    req: IncomingMessage,
    res: ServerResponse,
  ): SessionType | Promise<SessionType>;
  deleteSession(id: SessionIdType): Promise<any> | any;
}
export default class Authentication<
  SessionIdType,
  UserIdType,
  SessionType extends BaseSession<SessionIdType, UserIdType> = BaseSession<
    SessionIdType,
    UserIdType
  >,
  UserType extends BaseUser<UserIdType> = BaseUser<UserIdType>
> {
  private readonly origin: string | void;
  private readonly options: AuthenticationOptions<
    SessionIdType,
    UserIdType,
    SessionType,
    UserType
  >;
  private readonly plugins: Plugin<UserIdType, UserType>[] = [];
  private readonly routers: Router[] = [];
  constructor(
    options: AuthenticationOptions<
      SessionIdType,
      UserIdType,
      SessionType,
      UserType
    >,
  ) {
    this.options = options;
    const BASE_URL = process.env.BASE_URL || process.env.BASE_URI;
    if (this.options.origin) {
      this.origin = this.options.origin;
    } else if (BASE_URL) {
      this.origin = BASE_URL;
    } else if (process.env.NODE_ENV !== 'development') {
      throw new Error(
        'You must either pass an `origin` to @moped/authentication or specify the BASE_URL environment variable.  This is required for Cross Origin Request Forgery protection.',
      );
    }
    if (this.origin) {
      const url = new URL(this.origin);
      this.origin = url.origin;
    }
  }
  private setState(
    req: IncomingMessage,
    res: ServerResponse,
    state: MopedState<SessionIdType, UserIdType, SessionType, UserType>,
  ) {
    (req as any)['@moped/authentication/state'] = state;
    (res as any)['@moped/authentication/state'] = state;
  }
  private getState(
    reqOrRes: IncomingMessage | ServerResponse,
  ): MopedState<SessionIdType, UserIdType, SessionType, UserType> | void {
    return (reqOrRes as any)['@moped/authentication/state'];
  }

  use<T extends Plugin<UserIdType, UserType> = Plugin<UserIdType, UserType>>(
    plugin: T,
  ): T {
    this.plugins.push(plugin);
    this.routers.forEach(router => plugin.apply(this, router));
    return plugin;
  }

  async logout(res: IncomingMessage | ServerResponse) {
    const state = this.getState(res);
    if (!state) {
      throw new Error(
        'Failed to log out as @moped/authentication middleware was not enabled',
      );
    }
    const session = state.session;
    if (session) {
      state.setSessionID(null);
      state.session = undefined;
      state.user = undefined;
      await this.options.deleteSession(session.id);
    }
  }
  async setUserID(
    res: IncomingMessage | ServerResponse,
    userID: UserIdType,
  ): Promise<void> {
    const user = await this.options.getUser(userID);
    if (user) {
      await this.setUser(res, user);
    }
  }
  async setUser(
    res: IncomingMessage | ServerResponse,
    user: UserType,
  ): Promise<void> {
    const state = this.getState(res);
    if (!state) {
      throw new Error(
        'Failed to set user as @moped/authentication middleware was not enabled',
      );
    }
    const session = await this.options.createSession(
      user.id,
      state.req,
      state.res,
    );
    state.setSessionID(session.id);
    state.session = session;
    state.user = user;
  }
  getSession(req: IncomingMessage | ServerResponse): SessionType | null {
    const state = this.getState(req);
    if (state) {
      return state.session || null;
    }
    return null;
  }
  getUser(req: IncomingMessage | ServerResponse): UserType | null {
    const state = this.getState(req);
    if (state) {
      return state.user || null;
    }
    return null;
  }

  isAuthenticated(req: IncomingMessage | ServerResponse): boolean {
    return this.getUser(req) != null;
  }

  getHref(req: IncomingMessage | ServerResponse, relativeURL: string): string {
    // in production, just resolve relative to the origin
    if (this.origin) {
      return new URL(relativeURL, this.origin).href;
    }

    // in development, resolve based on the host headers, assuming http protocol
    const state = this.getState(req);
    if (state) {
      const host =
        state.req.headers['x-forwarded-host'] || state.req.headers['host'];
      return new URL(relativeURL, 'http://' + host).href;
    }
    throw new Error(
      'Failed to resolve url as @moped/authentication middleware was not enabled',
    );
  }

  private isCrossOrigin(header: string | string[] | void, req: Request) {
    if (!header) {
      return false;
    }

    const actual = new URL(header + '');

    // in production, it must match the explicityl supplied origin
    if (this.origin && actual.origin === this.origin) {
      return false;
    }

    // in development, it can match either the host, or the x-forwarded-host
    if (process.env.NODE_ENV === 'development') {
      if (actual.origin === actual.protocol + '//' + req.headers.host) {
        return false;
      }
      if (
        actual.origin ===
        actual.protocol + '//' + req.headers['x-forwarded-host']
      ) {
        return false;
      }
    }

    return true;
  }
  middleware(): Router {
    const router = Router();
    if (this.options.helmetOptions !== false) {
      router.use(helmet(this.options.helmetOptions));
    }
    // CSRF Protection
    router.use((req, res, next) => {
      if (
        req.method !== 'GET' &&
        (!(req.headers.referer || req.headers.origin) ||
          this.isCrossOrigin(req.headers.referer, req) ||
          this.isCrossOrigin(req.headers.origin, req))
      ) {
        return next(
          createError(
            403,
            'invalid cross origin request ' +
              inspect({
                referer: req.headers.referer,
                origin: req.headers.origin,
                target: this.origin,
              }),
            {
              code: 'ECROSSORIGINREQUEST',
            },
          ),
        );
      }
      next();
    });
    // Cookies for login state
    router.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        let isAuthenticated = false;
        const cookies = new Cookies(req, res, {keys: this.options.keys});
        const setSessionID = (id: SessionIdType | null) => {
          const sameSite =
            this.options.sameSiteCookie === undefined
              ? 'lax'
              : this.options.sameSiteCookie;
          if (id == null) {
            cookies.set(COOKIE_NAME, '', {
              sameSite,
              signed: true,
              maxAge: COOKIE_MAX_AGE,
            });
          } else {
            cookies.set(COOKIE_NAME, JSON.stringify(id), {
              sameSite,
              signed: true,
              maxAge: COOKIE_MAX_AGE,
            });
          }
        };
        const sessionCookie = cookies.get(COOKIE_NAME, {
          signed: true,
        });
        if (sessionCookie) {
          const sessionID = JSON.parse(sessionCookie);
          const session = await this.options.getSession(sessionID);
          if (session) {
            const user = await this.options.getUser(session.userID);
            if (user) {
              this.setState(
                req,
                res,
                new MopedState(setSessionID, req, res, session, user),
              );
              isAuthenticated = true;
            }
          }
        }
        if (!isAuthenticated) {
          this.setState(req, res, new MopedState(setSessionID, req, res));
        }
      } catch (ex) {
        return next(ex);
      }
      next();
    });
    router.post('/__/auth/logout', async (req, res, next) => {
      try {
        await this.logout(res);
        const returnUrl =
          req.query.returnUrl || (req.body && req.body.returnUrl);
        if (returnUrl && typeof returnUrl === 'string') {
          res.redirect(returnUrl);
        } else if (
          req.headers.accept &&
          req.headers.accept.indexOf('text/html') === -1
        ) {
          res.sendStatus(204);
        } else {
          res.redirect('/');
        }
      } catch (ex) {
        next(ex);
      }
    });
    this.routers.push(router);
    this.plugins.slice().forEach(plugin => plugin.apply(this, router));
    return router;
  }
}

export interface IPluginAuthentication<
  UserIdType,
  UserType extends BaseUser<UserIdType> = BaseUser<UserIdType>
> {
  setUserID(
    res: IncomingMessage | ServerResponse,
    userID: UserIdType,
  ): Promise<void>;
  setUser(res: IncomingMessage | ServerResponse, user: UserType): Promise<void>;
  getUser(req: IncomingMessage | ServerResponse): UserType | null;
  isAuthenticated(req: IncomingMessage | ServerResponse): boolean;
}
export interface Plugin<
  UserIdType,
  UserType extends BaseUser<UserIdType> = BaseUser<UserIdType>
> {
  apply(
    authentication: IPluginAuthentication<UserIdType, UserType>,
    router: Router,
  ): void;
}

type SetSessionID<SessionIdType> = (id: SessionIdType | null) => void;
class MopedState<
  SessionIdType,
  UserIdType,
  SessionType extends BaseSession<SessionIdType, UserIdType> = BaseSession<
    SessionIdType,
    UserIdType
  >,
  UserType extends BaseUser<UserIdType> = BaseUser<UserIdType>
> {
  readonly setSessionID: SetSessionID<SessionIdType>;
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  session: SessionType | void;
  user: UserType | void;
  constructor(
    setSessionID: SetSessionID<SessionIdType>,
    req: IncomingMessage,
    res: ServerResponse,
  );
  constructor(
    setSessionID: SetSessionID<SessionIdType>,
    req: IncomingMessage,
    res: ServerResponse,
    session: SessionType,
    user: UserType,
  );
  constructor(
    setSessionID: SetSessionID<SessionIdType>,
    req: IncomingMessage,
    res: ServerResponse,
    session?: SessionType,
    user?: UserType,
  ) {
    this.setSessionID = setSessionID;
    this.req = req;
    this.res = res;
    this.session = session;
    this.user = user;
  }
}

module.exports = Authentication;
module.exports.default = Authentication;
