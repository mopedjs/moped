import * as React from 'react';
const {
  Broadcast: ReactBroadcast,
  Subscriber: ReactSubscriber,
} = require('react-broadcast');

export interface Pair<T> {
  Broadcast(props: { value: T }): JSX.Element;
  Subscriber(props: { children: (value: T) => React.ReactNode }): JSX.Element;
}
let nextIndex = 0;
export default function createBroadcast<T>(defaultValue: T): Pair<T> {
  const channel = 'react_broadcast_' + nextIndex++;
  function Broadcast(props: { value: T }) {
    return <ReactBroadcast {...props} channel={channel} />;
  }
  function Subscriber(props: { children: (value: T) => React.ReactNode }) {
    return <ReactSubscriber {...props} channel={channel} />;
  }
  return { Broadcast, Subscriber };
}

module.exports = createBroadcast;
module.exports.default = createBroadcast;
