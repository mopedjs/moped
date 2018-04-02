import Passwordless, {
  VerifyPassCodeStatusKind,
} from '@authentication/passwordless';
import {Router} from 'express';
import db from 'src/db';
import DatabaseAPI from 'src/db-schema';
import {getBicycleContext} from 'src/bicycle-schema/BicycleContext';

export interface PasswordlessState {
  redirectURL: string;
}

export function findOrCreateUser(email: string, database: DatabaseAPI = db) {
  return database.tx(async db => {
    const existingRecord = await db.UserEmails.get(email);
    if (existingRecord) {
      return existingRecord;
    }
    const user = await db.Users.create({
      name: email.split('@')[0],
    });
    return await db.UserEmails.create({
      email,
      userID: user.id,
    });
  });
}

const passwordless = new Passwordless<PasswordlessState>({
  // we use the `/__/` prefix to bypass service workers
  callbackURL: '/__/auth/verify-email',
  store: {
    tx(fn) {
      return db.tx(connection =>
        fn({
          // tokens:

          async saveToken(token) {
            const t = await connection.Tokens.create({
              attemptsRemaining: token.attemptsRemaining,
              created: token.created,
              dos: token.dos,
              email: token.userID,
              expiry: token.expiry,
              passCodeHash: token.passCodeHash,
              state: JSON.stringify(token.state) || '',
              userAgent: token.userAgent,
            });
            return `${t.id}`;
          },
          async loadToken(tokenID: string) {
            const token = await connection.Tokens.get(parseInt(tokenID, 10));
            if (!token) {
              return null;
            }
            return {
              attemptsRemaining: token.attemptsRemaining,
              created: token.created,
              dos: token.dos,
              userID: token.email,
              expiry: token.expiry,
              passCodeHash: token.passCodeHash,
              state: token.state ? JSON.parse(token.state) : undefined,
              userAgent: token.userAgent,
            };
          },
          async updateToken(tokenID, token) {
            await connection.Tokens.update(parseInt(tokenID, 10), {
              attemptsRemaining: token.attemptsRemaining,
              created: token.created,
              dos: token.dos,
              email: token.userID,
              expiry: token.expiry,
              passCodeHash: token.passCodeHash,
              state: JSON.stringify(token.state) || '',
              userAgent: token.userAgent,
            });
          },
          async removeToken(tokenID) {
            await connection.Tokens.remove(parseInt(tokenID, 10));
          },

          // rate limits:

          async saveRateLimit(id, state) {
            if (await connection.RateLimitStates.get(id)) {
              await connection.RateLimitStates.update(id, state);
            } else {
              await connection.RateLimitStates.create({id, ...state});
            }
          },
          async loadRateLimit(id) {
            return await connection.RateLimitStates.get(id);
          },
          async removeRateLimit(id) {
            return await connection.RateLimitStates.remove(id);
          },
        }),
      );
    },
  },
});
export default passwordless;

export const passwordlessMiddleware = Router();
passwordlessMiddleware.get(
  passwordless.callbackPath,
  async (req, res, next) => {
    try {
      const result = await passwordless.verifyPassCode(req, res);
      if (result.verified) {
        const {userID: email, state} = result;
        await getBicycleContext(req, res)(async ctx => {
          const emailRecord = await findOrCreateUser(email, ctx.db);
          await ctx.setUser(emailRecord.userID);
        });
        res.redirect(state.redirectURL);
      } else {
        const {status} = result;
        switch (status.kind) {
          case VerifyPassCodeStatusKind.ExpiredToken:
            // This error code is picked up by react-passwordless
            // it is important that this redirect goes to a page with
            // a login form
            res.redirect('/?err=EXPIRED_TOKEN');
            break;
          default:
            throw new Error(status.message);
        }
      }
    } catch (ex) {
      next(ex);
    }
  },
);
