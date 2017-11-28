import migrations, {MigrationsPackage, operation} from '../';

export {MigrationsPackage};
export default migrations(
  {
    id: 1,
    name: '00001-init.ts',
    operation: async () => operation(await import('./migrations/00001-init')),
  },
  {
    id: 2,
    name: '00002-update.ts',
    operation: async () => operation(await import('./migrations/00002-update')),
  },
);
