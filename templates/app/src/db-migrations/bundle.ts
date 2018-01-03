import migrations, {
  MigrationsPackage,
  operation,
} from '@moped/db-pg-migrations';

export {MigrationsPackage};
export default migrations({
  id: 1,
  name: '00001-init.ts',
  operation: async () => operation(await import('./00001-init')),
});
