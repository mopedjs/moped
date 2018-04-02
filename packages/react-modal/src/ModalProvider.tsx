import * as React from 'react';
import DefaultView from './DefaultView';
import ModalRenderProps, {ModalState} from './ModalRenderProps';
import Context, {Broadcast} from './Context';
import ModalSubscriber from './ModalSubscriber';

const DEFAULT_STATE: ModalState = {
  animating: false,
  open: false,
  children: () => null,
  onClose: () => {},
};

export {ModalRenderProps};
export interface ModalProviderProps {
  animationDuration?: number;
  children: React.ReactNode;
  renderModal?: (props: ModalRenderProps) => React.ReactNode;
}
export default class ModalProvider extends React.Component<ModalProviderProps> {
  _handlers: (() => void)[] = [];
  _st: ModalState = DEFAULT_STATE;
  _update(st: ModalState) {
    this._st = st;
    this._handlers.forEach(handler => handler());
  }
  _getState = () => this._st;
  _subscribe = (fn: () => void) => {
    this._handlers.push(fn);
    return () => {
      const i = this._handlers.indexOf(fn);
      if (i !== -1) {
        this._handlers.splice(i, 1);
      }
    };
  };
  _animationEndTimeout: NodeJS.Timer | undefined;
  _api: Context = {
    open: (children: () => React.ReactNode, onClose: () => any) => {
      if (this._animationEndTimeout !== undefined) {
        clearTimeout(this._animationEndTimeout);
      }
      this._update({
        animating: true,
        open: true,
        children,
        onClose,
      });
      this._animationEndTimeout = setTimeout(() => {
        this._update({...this._st, animating: false});
      }, this.props.animationDuration || 300);
    },
    updateContent: (children: () => React.ReactNode) => {
      this._update({...this._st, children});
    },
    close: () => {
      if (this._animationEndTimeout !== undefined) {
        clearTimeout(this._animationEndTimeout);
      }
      this._update({
        ...this._st,
        animating: true,
        open: false,
      });
      this._animationEndTimeout = setTimeout(() => {
        this._update({...this._st, animating: false});
      }, this.props.animationDuration || 300);
    },
  };
  render() {
    return (
      <Broadcast value={this._api}>
        <React.Fragment>
          {this.props.children}
          <ModalSubscriber
            getState={this._getState}
            render={this.props.renderModal || DefaultView}
            subscribe={this._subscribe}
          />
        </React.Fragment>
      </Broadcast>
    );
  }
}
