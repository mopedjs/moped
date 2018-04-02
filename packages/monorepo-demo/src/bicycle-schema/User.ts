import BaseObject from 'bicycle/BaseObject';
import * as tables from 'src/db-schema/tables';
import * as passwordlessTypes from '@authentication/passwordless/types';
import {
  PasswordlessState,
  findOrCreateUser,
} from 'src/authentication/passwordless';
import mailTransport from 'src/email';
import BicycleContext from './BicycleContext';

export default class User extends BaseObject<tables.Users> {
  // $auth defines which properties methods are exposed to users
  $auth = {
    // public allows all users, including un-authenticated users,
    // to call a method/query a field
    public: ['id', 'name', 'publicStatus'],
    // isOwnUser only allows users to query the field if $isOwnUser
    // returns `true` (or a Promise that resolves to `true`)
    isOwnUser: ['privateStatus'],
  };
  $isOwnUser(args: any, context: BicycleContext): boolean {
    return context.user != null && context.user.id === this.data.id;
  }

  // Static APIs are used for updates/mutations
  // static $auth defines which mutations are exposed to users
  static $auth = {
    public: ['createPasswordlessToken', 'verifyPasswordlessToken'],
    // isAuthenticated only allows users to query the field if $isAuthenticated
    // returns `true` (or a Promise that resolves to `true`)
    isAuthenticated: [
      'setName',
      'setPublicStatus',
      'setPrivateStatus',
      'logout',
    ],
  };
  static $isAuthenticated(args: any, ctx: BicycleContext): boolean {
    return ctx.user != null;
  }
  static async setName(status: string, ctx: BicycleContext) {
    await ctx.db.Users.update(ctx.user!.id, {
      name: status,
    });
  }
  static async setPublicStatus(status: string, ctx: BicycleContext) {
    await ctx.db.Users.update(ctx.user!.id, {
      publicStatus: status,
    });
  }
  static async setPrivateStatus(status: string, ctx: BicycleContext) {
    await ctx.db.Users.update(ctx.user!.id, {
      privateStatus: status,
    });
  }

  static async logout(args: void, ctx: BicycleContext) {
    await ctx.logout();
  }
  static async createPasswordlessToken(
    {email, state}: {email: string; state: PasswordlessState},
    ctx: BicycleContext,
  ): Promise<passwordlessTypes.CreateTokenStatus> {
    const result = await ctx.createPasswordlessToken(email, state);
    if (result.created) {
      const {magicLink, passCode} = result;
      await mailTransport.sendMail({
        from: 'noreply@example.com',
        to: email,
        subject: 'Confirm your e-mail',
        text:
          'Thank your for signing in to ' +
          magicLink.hostname +
          '. Please enter the following code into the box provided:\n\n  ' +
          passCode +
          '\n\nor click this "magic" link:\n\n  ' +
          magicLink.href,
        html: `
        <p>
          Thank your for signing in to
          <a href="${magicLink.href}">${magicLink.hostname}</a>.
          Please enter the following code into the box provided:
        </p>
        <p style="font-size: 40px; font-weight: bold; margin: 20px;">
          ${passCode}
        </p>
        <p>or click:</p>
        <a
          style="display:inline-block;background:blue;font-size:40px;font-weight:bold;margin:20px;padding:20px;border-radius:4px;color:white;text-decoration:none;"
          href="${magicLink.href}"
        >
          Magic Link
        </a>
      `,
      });
    }
    return result.status;
  }
  static async verifyPasswordlessToken(
    passCode: string,
    ctx: BicycleContext,
  ): Promise<passwordlessTypes.VerifyPassCodeStatus> {
    const result = await ctx.verifyPassworldessToken(passCode);
    if (result.verified) {
      const email = result.userID;
      const emailRecord = await findOrCreateUser(email, ctx.db);
      await ctx.setUser(emailRecord.userID);
    }
    return result.status;
  }
}
