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
  _key = 0;
  componentDidMount() {
    this._unsubscribe = this.props.subscribe(this._onUpdate);
  }
  _onUpdate = () => {
    const newState = this.props.getState();
    if (!this.state.open && newState.open) {
      // each time the dialog is re-opened, force all content to be discarded
      // re-created
      this._key++;
    }
    this.setState(newState);
  };
  componentWillUnmount() {
    this._unsubscribe();
  }
  render() {
    return this.props.render({
      animating: this.state.animating,
      open: this.state.open,
      children:
        this.state.open || this.state.animating ? (
          <React.Fragment key={this._key}>
            {this.state.children()}
          </React.Fragment>
        ) : null,
      onClose: this.state.onClose,
    });
  }
}
