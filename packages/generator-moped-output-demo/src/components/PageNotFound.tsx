import Status from '@moped/status-code';
import * as React from 'react';

export default function PageNotFound() {
  // We use the "Status" component so that if you enable
  // server side rendering, routes correctly 404, which
  // prevents your error pages from being accidentally
  // indexed by search engines.
  return (
    <Status code={404}>
      <h1>Page not found</h1>
      <p>Sorry, we could not find the page you were looking for</p>
    </Status>
  );
}
