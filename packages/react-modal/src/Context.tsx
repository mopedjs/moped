import * as React from 'react';
import createBroadcast from '@moped/react-broadcast';

export default interface Context {
  open: (children: () => React.ReactNode, onClose: () => any) => void;
  updateContent: (children: () => React.ReactNode) => void;
  close: () => void;
};

const pair = createBroadcast<Context>({
  open: () => {},
  updateContent: () => {},
  close: () => {},
});
export const Broadcast = pair.Broadcast;
export const Subscriber = pair.Subscriber;
