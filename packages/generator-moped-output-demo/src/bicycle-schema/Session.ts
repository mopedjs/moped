import BaseObject from 'bicycle/BaseObject';
import * as tables from 'src/db-schema/tables';
import BicycleContext from './BicycleContext';

export default class Session extends BaseObject<tables.Sessions> {
  $auth = {
    public: ['id', 'userAgent', 'lastSeen'],
  };

  lastSeen(): string {
    // TODO: make dates work in bicycle
    return this.data.lastSeen.toISOString();
  }

  static $auth = {
    ownSession: ['deleteSession'],
  };

  static async $ownSession(
    id: tables.Sessions['id'],
    ctx: BicycleContext,
  ): Promise<boolean> {
    const session = await ctx.db.Sessions.get(id);
    return !!(session && ctx.user != null && session.userID === ctx.user.id);
  }

  static async deleteSession(id: tables.Sessions['id'], ctx: BicycleContext) {
    // $ownSession has already verified that `id` is a session owned by
    ///the authenticated user, so it is safe to remove it.
    await ctx.db.Sessions.remove(id);
  }
}
