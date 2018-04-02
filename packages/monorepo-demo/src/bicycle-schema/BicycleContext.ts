import Cookie from '@authentication/cookie';
import {Request, Response} from 'express';
import * as PasswordlessTypes from '@authentication/passwordless';
import Session from 'src/db-schema/tables/Sessions';
import User from 'src/db-schema/tables/Users';
import DatabaseAPI from 'src/db-schema';
import db from 'src/db';
import passwordless, {PasswordlessState} from 'src/authentication/passwordless';

// sid short for Session ID, the session stores info about the currently
// logged in user.
// `number` is the type of the session ID.
// maxAge, 1 month says that people should remain logged in for up to 1 month
// after they last visited your site.
const sessionCookie = new Cookie<number>('sid', {maxAge: '30 days'});

export interface Options {
  db: DatabaseAPI;
  session?: Session;
  user?: User;
  setUser: (userID: number) => Promise<Session>;
  logout: (session: Session) => Promise<void>;

  createPasswordlessToken(
    email: string,
    state: PasswordlessState,
  ): Promise<PasswordlessTypes.CreateTokenResult>;
  verifyPassworldessToken(
    passCode: string,
  ): Promise<PasswordlessTypes.VerifyPassCodeResult<PasswordlessState>>;
}

/**
 * Bicycle Context is used to track the context of a bicycle query/mutation
 * It should contain information about the currently authenticated user, a
 * way to change the currently authenticated user, and a database connection
 * to be used throughout the query/mutation.
 *
 * It should not be possible for a malicious user to call arbitrary methods
 * on this class.
 */
export default class BicycleContext {
  private _setUser: (userID: number) => Promise<Session>;
  private _logout: (session: Session) => Promise<void>;

  db: DatabaseAPI;
  session?: Session;
  user?: User;

  createPasswordlessToken: (
    email: string,
    state: PasswordlessState,
  ) => Promise<PasswordlessTypes.CreateTokenResult>;
  verifyPassworldessToken: (
    passCode: string,
  ) => Promise<PasswordlessTypes.VerifyPassCodeResult<PasswordlessState>>;

  constructor(options: Options) {
    this._setUser = options.setUser;
    this._logout = options.logout;
    this.db = options.db;
    this.session = options.session;
    this.user = options.user;
    this.createPasswordlessToken = options.createPasswordlessToken;
    this.verifyPassworldessToken = options.verifyPassworldessToken;
  }

  async setUser(userID: number): Promise<Session | null> {
    const user = await this.db.Users.get(userID);
    if (user) {
      const session = await this._setUser(userID);
      this.user = user;
      this.session = session;
      return session;
    }
    return null;
  }
  async logout(): Promise<void> {
    if (this.session) {
      await this._logout(this.session);
      this.user = undefined;
      this.session = undefined;
    }
  }
}

/**
 * This method gets the default bicycle context used in all web requests.
 * It is responsible for handling reading and writing the session data from
 * the cookie.
 *
 * We intentionally don't pass the `req` and `res` into the `BicycleContext`
 * class in case we want to re-use our bicycle schema outside of the context
 * of a web request. In this case we wouldn't have an `req` and `res to pass
 * in.
 */
export function getBicycleContext(req: Request, res: Response) {
  return <T>(fn: (context: BicycleContext) => Promise<T>): Promise<T> =>
    db.task(async db => {
      const {session, user} = await loadSession(req, res, db);
      return await fn(
        new BicycleContext({
          db,
          session: session || undefined,
          user: user || undefined,
          async setUser(userID) {
            const session = await db.Sessions.create({
              created: new Date(),
              lastSeen: new Date(),
              userID,
              userAgent: '' + req.headers['user-agent'] || null,
            });
            sessionCookie.set(req, res, session.id);
            return session;
          },
          async logout(session: Session) {
            await db.Sessions.remove(session.id);
            sessionCookie.remove(req, res);
          },

          createPasswordlessToken(email: string, state: PasswordlessState) {
            return passwordless.createToken(req, res, email, state);
          },
          verifyPassworldessToken(passCode: string) {
            return passwordless.verifyPassCode(req, res, {passCode});
          },
        }),
      );
    });
}

export function refreshSession(req: Request, res: Response) {
  sessionCookie.refresh(req, res);
  const sid = sessionCookie.get(req, res);
  if (sid !== null) {
    db.Sessions.update(sid, {
      lastSeen: new Date(),
    }).catch(ex => {
      // we intentionally do not crash or wait for `lastSeen` to update
      // as it is not super important
      console.warn('Failed to update lastSeen for session, ' + sid);
    });
  }
}

export async function loadSession(
  req: Request,
  res: Response,
  database: DatabaseAPI = db,
) {
  const sid = sessionCookie.get(req, res);
  const session = sid == null ? null : await db.Sessions.get(sid);
  const user = session == null ? null : await db.Users.get(session.userID);
  return {session, user};
}
