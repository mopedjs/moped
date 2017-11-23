import * as webpack from 'webpack';
import autoprefixer = require('autoprefixer');
import ExtractTextPlugin = require('extract-text-webpack-plugin');
import NoOpPlugin from '@moped/plugin-noop';
import {Environment, getEnvironment, Platform, getPlatform} from '@moped/enums';

export interface CssRuleOptions {
  environment?: Environment;
  platform?: Platform;
  cssFileName?: string;
  shouldUseRelativeAssetPaths?: boolean;
  disableSourceMaps?: boolean;
}

export default function css(
  opts: CssRuleOptions = {},
): {
  rule: webpack.Rule;
  plugin: webpack.Plugin;
} {
  const environment = getEnvironment(opts.environment);
  if (
    opts.platform !== undefined &&
    opts.platform !== Platform.Client &&
    opts.platform !== Platform.Server
  ) {
    throw new Error('Expected platform to be either "client" or "server"');
  }
  const platform = getPlatform(opts.platform, Platform.Client);
  const cssFileName =
    opts.cssFileName || 'static/css/[name].[contenthash:8].css';
  if (
    opts.shouldUseRelativeAssetPaths !== undefined &&
    typeof opts.shouldUseRelativeAssetPaths !== 'boolean'
  ) {
    throw new Error(
      'options.shouldUseRelativeAssetPaths must be a boolean, if provided',
    );
  }
  const shouldUseRelativeAssetPaths = opts.shouldUseRelativeAssetPaths || false;
  if (
    opts.disableSourceMaps !== undefined &&
    typeof opts.disableSourceMaps !== 'boolean'
  ) {
    throw new Error('options.disableSourceMaps must be a boolean, if provided');
  }
  const shouldUseSourceMap =
    typeof opts.disableSourceMaps !== 'boolean'
      ? !opts.disableSourceMaps
      : process.env.GENERATE_SOURCEMAP !== 'false';

  const postCSSLoader = {
    loader: require.resolve('postcss-loader'),
    options: {
      // Necessary for external CSS imports to work
      // https://github.com/facebookincubator/create-react-app/issues/2677
      ident: 'postcss',
      plugins: () => [
        require('postcss-flexbugs-fixes'),
        autoprefixer({
          browsers: [
            '>1%',
            'last 4 versions',
            'Firefox ESR',
            'not ie < 9', // React doesn't support IE8 anyway
          ],
          flexbox: 'no-2009',
        }),
      ],
    },
  };

  if (environment === Environment.Development) {
    if (platform === Platform.Server) {
      return {
        rule: {
          test: /\.css$/,
          use: [
            {
              loader: require.resolve('css-loader/locals'),
              options: {
                importLoaders: 1,
              },
            },
            postCSSLoader,
          ],
        },
        plugin: new NoOpPlugin(),
      };
    }
    return {
      rule: {
        test: /\.css$/,
        use: [
          require.resolve('style-loader'),
          {
            loader: require.resolve('css-loader'),
            options: {
              importLoaders: 1,
            },
          },
          postCSSLoader,
        ],
      },
      plugin: new NoOpPlugin(),
    };
  }

  if (platform === Platform.Server) {
    return {
      rule: {
        test: /\.css$/,
        use: [
          {
            loader: require.resolve('css-loader/locals'),
            options: {
              importLoaders: 1,
              minimize: true,
              sourceMap: shouldUseSourceMap,
            },
          },
          postCSSLoader,
        ],
      },
      plugin: new NoOpPlugin(),
    };
  }

  const plugin = new ExtractTextPlugin({
    filename: cssFileName,
  });

  // The notation here is somewhat confusing.
  // "postcss" loader applies autoprefixer to our CSS.
  // "css" loader resolves paths in CSS and adds assets as dependencies.
  // "style" loader normally turns CSS into JS modules injecting <style>,
  // but unlike in development configuration, we do something different.
  // `ExtractTextPlugin` first applies the "postcss" and "css" loaders
  // (second argument), then grabs the result CSS and puts it into a
  // separate file in our build process. This way we actually ship
  // a single CSS file in production instead of JS code injecting <style>
  // tags. If you use code splitting, however, any async bundles will still
  // use the "style" loader inside the async code so CSS from them won't be
  // in the main CSS file.

  const loader = plugin.extract({
    fallback: {
      loader: require.resolve('style-loader'),
      options: {
        hmr: false,
      },
    },
    use: [
      {
        loader: require.resolve('css-loader'),
        options: {
          importLoaders: 1,
          minimize: true,
          sourceMap: shouldUseSourceMap,
        },
      },
      postCSSLoader,
    ],

    // ExtractTextPlugin expects the build output to be flat.
    // (See https://github.com/webpack-contrib/extract-text-webpack-plugin/issues/27)
    // However, our output is structured with css, js and media folders.
    // To have this structure working with relative paths, we have to use custom options.
    publicPath: shouldUseRelativeAssetPaths
      ? // Making sure that the publicPath goes back to to build folder.
        Array(cssFileName.split('/').length).join('../')
      : undefined,
  });
  return {
    rule: {
      test: /\.css$/,
      use: loader,
    },
    plugin,
  };
}
module.exports = css;
module.exports.default = css;
