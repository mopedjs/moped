import * as React from 'react';
import {Switch, Route, Link} from 'react-router-dom';
import styled from 'styled-components';
import loadable from 'react-loadable';
import ErrorBoundary from './ErrorBoundary';

const Home = loadable({
  loading: () => null,
  loader: () => import('./Home'),
});
const ProfilePage = loadable({
  loading: () => null,
  loader: () => import('./ProfilePage'),
});
const PageNotFound = loadable({
  loading: () => null,
  loader: () => import('./PageNotFound'),
});

const Nav = styled.nav`
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  background: darkblue;
`;
const NavLink = styled(Link)`
  display: inline-block;
  text-decoration: none;
  padding: 1em;
  color: white;
`;
const NavContainer = styled.div`
  padding-top: 50px;
`;

export default function App() {
  return (
    <NavContainer>
      <Nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/profile">Profile</NavLink>
      </Nav>
      <ErrorBoundary>
        <Switch>
          <Route path="/" exact component={Home} />
          <Route path="/profile" exact component={ProfilePage} />
          <Route component={PageNotFound} />
        </Switch>
      </ErrorBoundary>
    </NavContainer>
  );
}
