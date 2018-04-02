import * as React from 'react';
import sentry from '@moped/sentry';
import styled from 'styled-components';

const ReportButton = styled.button`
  border: none;
  border-radius: 0;
  font: inherit;
  text-align: inherit;
  background: red;
  color: white;
  padding: 1em;
  margin: 0;
`;
const ErrorPane = styled.div`
  background: red;
  color: white;
  padding: 1em;
  margin: 0;
`;

interface State {
  error: null | Error;
  errorInfo: null | React.ErrorInfo;
}
/**
 * The error boundary component lets us catch all errors caused by rendering
 * further down the tree, and render a more meaningful error.
 */
export default class ErrorBoundary extends React.Component {
  state: State = {error: null, errorInfo: null};

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({error, errorInfo});
    sentry.captureException(error, {extra: errorInfo});
  }

  render() {
    if (this.state.error) {
      //render fallback UI
      if (sentry.enabled) {
        // If sentry is enabled, we can offer the option of reporting
        // the error with more info. We can also reasure the user that
        // the error has already been recorded.
        return (
          <ReportButton
            type="button"
            onClick={() => sentry.showReportDialog && sentry.showReportDialog()}
          >
            <p>We're sorry — something's gone wrong.</p>
            <p>Our team has been notified, but click here fill out a report.</p>
            <p>
              You could try refreshing the page, which may fix this problem.
            </p>
          </ReportButton>
        );
      } else if (process.env.NODE_ENV === 'development') {
        return (
          <ErrorPane>
            <pre>
              {this.state.errorInfo
                ? this.state.errorInfo.componentStack + '\n\n'
                : ''}
              {this.state.error.stack ||
                this.state.error.message ||
                this.state.error}
            </pre>
          </ErrorPane>
        );
      } else {
        // Without sentry (or some other alternative) we won't get notified of
        // the error, but it is still important to at least give a suggestion
        // for something that might fix the problem.
        return (
          <ErrorPane>
            <p>We're sorry — something's gone wrong.</p>
            <p>
              You could try refreshing the page, which may fix this problem.
            </p>
          </ErrorPane>
        );
      }
    }
    //when there's not an error, render children untouched
    return this.props.children;
  }
}
