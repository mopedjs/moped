// auto generated by @moped/db-pg-migrations - do not edit by hand

import migrations, {
  MigrationsPackage,
  operation,
} from '@moped/db-pg-migrations';

export {MigrationsPackage};
export default migrations({
  id: 'd000jcbucsxfuugtdoq9',
  index: 1,
  name: '00001-init.ts',
  operation: async () => operation(await import('./00001-init')),
});
