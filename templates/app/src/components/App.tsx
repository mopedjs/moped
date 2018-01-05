import * as React from 'react';
import {Switch, Route, Link} from 'react-router-dom';
import styled from 'styled-components';
import Home from './Home';
import ProfilePage from './ProfilePage';

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
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/profile" exact component={ProfilePage} />
      </Switch>
    </NavContainer>
  );
}
