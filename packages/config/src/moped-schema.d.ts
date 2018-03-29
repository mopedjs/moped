export interface AppConfigDefinition {
  /**
   * Relative path to a folder to use for database migrations
   */
  dbMigrations?: string;
  /**
   * Relative path to the entry point for the client.
   */
  clientEntryPoint?: string;
  /**
   * Relative path to a file containing types to override database columns.
   */
  dbOverrides?: string;
  /**
   * Disable all client side compilation. If you do this you **must** render everything server side.
   */
  disableClient?: boolean;
  /**
   * Relative path to an html file to use as a template.
   */
  htmlTemplate?: string;
  /**
   * Mark this repository as having a single app.
   */
  monorepo?: any;
  /**
   * Default port to run the app on in development (N.B. backend will default to port + 1)
   */
  port?: number;
  /**
   * Relative path to a public directory, from which all files will be made publicly available.
   */
  publicDirectory?: string;
  /**
   * Relative path to the entry point for the server in development.
   */
  serverEntryPointDev?: string;
  /**
   * Relative path to the entry point for the server in production.
   */
  serverEntryPointProd?: string;
  /**
   * Relative path to the entry point for the server (can be overridden with serverEntryPointDev and serverEntryPointProd).
   */
  serverEntryPoint?: string;
}
export interface MonoRepoDefinition {
  /**
   * Mark this repository as having multiple apps with different entry points.
   */
  monorepo?: any;
}
export type SchemaForMopedrc = AppConfigDefinition | MonoRepoDefinition;
