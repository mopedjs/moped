import server from './server';
import browser from './browser';
import env from './env';

export default (env === 'test' ? server : browser);
module.exports = env === 'test' ? require('./server') : require('./browser');
