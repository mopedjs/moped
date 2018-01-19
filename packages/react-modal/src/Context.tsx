import createBroadcast from '@moped/react-broadcast';

export default interface Context {
  open: (children: () => React.ReactNode, onClose: () => any) => void;
  updateContent: (children: () => React.ReactNode) => void;
  close: () => void;
};

const {Broadcast, Subscriber} = createBroadcast<Context>({
  open: () => {},
  updateContent: () => {},
  close: () => {},
});

export {Broadcast, Subscriber};
