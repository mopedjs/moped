import server from './server';
import browser from './browser';
import env from './env';

if (env === 'test') {
  module.exports = server;
} else {
  module.exports = browser;
}
