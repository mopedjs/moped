import * as webpack from 'webpack';

/**
 * If you require a missing module and then `npm install` it, you still have
 * to restart the development server for Webpack to discover it. This plugin
 * makes the discovery automatic so you don't have to restart.
 * See https://github.com/facebookincubator/create-react-app/issues/186
 */
declare class WatchMissingNodeModulesType extends webpack.Plugin {
  constructor(nodeModulesDirectoryName: string);
}

export default WatchMissingNodeModulesType;
