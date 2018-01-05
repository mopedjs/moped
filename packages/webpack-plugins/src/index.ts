import * as webpack from 'webpack';
import Env from '@moped/plugin-env';
import StartServer from '@moped/start-server';
import Html from './Html';
import IgnoreMomentLocales from './IgnoreMomentLocales';
import CaseSensitivePathsType from './CaseSensitivePathsType';
import CurrentWorkingDirectory from './CurrentWorkingDirectory';
import WatchMissingNodeModulesType from './WatchMissingNodeModulesType';
import MinifyJs from './MinifyJs';
import Manifest from './Manifest';
import ReactLoadable from './ReactLoadable';
import ServiceWorker from './ServiceWorker';
import SourceMapSupport from './SourceMapSupport';

const CaseSensitivePaths: typeof CaseSensitivePathsType = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModules: typeof WatchMissingNodeModulesType = require('react-dev-utils/WatchMissingNodeModulesPlugin');

export {
  Env,
  Html,
  IgnoreMomentLocales,
  CaseSensitivePaths,
  CurrentWorkingDirectory,
  WatchMissingNodeModules,
  MinifyJs,
  Manifest,
  ReactLoadable,
  ServiceWorker,
  StartServer,
  SourceMapSupport,
};

export const NamedModules = webpack.NamedModulesPlugin;
export const HotModuleReplacement = webpack.HotModuleReplacementPlugin;
