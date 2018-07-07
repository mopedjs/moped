import * as React from 'react';
import {Route} from 'react-router-dom';

export interface StatusCodeProps {
  code: number;
  children?: React.ReactNode;
}

export default function Status({children, code}: StatusCodeProps) {
  return (
    <Route
      render={({staticContext}) => {
        // there is no `staticContext` on the client, so
        // we need to guard against that here
        if (staticContext) {
          (staticContext as any).status = code;
          staticContext.statusCode = code;
        }
        return children;
      }}
    />
  );
}
module.exports = Status;
module.exports.default = Status;
