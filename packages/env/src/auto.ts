// @public

import load from './';

if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'development' &&
  process.env.NODE_ENV !== 'test'
) {
  throw new Error(
    'The NODE_ENV environment variable must be set to "production", "development" or "test',
  );
}
load(process.env.NODE_ENV as any);
