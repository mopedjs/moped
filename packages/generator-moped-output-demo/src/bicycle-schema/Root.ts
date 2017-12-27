import BaseObject from 'bicycle/BaseObject';
import BicycleContext from './BicycleContext';
import Session from './Session';

export default class Root extends BaseObject<{}> {
  $auth = {
    public: ['sessions'],
  };

  async sessions(args: void, ctx: BicycleContext): Promise<Session[]> {
    if (ctx.user == null) {
      return [];
    }
    return (await ctx.db.Sessions.list({userID: ctx.user.id})).map(
      session => new Session(session),
    );
  }
}
