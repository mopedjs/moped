import * as React from 'react';
import {query} from 'react-bicycle';
import * as q from 'src/bicycle/query';

const RootQuery = q.Root.users(q.User.id.name.publicStatus);

export default function Home() {
  return query(RootQuery, ({users}) => (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          <strong>{user.name}</strong> - {user.publicStatus}
        </li>
      ))}
    </ul>
  ));
}
