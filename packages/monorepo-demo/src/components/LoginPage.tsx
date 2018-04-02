import * as React from 'react';
import {BicycleClient} from 'react-bicycle';
import Passwordless from '@authentication/react-passwordless';
import * as q from 'src/bicycle/query';

export interface LoginPageProps {
  client: BicycleClient;
}
export default class LoginPage extends React.Component<LoginPageProps> {
  render() {
    return (
      <Passwordless
        createToken={email =>
          this.props.client.update(
            q.User.createPasswordlessToken({
              email,
              state: {redirectURL: location.href},
            }),
          )
        }
        verifyPassCode={passCode =>
          this.props.client.update(q.User.verifyPasswordlessToken(passCode))
        }
        onPassCodeVerified={() => {
          // we don't need to do anything because the bicycle query in App will
          // automatically update to hide this form once the verifyPasswordlessToken
          // mutation returns
        }}
      />
    );
  }
}
