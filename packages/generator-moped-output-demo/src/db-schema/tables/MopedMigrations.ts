// Auto generated by @moped/db-schema - do not edit by hand

export default interface DbMopedMigrations {
  /**
   * Primary Key
   */
  id: string;
  index: number;

  /**
   * Default Value: false
   */
  isApplied: boolean;
  lastDown: Date | null;
  lastUp: Date | null;
  name: string;
};
