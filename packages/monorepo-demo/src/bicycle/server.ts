// generated by ts-bicycle
// do not edit by hand

import Schema from 'bicycle/types/Schema';
import SchemaKind from 'bicycle/types/SchemaKind';
import Query from 'bicycle/types/Query';
import QueryContext from 'bicycle/types/QueryContext';
import MutationContext from 'bicycle/types/MutationContext';
import BicycleServer, {Options} from 'bicycle/server-core';
import Root from './../bicycle-schema/Root';
import User from './../bicycle-schema/User';
import _Context0 from './../bicycle-schema/BicycleContext';

// root never has any actual data, so we create one reusable instance
const root = new Root({});
const schema: Schema<_Context0> = {
  Root: {
    kind: SchemaKind.NodeType,
    name: 'Root',
    description: undefined,
    id(): string {
      return 'root';
    },
    matches(obj: any): obj is Root {
      return obj instanceof Root;
    },
    fields: {
      user: {
        kind: SchemaKind.FieldMethod,
        name: 'user',
        description: undefined,
        resultType: {
          kind: 'Union',
          elements: [{kind: 'Null'}, {kind: 'Named', name: 'User'}],
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/Root.ts',
            line: 17,
          },
        } as any,
        argType: {
          kind: 'Void',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/Root.ts',
            line: 17,
          },
        } as any,
        auth: 'public',
        resolve(
          value: {},
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): (null | User) | PromiseLike<null | User> {
          return root.user(args, context);
        },
      },
      users: {
        kind: SchemaKind.FieldMethod,
        name: 'users',
        description: undefined,
        resultType: {
          kind: 'List',
          element: {kind: 'Named', name: 'User'},
        } as any,
        argType: {
          kind: 'Void',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/Root.ts',
            line: 25,
          },
        } as any,
        auth: 'public',
        resolve(
          value: {},
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): User[] | PromiseLike<User[]> {
          return root.users(args, context);
        },
      },
    },
    mutations: {},
  },
  User: {
    kind: SchemaKind.NodeType,
    name: 'User',
    description: undefined,
    id(obj: User, ctx: _Context0, qCtx: QueryContext<_Context0>): string {
      return '' + obj.data.id;
    },
    matches(obj: any): obj is User {
      return obj instanceof User;
    },
    fields: {
      id: {
        kind: SchemaKind.FieldMethod,
        name: 'id',
        description: undefined,
        resultType: {
          kind: 'Number',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/db-schema/tables/Users.ts',
            line: 4,
          },
        } as any,
        argType: {kind: SchemaKind.Void},
        auth: 'public',
        resolve(
          value: User,
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): number {
          return value.data.id;
        },
      },
      name: {
        kind: SchemaKind.FieldMethod,
        name: 'name',
        description: undefined,
        resultType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/db-schema/tables/Users.ts',
            line: 9,
          },
        } as any,
        argType: {kind: SchemaKind.Void},
        auth: 'public',
        resolve(
          value: User,
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): string {
          return value.data.name;
        },
      },
      privateStatus: {
        kind: SchemaKind.FieldMethod,
        name: 'privateStatus',
        description: undefined,
        resultType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/db-schema/tables/Users.ts',
            line: 10,
          },
        } as any,
        argType: {kind: SchemaKind.Void},
        auth(
          value: User,
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): boolean | PromiseLike<boolean> {
          return value.$isOwnUser(args, context);
        },
        resolve(
          value: User,
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): string {
          return value.data.privateStatus;
        },
      },
      publicStatus: {
        kind: SchemaKind.FieldMethod,
        name: 'publicStatus',
        description: undefined,
        resultType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/db-schema/tables/Users.ts',
            line: 15,
          },
        } as any,
        argType: {kind: SchemaKind.Void},
        auth: 'public',
        resolve(
          value: User,
          args: void,
          context: _Context0,
          subQuery: true | Query,
          qCtx: QueryContext<_Context0>,
        ): string {
          return value.data.publicStatus;
        },
      },
    },
    mutations: {
      createPasswordlessToken: {
        kind: SchemaKind.Mutation,
        name: 'createPasswordlessToken',
        description: undefined,
        resultType: {
          kind: 'Union',
          elements: [
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 0,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 7,
                  },
                },
                tokenID: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 8,
                  },
                },
                dos: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 9,
                  },
                },
              },
            },
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 1,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 12,
                  },
                },
                message: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 13,
                  },
                },
                email: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 14,
                  },
                },
              },
            },
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 2,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 17,
                  },
                },
                message: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 18,
                  },
                },
                nextTokenTimestamp: {
                  kind: 'Number',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/CreateTokenStatus.d.ts',
                    line: 19,
                  },
                },
              },
            },
          ],
        } as any,
        argType: {
          kind: 'Object',
          properties: {
            email: {
              kind: 'String',
              loc: {
                fileName:
                  '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
                line: 61,
              },
            },
            state: {
              kind: 'Object',
              properties: {
                redirectURL: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/authentication/passwordless.ts',
                    line: 10,
                  },
                },
              },
              loc: {
                fileName:
                  '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
                line: 61,
              },
            },
          },
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
            line: 61,
          },
        } as any,
        auth: 'public',
        resolve(
          args: {email: string; state: {redirectURL: string}},
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ):
          | (
              | {dos: string; kind: 0; tokenID: string}
              | {email: string; kind: 1; message: string}
              | {kind: 2; message: string; nextTokenTimestamp: number})
          | PromiseLike<
              | {dos: string; kind: 0; tokenID: string}
              | {email: string; kind: 1; message: string}
              | {kind: 2; message: string; nextTokenTimestamp: number}
            > {
          return User.createPasswordlessToken(args, context);
        },
      },
      logout: {
        kind: SchemaKind.Mutation,
        name: 'logout',
        description: undefined,
        resultType: {kind: 'Void'} as any,
        argType: {
          kind: 'Void',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
            line: 57,
          },
        } as any,
        auth(
          args: void,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): boolean | PromiseLike<boolean> {
          return User.$isAuthenticated(args, context);
        },
        resolve(
          args: void,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): void | PromiseLike<void> {
          return User.logout(args, context);
        },
      },
      setName: {
        kind: SchemaKind.Mutation,
        name: 'setName',
        description: undefined,
        resultType: {kind: 'Void'} as any,
        argType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
            line: 41,
          },
        } as any,
        auth(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): boolean | PromiseLike<boolean> {
          return User.$isAuthenticated(args, context);
        },
        resolve(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): void | PromiseLike<void> {
          return User.setName(args, context);
        },
      },
      setPrivateStatus: {
        kind: SchemaKind.Mutation,
        name: 'setPrivateStatus',
        description: undefined,
        resultType: {kind: 'Void'} as any,
        argType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
            line: 51,
          },
        } as any,
        auth(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): boolean | PromiseLike<boolean> {
          return User.$isAuthenticated(args, context);
        },
        resolve(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): void | PromiseLike<void> {
          return User.setPrivateStatus(args, context);
        },
      },
      setPublicStatus: {
        kind: SchemaKind.Mutation,
        name: 'setPublicStatus',
        description: undefined,
        resultType: {kind: 'Void'} as any,
        argType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
            line: 46,
          },
        } as any,
        auth(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): boolean | PromiseLike<boolean> {
          return User.$isAuthenticated(args, context);
        },
        resolve(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ): void | PromiseLike<void> {
          return User.setPublicStatus(args, context);
        },
      },
      verifyPasswordlessToken: {
        kind: SchemaKind.Mutation,
        name: 'verifyPasswordlessToken',
        description: undefined,
        resultType: {
          kind: 'Union',
          elements: [
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 0,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 8,
                  },
                },
                userID: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 9,
                  },
                },
              },
            },
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 1,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 12,
                  },
                },
                message: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 13,
                  },
                },
              },
            },
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 2,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 16,
                  },
                },
                message: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 17,
                  },
                },
                attemptsRemaining: {
                  kind: 'Number',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 18,
                  },
                },
              },
            },
            {
              kind: 'Object',
              properties: {
                kind: {
                  kind: 'Literal',
                  value: 3,
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 21,
                  },
                },
                message: {
                  kind: 'String',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 22,
                  },
                },
                nextTokenTimestamp: {
                  kind: 'Number',
                  loc: {
                    fileName:
                      '/Users/fplindesay/Documents/GitHub/moped/node_modules/@authentication/passwordless/lib/VerifyPassCodeStatus.d.ts',
                    line: 23,
                  },
                },
              },
            },
          ],
        } as any,
        argType: {
          kind: 'String',
          loc: {
            fileName:
              '/Users/fplindesay/Documents/GitHub/moped/packages/monorepo-demo/src/bicycle-schema/User.ts',
            line: 100,
          },
        } as any,
        auth: 'public',
        resolve(
          args: string,
          context: _Context0,
          mCtx: MutationContext<_Context0>,
        ):
          | (
              | {kind: 0; userID: string}
              | {kind: 1; message: string}
              | {attemptsRemaining: number; kind: 2; message: string}
              | {kind: 3; message: string; nextTokenTimestamp: number})
          | PromiseLike<
              | {kind: 0; userID: string}
              | {kind: 1; message: string}
              | {attemptsRemaining: number; kind: 2; message: string}
              | {kind: 3; message: string; nextTokenTimestamp: number}
            > {
          return User.verifyPasswordlessToken(args, context);
        },
      },
    },
  },
};
export {Options};
export default class Server extends BicycleServer<_Context0> {
  constructor(options?: Options) {
    super(schema, options);
  }
}