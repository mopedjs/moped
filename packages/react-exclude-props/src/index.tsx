import * as React from 'react';

export declare class Prop<Value> {
  private value: Value;
}
export interface AnyObject {
  [key: string]: any;
}
export type GetStyleProps<StyleProps> = (
  defineProp: <FieldValue>() => Prop<FieldValue>,
) => {[PropName in keyof StyleProps]: Prop<StyleProps[PropName]>};

function excludeProps<
  StyleProps extends AnyObject,
  ElementName extends keyof JSX.IntrinsicElements
>(
  Component: ElementName,
  getStyleProps: GetStyleProps<StyleProps>,
): React.StatelessComponent<JSX.IntrinsicElements[ElementName] & StyleProps>;
function excludeProps<StyleProps extends AnyObject, ComponentProps>(
  Component: React.ComponentType<ComponentProps>,
  getStyleProps: GetStyleProps<StyleProps>,
): React.StatelessComponent<ComponentProps & StyleProps>;
function excludeProps<StyleProps extends AnyObject, ComponentProps>(
  Component: React.ComponentType<ComponentProps>,
  getStyleProps: GetStyleProps<StyleProps>,
): React.StatelessComponent<ComponentProps & StyleProps> {
  const exculded: {[name: string]: boolean} = getStyleProps(
    () => true as any,
  ) as any;
  return (props: ComponentProps & StyleProps): JSX.Element => {
    const limitedProps: any = {};
    Object.keys(props).forEach(key => {
      if (exculded[key] !== true) {
        limitedProps[key] = props[key];
      }
    });
    return <Component {...limitedProps} />;
  };
}
export default excludeProps;
