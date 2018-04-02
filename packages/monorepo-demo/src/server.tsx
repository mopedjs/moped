import express, {Request, Response} from 'express';
import sentry from '@moped/sentry/server';
import severSideRenderer from '@moped/server-side-render';
import * as React from 'react';
import {passwordlessMiddleware} from './authentication/passwordless';
import App from './components/App';
import BicycleServer from './bicycle/server';
import {
  getBicycleContext,
  refreshSession,
  loadSession,
} from './bicycle-schema/BicycleContext';

const app = express();

// sentry automatically records runtime exceptions for you
// if you set the SENTRY_DSN environment variable to the URL
// you get from https://sentry.io
app.use(
  sentry.requestHandler(async (req: Request, res: Response) => {
    const {user} = await loadSession(req, res);
    return user;
  }),
);

app.use((req, res, next) => {
  // Refreshing the session cookie on every request prevents the session
  // expiring, providing the user visits the site regularly.
  refreshSession(req, res);
  next();
});

// place any custom middleware here, before bicycle

/**
 * Bicycle is a typed data fetching library for node.js / React
 */
const bicycle = new BicycleServer();
app.post('/bicycle', bicycle.createMiddleware(getBicycleContext));

app.use(passwordlessMiddleware);

// place any custom request handlers here (e.g. to serve exports of data as PDFs)

// If you are not doing server side rendering, you can delete this
// if statement, along with the imports for:
//  * @moped/server-side-render
//  * react
//  * ./components/App
if (process.env.PROXY_HTML_REQUESTS === 'true') {
  app.use(
    severSideRenderer({
      bicycle,
      getBicycleContext,
      render() {
        return <App />;
      },
    }),
  );
}

app.use(sentry.errorHandler());

export default app;
