import * as React from 'react';
import {query, BicycleClient} from 'react-bicycle';
import * as q from 'src/bicycle/query';
import LoginPage from './LoginPage';

export const ProfilePageQuery = q.User.id.name.privateStatus.publicStatus;

export interface ProfilePageProps {
  user: typeof ProfilePageQuery.$type;
  client: BicycleClient;
}
export function ProfilePage({user, client}: ProfilePageProps) {
  return (
    <React.Fragment>
      <button type="button" onClick={() => client.update(q.User.logout())}>
        Logout
      </button>
      <br />
      <label>
        Name
        <input
          type="text"
          value={user.name}
          onChange={e => {
            client.update(
              q.User.setName(e.target.value, (mutation, cache) => {
                cache
                  .getObject('User', `${user.id}`)
                  .set('name', mutation.args);
              }),
            );
          }}
        />
      </label>
      <p>Your name is visible to everyone</p>
      <label>
        Public Status
        <textarea
          value={user.publicStatus}
          onChange={e => {
            client.update(
              q.User.setPublicStatus(e.target.value, (mutation, cache) => {
                cache
                  .getObject('User', `${user.id}`)
                  .set('publicStatus', mutation.args);
              }),
            );
          }}
        />
      </label>
      <p>Your public status is visible to everyone</p>
      <label>
        Private Status
        <textarea
          value={user.privateStatus}
          onChange={e => {
            client.update(
              q.User.setPrivateStatus(e.target.value, (mutation, cache) => {
                cache
                  .getObject('User', `${user.id}`)
                  .set('privateStatus', mutation.args);
              }),
            );
          }}
        />
      </label>
      <p>Your private status is only visible to you</p>
    </React.Fragment>
  );
}

export default function ProfilePageWithLogin() {
  return query(q.Root.user(ProfilePageQuery), ({user}, client) => {
    if (!user) {
      return <LoginPage client={client} />;
    }
    return <ProfilePage user={user} client={client} />;
  });
}
