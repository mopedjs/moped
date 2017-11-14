import {statSync} from 'fs';
import {resolve} from 'path';
import chalk from 'chalk';
import resolveLoopback from './resolveLoopback';
import onProxyError from './onProxyError';

export type ProxyConfig = string | {[key: string]: {target: string}};
export interface Options {
  /**
   * By default, we never proxy requests for "text/html" since these should go to index.html
   * in single page apps without server side rendering.  If you are doing server side rendering
   * you should enable this to proxy those requests.
   *
   * When using the object method for configuring the proxy, we proxy html requests by default.
   * You can set this to `false` to prevent proxying of html requests in object config.
   */
  proxyHtmlRequests?: boolean;
  publicDirectoryName?: string;
}

export default function prepareProxy(
  proxy: ProxyConfig,
  options: Options = {},
) {
  // `proxy` lets you specify alternate servers for specific requests.
  // It can either be a string or an object conforming to the Webpack dev server proxy configuration
  // https://webpack.github.io/docs/webpack-dev-server.html
  if (!proxy) {
    return undefined;
  }
  if (typeof proxy !== 'object' && typeof proxy !== 'string') {
    console.log(
      chalk.red(
        'When specified, "proxy" in package.json must be a string or an object.',
      ),
    );
    console.log(
      chalk.red('Instead, the type of "proxy" was "' + typeof proxy + '".'),
    );
    console.log(
      chalk.red(
        'Either remove "proxy" from package.json, or make it an object.',
      ),
    );
    process.exit(1);
  }

  // Otherwise, if proxy is specified, we will let it handle any request except for files in the public folder.
  function mayProxy(pathname: string) {
    if (!options.publicDirectoryName) {
      return true;
    }
    const maybePublicPath = resolve(
      options.publicDirectoryName,
      pathname.slice(1),
    );
    try {
      return !statSync(maybePublicPath).isFile();
    } catch (ex) {
      return true;
    }
  }

  // Support proxy as a string for those who are using the simple proxy option
  if (typeof proxy === 'string') {
    if (!/^http(s)?:\/\//.test(proxy)) {
      console.log(
        chalk.red(
          'When "proxy" is specified in package.json it must start with either http:// or https://',
        ),
      );
      process.exit(1);
    }

    const target: string =
      process.platform === 'win32' ? resolveLoopback(proxy) : proxy;
    return [
      {
        target,
        logLevel: 'silent',
        // For single page apps, we generally want to fallback to /index.html.
        // However we also want to respect `proxy` for API calls.
        // So if `proxy` is specified as a string, we need to decide which fallback to use.
        // We use a heuristic: if request `accept`s text/html, we pick /index.html.
        // Modern browsers include text/html into `accept` header when navigating.
        // However API calls like `fetch()` won’t generally accept text/html.
        // If this heuristic doesn’t work well for you, use a custom `proxy` object.
        context(pathname: string, req: any) {
          return (
            mayProxy(pathname) &&
            (options.proxyHtmlRequests ||
              (req.headers.accept &&
                req.headers.accept.indexOf('text/html') === -1))
          );
        },
        onProxyReq(proxyReq: any) {
          // Browers may send Origin headers even with same-origin
          // requests. To prevent CORS issues, we have to change
          // the Origin to match the target URL.
          if (proxyReq.getHeader('origin')) {
            proxyReq.setHeader('origin', target);
          }
        },
        onError: onProxyError(target),
        secure: false,
        changeOrigin: true,
        ws: true,
        xfwd: true,
      },
    ];
  }

  // Otherwise, proxy is an object so create an array of proxies to pass to webpackDevServer
  return Object.keys(proxy).map(function(context) {
    if (!proxy[context].hasOwnProperty('target')) {
      console.log(
        chalk.red(
          'When `proxy` in package.json is as an object, each `context` object must have a ' +
            '`target` property specified as a url string',
        ),
      );
      process.exit(1);
    }
    const target: string =
      process.platform === 'win32'
        ? resolveLoopback(proxy[context].target)
        : proxy[context].target;

    return Object.assign({}, proxy[context], {
      context(pathname: string, req: any) {
        return (
          mayProxy(pathname) &&
          pathname.match(context) &&
          (options.proxyHtmlRequests !== false ||
            (req.headers.accept &&
              req.headers.accept.indexOf('text/html') === -1))
        );
      },
      onProxyReq(proxyReq: any) {
        // Browers may send Origin headers even with same-origin
        // requests. To prevent CORS issues, we have to change
        // the Origin to match the target URL.
        if (proxyReq.getHeader('origin')) {
          proxyReq.setHeader('origin', target);
        }
      },
      target,
      onError: onProxyError(target),
    });
  });
}
