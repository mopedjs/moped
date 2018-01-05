import * as webpack from 'webpack';

/**
 * __dirname refers to the directory of the source files,
 * process.cwd() can vary.
 * This ensures that `process.cwd()` is always the __dirname of the compiled
 * source.
 */
export default class CurrentWorkingDirectory extends webpack.BannerPlugin {
  constructor() {
    super({
      banner: 'process.chdir(__dirname);',
      raw: true,
      entryOnly: true,
    });
  }
}
