// Auto generated by @moped/db-schema - do not edit by hand

export default interface DbUsers {
  /**
   * Primary Key
   * Default Value: nextval('"Users_id_seq"'::regclass)
   */
  id: number;
  name: string;

  /**
   * Default Value: ''::text
   */
  privateStatus: string;

  /**
   * Default Value: ''::text
   */
  publicStatus: string;
};
