import * as webpack from 'webpack';

/**
 * Node.js does not support source maps by default.
 * This module ensures source map support ins always installed.
 */
export default class SourceMapSupport extends webpack.BannerPlugin {
  constructor() {
    super({
      banner: 'require("source-map-support").install();',
      raw: true,
      entryOnly: false,
    });
  }
}
