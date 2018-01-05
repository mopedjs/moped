import * as webpack from 'webpack';
const {ReactLoadablePlugin} = require('react-loadable/webpack');

export interface ReactLoadablePluginOptions {
  /**
   * The absolute file name of the output
   *
   * N.B. not relative to build directory
   */
  filename: string;
}
/**
 * Watcher doesn't work well if you mistype casing in a path so we use
 * a plugin that prints an error when you attempt to do this.
 * See https://github.com/facebookincubator/create-react-app/issues/240
 */
declare class ReactLoadablePluginType extends webpack.Plugin {
  constructor(options: ReactLoadablePluginOptions);
}
export {ReactLoadablePluginType};
export default ReactLoadablePlugin as typeof ReactLoadablePluginType;
