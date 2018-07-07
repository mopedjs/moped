import * as webpack from 'webpack';

// "file" loader makes sure those assets get served by WebpackDevServer.
// When you `import` an asset, you get its (virtual) filename.
// In production, they would get copied to the `build` folder.
// This loader doesn't uses a "test" so it will catch all modules
const file: webpack.Rule = {
  test: () => true,
  // Exclude `js` files to keep "css" loader working as it injects
  // it's runtime that would otherwise processed through "file" loader.
  // Also exclude `html` and `json` extensions so they get processed
  // Exclude default_index.ejs as it is the default template used by
  // HtmlWebpackPlugin
  // Exclude storybook .ejs files as otherwise storybook does not work
  exclude: [
    /\.html$/,
    /\.js$/,
    /\.json$/,
    /default_index\.ejs$/,
    /storybook.*\.ejs$/,
  ],
  loader: require.resolve('file-loader'),
  options: {
    name: 'static/media/[name].[hash:8].[ext]',
  },
};

export default function createFileRule() {
  return file;
}

module.exports = createFileRule;
module.exports.default = createFileRule;
