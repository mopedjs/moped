#!/usr/bin/env node

import '@moped/env/development';
import createDb from './';

createDb().catch(ex => {
  console.error(ex);
  process.exit(1);
});
