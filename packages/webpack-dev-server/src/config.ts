import {Application} from 'express';
import WebpackDevServer = require('webpack-dev-server');
import prepareProxy, {ProxyConfig} from './prepareProxy';

const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');

export interface WebpackDevServerConfig {
  // getHostInfo().lanUrlForConfig
  allowedHost?: string;
  dangerouslyDisableHostCheck?: boolean;
  /**
   * The host to serve content on. Defaults to `process.env.HOST || '0.0.0.0'`
   */
  host?: string;
  /**
   * The protocol to serve content on. Defaults to `process.env.HTTPS === 'true' ? 'https' : 'http'`.
   */
  protocol?: 'http' | 'https';
  proxy?: ProxyConfig;
  proxyHtmlRequests?: boolean;
  /**
   * The public directory, this is not optional because without it, webpack would serve up the source directory
   */
  publicDirectoryName: string;
  /**
   * The public path that the app will be served at. In development this is normally "/" so that is the default.
   */
  publicPath?: string;
}
export default function createWebpackDevServerConfig(
  options: WebpackDevServerConfig,
): WebpackDevServer.Configuration {
  const proxyHtmlRequests =
    options.proxyHtmlRequests !== undefined
      ? options.proxyHtmlRequests
      : process.env.PROXY_HTML_REQUESTS === 'true';
  if (
    options.proxyHtmlRequests === undefined &&
    process.env.PROXY_HTML_REQUESTS !== undefined &&
    process.env.PROXY_HTML_REQUESTS !== 'true' &&
    process.env.PROXY_HTML_REQUESTS !== 'false'
  ) {
    throw new Error(
      'If the PROXY_HTML_REQUESTS environment variable is specified it must be either "true" or "false" but it is set to "' +
        process.env.PROXY_HTML_REQUESTS +
        '"',
    );
  }
  const protocol =
    options.protocol == null
      ? process.env.HTTPS === 'true' ? 'https' : 'http'
      : options.protocol;
  const host =
    options.host == null ? process.env.HOST || '0.0.0.0' : options.host;
  const config = {
    // WebpackDevServer 2.4.3 introduced a security fix that prevents remote
    // websites from potentially accessing local content through DNS rebinding:
    // https://github.com/webpack/webpack-dev-server/issues/887
    // https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
    // However, it made several existing use cases such as development in cloud
    // environment or subdomains in development significantly more complicated:
    // https://github.com/facebookincubator/create-react-app/issues/2271
    // https://github.com/facebookincubator/create-react-app/issues/2233
    // While we're investigating better solutions, for now we will take a
    // compromise. Since our WDS configuration only serves files in the `public`
    // folder we won't consider accessing them a vulnerability. However, if you
    // use the `proxy` feature, it gets more dangerous because it can expose
    // remote code execution vulnerabilities in backends like Django and Rails.
    // So we will disable the host check normally, but enable it if you have
    // specified the `proxy` setting. Finally, we let you override it if you
    // really know what you're doing with a special environment variable.
    disableHostCheck:
      options.proxy == null ||
      options.dangerouslyDisableHostCheck === true ||
      process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true',
    // Enable gzip compression of generated files.
    compress: true,
    // Silence WebpackDevServer's own logs since they're generally not useful.
    // It will still show compile warnings and errors with this setting.
    clientLogLevel: 'none',
    // By default WebpackDevServer serves physical files from current directory
    // in addition to all the virtual build products that it serves from memory.
    // This is confusing because those files won’t automatically be available in
    // production build folder unless we copy them. However, copying the whole
    // project directory is dangerous because we may expose sensitive files.
    // Instead, we establish a convention that only files in `public` directory
    // get served. Our build script will copy `public` into the `build` folder.
    // In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
    // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
    // In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
    // Note that we only recommend to use `public` folder as an escape hatch
    // for files like `favicon.ico`, `manifest.json`, and libraries that are
    // for some reason broken when imported through Webpack. If you just want to
    // use an image, put it in `src` and `import` it from JavaScript instead.
    contentBase: options.publicDirectoryName,
    // By default files from `contentBase` will not trigger a page reload.
    watchContentBase: true,
    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    hot: true,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: options.publicPath || '/',
    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.plugin` calls above.
    quiet: true,
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebookincubator/create-react-app/issues/293
    watchOptions: {
      ignored: /node_modules/,
    },
    // Enable HTTPS if the HTTPS environment variable is set to 'true'
    https: protocol === 'https',
    host,
    overlay: false,
    // TODO: does this need disabling when proxying for server side rendering?
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebookincubator/create-react-app/issues/387.
      disableDotRule: true,
    },
    public: options.allowedHost,
    proxy: options.proxy
      ? prepareProxy(options.proxy, {
          proxyHtmlRequests,
          publicDirectoryName: options.publicDirectoryName,
        })
      : undefined,
    setup(app: Application) {
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware());
      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebookincubator/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware());
    },
  };
  if (options.proxyHtmlRequests) {
    (config as any).index = '';
  }
}
