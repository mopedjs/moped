import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import {BrowserRouter, Route, Link} from 'react-router-dom';
import Switch from 'react-router-animated-switch';
import ArticleA from './ArticleA';
import ArticleB from './ArticleB';
import ArticleC from './ArticleC';
import ArticleD from './ArticleD';

const App = styled.main`
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`;
const Footer = styled.nav`
  display: flex;
`;
const FooterLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  text-decoration: none;
  color: white;
  height: 5em;
  background: black;
  :not(:last-child) {
    border-right: 1px solid lightgray;
  }
`;
ReactDOM.render(
  <BrowserRouter>
    <App>
      <Switch
        style={{flexGrow: 1}}
        itemStyle={{overflow: 'scroll', padding: '1em'}}
      >
        <Route path="/" exact={true} component={ArticleA} />
        <Route path="/b" exact={true} component={ArticleB} />
        <Route path="/c" exact={true} component={ArticleC} />
        <Route path="/d" exact={true} component={ArticleD} />
      </Switch>
      <Footer>
        <FooterLink to="/">A</FooterLink>
        <FooterLink to="/b">B</FooterLink>
        <FooterLink to="/c">C</FooterLink>
        <FooterLink to="/d">D</FooterLink>
      </Footer>
    </App>
  </BrowserRouter>,
  document.getElementById('root'),
);
