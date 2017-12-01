import * as React from 'react';
import {Location} from 'history';
import BaseSwitch from './BaseSwitch';

export interface Props {
  children?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  itemStyle?: React.CSSProperties;
  location?: Location;
  style?: React.CSSProperties;
}

interface AnimationProps {
  children: React.SFCElement<any> | null;
  className?: string;
  count: number;
  index: number;
  itemClassName?: string;
  itemStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}
interface AnimationState {
  animationEnded: boolean;
}

const transition = 'opacity .15s linear, transform .3s ease-out';
const totalDurationMs = 300;
class Animation extends React.Component<AnimationProps, AnimationState> {
  state: AnimationState = {animationEnded: true};
  private _previousElement: React.SFCElement<any> | null = null;
  private _previousIndex = -1;
  private _timer: NodeJS.Timer | null = null;
  componentWillReceiveProps(newProps: AnimationProps) {
    if (newProps.index !== this.props.index) {
      if (this._timer !== null) clearTimeout(this._timer);
      this._previousElement = this.props.children;
      this._previousIndex = this.props.index;
      this.setState({animationEnded: false});
      this._timer = setTimeout(() => {
        this.setState({animationEnded: true});
      }, totalDurationMs);
    }
  }
  _translate(to: 'start' | 'end') {
    return to === 'start' ? 'translate(-25%, 0)' : 'translate(25%, 0)';
  }

  _itemAt(index: number) {
    const baseStyle = this.props.itemStyle || {};
    if (index === this.props.index) {
      return (
        <div
          key={index}
          className={this.props.itemClassName}
          style={{
            ...baseStyle,
            opacity: 1,
            transform: 'translate(0, 0)',
            transition,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {this.props.children}
        </div>
      );
    }
    return (
      <div
        key={index}
        className={this.props.itemClassName}
        style={{
          ...baseStyle,
          opacity: 0,
          transform:
            this.props.index === -1
              ? 'translate(0, 0)'
              : this._translate(index < this.props.index ? 'start' : 'end'),
          transition,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,

          visibility:
            !this.state.animationEnded && index === this._previousIndex
              ? 'visible'
              : 'hidden',
        }}
      >
        {!this.state.animationEnded && index === this._previousIndex
          ? this._previousElement
          : null}
      </div>
    );
  }
  render() {
    const children = [];
    for (let i = 0; i < this.props.count; i++) {
      children.push(this._itemAt(i));
    }
    return (
      <div
        className={this.props.className}
        style={{
          ...(this.props.style || {}),
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    );
  }
}

/**
 * The public API for rendering the first <Route> that matches.
 */
export default class Switch extends React.Component<Props> {
  render() {
    return (
      <BaseSwitch
        location={this.props.location}
        render={(element, index, children) => (
          <Animation
            className={this.props.className}
            count={React.Children.count(children)}
            index={index}
            itemClassName={this.props.itemClassName}
            itemStyle={this.props.itemStyle}
            style={this.props.style}
          >
            {element}
          </Animation>
        )}
      >
        {this.props.children}
      </BaseSwitch>
    );
  }
}
