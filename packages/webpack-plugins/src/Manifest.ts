import * as webpack from 'webpack';

export declare class ManifestPluginType extends webpack.Plugin {
  constructor(options: {fileName: string});
}
export const ManifestPlugin: typeof ManifestPluginType = require('webpack-manifest-plugin');

/**
 * Generate a manifest file which contains a mapping of all asset filenames
 *  to their corresponding output file so that tools can pick it up without
 *  having to parse `index.html`.
 */
export default class Manifest extends ManifestPlugin {
  constructor() {
    super({
      fileName: 'asset-manifest.json',
    });
  }
}
