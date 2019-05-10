import * as React from 'react';

export default interface Context {
  open: (children: () => React.ReactNode, onClose: () => any) => void;
  updateContent: (children: () => React.ReactNode) => void;
  close: () => void;
}

const pair = React.createContext<Context>({
  open: () => {},
  updateContent: () => {},
  close: () => {},
});
export const Broadcast = pair.Provider;
export const Subscriber = pair.Consumer;
