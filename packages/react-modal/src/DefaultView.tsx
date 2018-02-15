import * as React from 'react';
import ModalRenderProps from './ModalRenderProps';

export default function ModalDialogView(props: ModalRenderProps) {
  return (
    <div
      style={{
        opacity: props.open ? 1 : 0,
        visibility: props.open || props.animating ? 'visible' : 'hidden',
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1050,
        background: 'hsla(0, 0%, 0%, 0.5)',
        transition: 'opacity 0.15s linear',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={props.onClose}
    >
      <dialog
        open={props.open}
        style={{
          transform: props.open ? 'translate(0,0)' : 'translate(0,-100vh)',
          display: 'block',
          position: 'relative',
          flexShrink: 0,
          margin: '1em 25vw',
          color: 'inherit',
          border: '1px solid black',
          borderRadius: '0.25em',
          padding: '1em',
          background: 'white',

          height: 'auto',
          width: 'auto',
          transition: 'transform 0.3s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {props.children}
      </dialog>
    </div>
  );
}
