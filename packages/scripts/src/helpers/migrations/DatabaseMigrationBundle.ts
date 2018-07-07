export default interface DatabaseMigrationBundle {
  names: string[];
  migrationsDirectory: string | null;
  schemaDirectory: string | null;
  schemaOverrides: string | null;
  databaseURL: string;
}
