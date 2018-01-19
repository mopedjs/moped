import * as React from 'react';
import Context, {Subscriber} from './Context';

export interface ModalDialogProps {
  children: () => React.ReactNode;
  onClose: () => any;
}
export default function ModalDialog(props: ModalDialogProps) {
  return (
    <Subscriber>
      {api => (
        <ModalDialogInner api={api} onClose={props.onClose}>
          {props.children}
        </ModalDialogInner>
      )}
    </Subscriber>
  );
}

interface ModalDialogInnerProps extends ModalDialogProps {
  api: Context;
}

class ModalDialogInner extends React.Component<ModalDialogInnerProps> {
  componentDidMount() {
    this.props.api.open(this._children, this._onClose);
  }
  componentWillReceiveProps(newProps: ModalDialogInnerProps) {
    this.props.api.updateContent(this._children);
  }
  componentWillUnmount() {
    this.props.api.close();
  }
  _children = () => this.props.children();
  _onClose = () => this.props.onClose();
  render() {
    return null;
  }
}
