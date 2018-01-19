import * as React from 'react';
import ModalRenderProps, {ModalState} from './ModalRenderProps';

export interface ModalSubscriberProps {
  render: (props: ModalRenderProps) => React.ReactNode;
  getState: () => ModalState;
  subscribe: (fn: () => void) => () => void;
}
export default class ModalSubscriber extends React.Component<
  ModalSubscriberProps,
  ModalState
> {
  state = this.props.getState();
  _unsubscribe = () => {};
  componentDidMount() {
    this._unsubscribe = this.props.subscribe(this._onUpdate);
  }
  _onUpdate = () => {
    this.setState(this.props.getState());
  };
  componentWillUnmount() {
    this._unsubscribe();
  }
  render() {
    return this.props.render({
      animating: this.state.animating,
      open: this.state.open,
      children: this.state.children(),
      onClose: this.state.onClose,
    });
  }
}
