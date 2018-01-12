export default interface MigrationStatus {
  id: string;
  index: number;
  name: string;
  isApplied: boolean;
  lastUp: Date | null;
  lastDown: Date | null;
};
