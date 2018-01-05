import * as webpack from 'webpack';

export declare class ManifestPluginType extends webpack.Plugin {
  constructor(options: {fileName: string});
}
export const ManifestPlugin: typeof ManifestPluginType = require('webpack-manifest-plugin');

export interface Options {
  /**
   * Set this to true to write out asset-manifest.json to disk even when
   * using webpack-dev-server. This is useful if you are doing
   * server side rendering.
   */
  alwaysWriteToDisk?: boolean;
}

/**
 * Generate a manifest file which contains a mapping of all asset filenames
 *  to their corresponding output file so that tools can pick it up without
 *  having to parse `index.html`.
 */
export default class Manifest extends ManifestPlugin {
  constructor(options: Options = {}) {
    super({
      fileName: 'asset-manifest.json',
      writeToFileEmit: !!options.alwaysWriteToDisk,
    } as any);
  }
}
