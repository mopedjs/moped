# register-service-worker

A helper for managing the lifecycle of a service worker. It is part of the moped suite of utilities for creating composable configs for building node.js and react apps.

## Installation

```
yarn add @moped/register-service-worker
```

## Usage

```js
import register, {unregister} from '@moped/register-service-worker';

register({
  serviceWorkerNotInstalling() {
    console.log('Service worker not installing.');
  },
  newContentAvailable() {
    // At this point, the old content will have been purged and
    // the fresh content will have been added to the cache.
    // It's the perfect time to display a "New content is
    // available; please refresh." message in your web app.
    console.log('New content is available; please refresh.');
  },
  contentCached() {
    // At this point, everything has been precached.
    // It's the perfect time to display a
    // "Content is cached for offline use." message.
    console.log('Content is cached for offline use.');
  },
  noInternetConnectionFound() {
    // Only called in development mode, when the backend is
    // not currently running.
    console.log(
      'No internet connection found. App is running in offline mode.',
    );
  },
  errorRegisteringServiceWorker(err: Error){
    console.error('Error during service worker registration:', error);
  },
});
```

## License

MIT