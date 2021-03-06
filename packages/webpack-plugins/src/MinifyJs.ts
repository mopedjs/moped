import * as webpack from 'webpack';

/**
 * Minify JavaScript code for production
 */
export default class MinifyJs extends webpack.optimize.UglifyJsPlugin {
  constructor() {
    super({
      compress: {
        warnings: false,
        // Disabled because of an issue with Uglify breaking seemingly valid code:
        // https://github.com/facebookincubator/create-react-app/issues/2376
        // Pending further investigation:
        // https://github.com/mishoo/UglifyJS2/issues/2011
        comparisons: false,
      },
      output: {
        comments: false,
        // Turned on because emoji and regex is not minified properly using default
        // https://github.com/facebookincubator/create-react-app/issues/2488
        ascii_only: true,
      } as any,
      sourceMap: true,
    });
  }
}
