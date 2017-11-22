import * as webpack from 'webpack';

export declare class SWPrecacheWebpackPluginType extends webpack.Plugin {
  constructor(options: any);
}
export const SWPrecacheWebpackPlugin: typeof SWPrecacheWebpackPluginType = require('sw-precache-webpack-plugin');

export interface Options {
  /**
   * Set this to `true` to minify the service worker.
   * Defaults to `NODE_ENV === 'production'`
   */
  minify?: boolean;
  /**
   * For unknown urls we fall back to rendering this page. Default to `/`
   */
  navigateFallback?: string;
}

/**
 * Generate a service worker script that will precache, and keep up to date,
 * the HTML & assets that are part of the Webpack build.
 */
export default class ServiceWorker extends SWPrecacheWebpackPlugin {
  constructor(options: Options) {
    super({
      // By default, a cache-busting query parameter is appended to requests
      // used to populate the caches, to ensure the responses are fresh.
      // If a URL is already hashed by Webpack, then there is no concern
      // about it being stale, and the cache-busting can be skipped.
      dontCacheBustUrlsMatching: /\.\w{8}\./,
      filename: 'service-worker.js',
      logger(message: string) {
        if (message.indexOf('Total precache size is') === 0) {
          // This message occurs for every build and is a bit too noisy.
          return;
        }
        if (message.indexOf('Skipping static resource') === 0) {
          // This message obscures real errors so we ignore it.
          // https://github.com/facebookincubator/create-react-app/issues/2612
          return;
        }
        console.log(message);
      },
      minify:
        typeof options.minify === 'boolean'
          ? options.minify
          : process.env.NODE_ENV === 'production',
      // For unknown URLs, fallback to the index page
      navigateFallback: options.navigateFallback || '/',
      // Ignores URLs starting from /__ (useful for Firebase):
      // https://github.com/facebookincubator/create-react-app/issues/2237#issuecomment-302693219
      navigateFallbackWhitelist: [/^(?!\/__).*/],
      // Don't precache sourcemaps (they're large) and build asset manifest:
      staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
    });
  }
}
