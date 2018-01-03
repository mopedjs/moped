import * as React from 'react';
import {query} from 'react-bicycle';
import * as q from 'src/bicycle/query';

export const ProfilePageQuery = q.User.id.name.privateStatus.publicStatus;

export default function Home() {
  return query(q.Root.users(q.User.id.name.publicStatus), ({users}) => (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          <strong>{user.name}</strong> - {user.publicStatus}
        </li>
      ))}
    </ul>
  ));
}
