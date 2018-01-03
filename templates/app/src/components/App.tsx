import * as React from 'react';
import {Switch, Route, Link} from 'react-router-dom';
import Home from './Home';
import ProfilePage from './ProfilePage';

export default function App() {
  return (
    <React.Fragment>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/profile">Profile</Link>
      </nav>
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/profile" exact component={ProfilePage} />
      </Switch>
    </React.Fragment>
  );
}
