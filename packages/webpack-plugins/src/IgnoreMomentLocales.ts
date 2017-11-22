import * as webpack from 'webpack';

/**
 * Moment.js is an extremely popular library that bundles large locale files
 * by default due to how Webpack interprets its code. This is a practical
 * solution that requires the user to opt into importing specific locales.
 * https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
 *
 * You can remove this if you don't use Moment.js
 */
export default class IgnoreMomentLocales extends webpack.IgnorePlugin {
  constructor() {
    super(/^\.\/locale$/, /moment$/);
  }
}
