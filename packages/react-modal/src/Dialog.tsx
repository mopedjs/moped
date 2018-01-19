import * as React from 'react';

const Dialog: React.ComponentType<
  React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDialogElement>,
    HTMLDialogElement
  > & {open?: boolean}
> = 'dialog' as any;

export default Dialog;
