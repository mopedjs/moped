// This is the entry point for your server side code when running
// in production.
import serve from '@moped/serve-assets';
import dbMigrations from './db-migrations/bundle';

async function prepareDatabase() {
  // If you need to update the database schema, you can do so
  // here before your application has actually started
  await dbMigrations.upAll();
}

// serve immediately binds to a port and begins serving static assets
// it is ok to take an extra second or two to start the dynamic server
// this allows us to check the databse is properly updated
serve(prepareDatabase().then(() => import('./server')));
