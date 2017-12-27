import express from 'express';
import BicycleServer from './bicycle/server';
import {
  getBicycleContext,
  refreshSession,
} from './bicycle-schema/BicycleContext';

const app = express();

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

// place any custom request handlers here (e.g. to serve exports of data as PDFs)

export default app;
