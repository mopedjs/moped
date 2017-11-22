import * as webpack from 'webpack';

/**
 * Watcher doesn't work well if you mistype casing in a path so we use
 * a plugin that prints an error when you attempt to do this.
 * See https://github.com/facebookincubator/create-react-app/issues/240
 */
declare class CaseSensitivePathsType extends webpack.Plugin {}

export default CaseSensitivePathsType;
