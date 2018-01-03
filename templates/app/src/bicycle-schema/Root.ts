import BaseObject from 'bicycle/BaseObject';
import BicycleContext from './BicycleContext';
import User from './User';

/**
 * All bicycle queries start at this, special, root object.
 * It must be called "Root" or bicycle will not recognise it as
 * the root object.
 */
export default class Root extends BaseObject<{}> {
  // $auth defines which properties methods are exposed to users
  $auth = {
    // public allows all users, including un-authenticated users,
    // to call a method/query a field
    public: ['user', 'users'],
  };
  user(args: void, ctx: BicycleContext): User | null {
    if (ctx.user) {
      // we wrap the datbase user in a bicycle "User" object to
      // expose it to queries
      return new User(ctx.user);
    }
    return null;
  }
  async users(args: void, ctx: BicycleContext): Promise<User[]> {
    const users = await ctx.db.Users.list();
    // we wrap users in the bicycle "User" object to expose
    // only the public properties to queries
    return users
      .sort((a, b) => (a.name < b.name ? 1 : -1))
      .map(user => new User(user));
  }
}
