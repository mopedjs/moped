// Auto generated by @moped/db-schema - do not edit by hand

export default interface DbTokens {
  attemptsRemaining: number;
  created: number;
  dos: string;
  email: string;
  expiry: number;

  /**
   * Primary Key
   * Default Value: nextval('"Tokens_id_seq"'::regclass)
   */
  id: number;
  passCodeHash: string;
  state: string;
  userAgent: string;
};
