import * as React from 'react';
import * as PropTypes from 'prop-types';
import warning = require('warning');
import invariant = require('invariant');
import {matchPath, RouterChildContext, match} from 'react-router';
import {Location} from 'history';

export interface Props {
  children?: React.ReactNode;
  location?: Location;
  render?: (
    child: React.SFCElement<{
      location: Location;
      computedMatch: match<any>;
    }> | null,
    index: number,
    children?: React.ReactNode,
  ) => React.ReactNode;
}

/**
 * The public API for rendering the first <Route> that matches.
 */
class Switch extends React.Component<Props> {
  static contextTypes = {
    router: PropTypes.shape({
      route: PropTypes.object.isRequired,
    }).isRequired,
  };

  static propTypes = {
    children: PropTypes.node,
    location: PropTypes.object,
  };

  // prettier-ignore
  context!: RouterChildContext<any>;

  componentWillMount() {
    invariant(
      this.context.router,
      'You should not use <Switch> outside a <Router>',
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    warning(
      !(nextProps.location && !this.props.location),
      '<Switch> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.',
    );

    warning(
      !(!nextProps.location && this.props.location),
      '<Switch> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.',
    );
  }

  render() {
    const {route} = this.context.router;
    const {children, render} = this.props;
    const location = this.props.location || route.location;

    let match: match<{}> | null = null,
      child,
      index = -1;
    React.Children.forEach(children, (element, i) => {
      if (match == null && React.isValidElement(element)) {
        const {
          path: pathProp,
          exact,
          strict,
          sensitive,
          from,
        } = element.props as any;
        const path = pathProp || from;

        child = element;
        match = path
          ? matchPath(location.pathname, {
              path,
              exact,
              strict,
              sensitive,
            } as any)
          : route.match;
        if (match) {
          index = i;
        }
      }
    });

    const result = match
      ? React.cloneElement(child as any, {
          location,
          computedMatch: match as match<any>,
        })
      : null;
    return render ? render(result, index, this.props.children) : result;
  }
}

export default Switch;
