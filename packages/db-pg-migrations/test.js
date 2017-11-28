process.env.DATABASE_URL =
  'postgres://moped-db-pg-migrations@localhost/moped-db-pg-migrations';
const o = require('./lib/__tests__/output.js').default;
o.upAll();
