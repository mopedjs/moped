'use strict';

if (typeof Promise === 'undefined') {
  // Rejection tracking prevents a common issue where React gets into an
  // inconsistent state due to an error, but it gets swallowed by a Promise,
  // and the user has no idea what causes React's erratic future behavior.
  require('promise/lib/rejection-tracking').enable({
    allRejections: true,
    onUnhandled(id: number, error: Error) {
      console.warn('Possible Unhandled Promise Rejection (id: ' + id + '):');
      var errStr = (error && (error.stack || error)) + '';
      errStr.split('\n').forEach(function(line) {
        console.warn('  ' + line);
      });
      if ((window as any).onunhandledrejection) {
        (window as any).onunhandledrejection(error);
      }
    },
    onHandled(id: number, error: Error) {
      console.warn('Promise Rejection Handled (id: ' + id + '):');
      console.warn(
        '  This means you can ignore any previous messages of the form "Possible Unhandled Promise Rejection" with id ' +
          id +
          '.',
      );
    },
  });
  (window as any).Promise = require('promise/lib/es6-extensions.js');
}

// fetch() polyfill for making API calls.
require('whatwg-fetch');

// Object.assign() is commonly used with React.
// It will use the native implementation if it's present and isn't buggy.
Object.assign = require('object-assign');
