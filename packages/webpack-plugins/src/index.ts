import * as webpack from 'webpack';
import Env from '@moped/plugin-env';
import StartServer from '@moped/start-server';
import Html from './Html';
import IgnoreMomentLocales from './IgnoreMomentLocales';
import CaseSensitivePathsType from './CaseSensitivePathsType';
import WatchMissingNodeModulesType from './WatchMissingNodeModulesType';
import MinifyJs from './MinifyJs';
import Manifest from './Manifest';
import ServiceWorker from './ServiceWorker';
import SourceMapSupport from './SourceMapSupport';

const CaseSensitivePaths: typeof CaseSensitivePathsType = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModules: typeof WatchMissingNodeModulesType = require('react-dev-utils/WatchMissingNodeModulesPlugin');

export {
  Env,
  Html,
  IgnoreMomentLocales,
  CaseSensitivePaths,
  WatchMissingNodeModules,
  MinifyJs,
  Manifest,
  ServiceWorker,
  StartServer,
  SourceMapSupport,
};

export const NamedModules = webpack.NamedModulesPlugin;
export const HotModuleReplacement = webpack.HotModuleReplacementPlugin;
