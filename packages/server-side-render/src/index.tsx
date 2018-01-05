import {readFileSync} from 'fs';
import BicycleServer from 'bicycle/server-core';
import {Ctx} from 'bicycle/Ctx';
import {Request, Response, NextFunction} from 'express';
import * as React from 'react';
import {Provider as BicycleProvider} from 'react-bicycle';
import {renderToString} from 'react-dom/server';
import _Loadable from 'react-loadable';
import {StaticRouter} from 'react-router-dom';
import {ServerStyleSheet} from 'styled-components';
const {getBundles} = require('react-loadable/webpack');

const stringify = require('js-stringify');

let Loadable = _Loadable;
if (Loadable === undefined) {
  Loadable = require('react-loadable') as any;
}

export interface Options<Context> {
  bicycle: BicycleServer<Context>;
  getBicycleContext: (
    req: Request,
    res: Response,
    options: {stage: 'query' | 'mutation'},
  ) => Ctx<Context>;
  render: (req: Request, res: Response) => React.ReactNode;
}

interface Bundle {
  id: string | number;
  name: string | null;
  file: string;
}
function readReactLoadableManifest() {
  return JSON.parse(readFileSync('react-loadable.json', 'utf8')) as {
    [key: string]: Bundle[];
  };
}
function readTemplate() {
  return readFileSync('public/index.html', 'utf8');
}

export default function getMiddleware<Context>(options: Options<Context>) {
  const bicycle = options.bicycle;
  const loaded = Loadable.preloadAll();
  const renderer = bicycle.createServerRenderer(
    options.getBicycleContext,
    (client, req, res) => {
      // requiredModules.clear();
      const routerContext = {};
      const sheet = new ServerStyleSheet();
      const requiredModules: string[] = [];
      const html = renderToString(
        sheet.collectStyles(
          // <IsDesktopProvider userAgent={req.headers['user-agent']}>
          <Loadable.Capture report={mod => requiredModules.push(mod)}>
            <BicycleProvider client={client as any}>
              <StaticRouter location={req.url} context={routerContext}>
                {options.render(req, res)}
              </StaticRouter>
            </BicycleProvider>
          </Loadable.Capture>,
          // </IsDesktopProvider>,
        ),
      );
      return {
        routerContext,
        html,
        requiredModules,
        styleTags: sheet.getStyleTags(),
      };
    },
  );
  const reactLoadableManifestCached =
    process.env.NODE_ENV === 'production' ? readReactLoadableManifest() : null;
  const templateCached =
    process.env.NODE_ENV === 'production' ? readTemplate() : null;
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }
      await loaded;
      const template = templateCached || readTemplate();
      const reactLoadableManifest =
        reactLoadableManifestCached || readReactLoadableManifest();
      const {serverPreparation, result} = await renderer(req, res);
      const bundles: Bundle[] = getBundles(
        reactLoadableManifest,
        result.requiredModules,
      );
      const routerContext: {[key: string]: any} = result.routerContext;
      if (routerContext.url) {
        res.redirect(routerContext.url);
        return;
      }
      if (typeof routerContext.status === 'number') {
        res.status(routerContext.status);
      }
      res.send(
        template
          .replace(
            /(\<div .*\bid\=[\"\']?root\b[\"\']?(?: .*)?\>)(?:.|\n)*(\<\/div\>)/,
            (_, prefix, suffix) => {
              return prefix + result.html + suffix;
            },
          )
          .replace(/\<\/head\>/, result.styleTags + '</head>')
          .replace(
            /\<script\b/,
            '<script>var SERVER_SIDE_RENDERING=true,BICYCLE_SERVER_PREPARATION=' +
              stringify(serverPreparation) +
              ';</script><script',
          )
          .replace(
            /\<\/body\>/,
            bundles
              // filter out source maps
              .filter(b => /\.js$/.test(b.file))
              .map(b => `<script src="/${b.file}"></script>`)
              .join('') + '<script>window.main();</script></body>',
          ),
      );
    } catch (ex) {
      next(ex);
    }
  };
}
