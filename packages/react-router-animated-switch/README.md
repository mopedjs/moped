# react-router-animated-switch

This module is an alternative to the react-router `<Switch>` component. The
behaviour is identical, except that it includes a super slick animation to
transition between pages.

It adds two divs. An outer one, that wrapps all the pages, and an inner one for
each page. You can style them via `style/className` and
`itemStyle/itemClassName` respectively.

## Installation

```
yarn add react-router-animated-switch
```

## Usage

[Code](https://github.com/mopedjs/moped/tree/master/packages/react-router-animated-switch-demo)
/ [Demo](http://adoring-austin-f8272b.netlify.com/)

```js
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import {BrowserRouter, Route, Link} from 'react-router-dom';
import Switch from '@moped/react-router-animated-switch';
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

const container = document.createElement('div');
document.body.appendChild(container);
ReactDOM.render(
  <BrowserRouter>
    <App>
      <Switch style={{flexGrow: 1}} itemStyle={{overflow: 'scroll'}}>
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
  container,
);
```

## Licence

MIT
