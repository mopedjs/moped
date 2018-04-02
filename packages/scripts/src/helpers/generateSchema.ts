import {DatabaseMigrationBundle} from '../helpers/migrations';

export default async function generateSchema(bundle: DatabaseMigrationBundle) {
  const {default: pgSchema} = await import('@moped/db-pg-schema');
  const {default: writeSchema} = await import('@moped/db-schema');
  const schema = await pgSchema();
  if (bundle.schemaDirectory) {
    await writeSchema(
      schema,
      bundle.schemaDirectory,
      bundle.schemaOverrides || undefined,
    );
  }
}
