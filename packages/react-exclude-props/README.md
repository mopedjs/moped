# react-exclude-props

Extend a component with extra properties in a way that typescript can understand. These extra properties are not actually passed down, so don't trigger warnings, but can be used in `styled-components` to modify the element's style.

## Usage

```tsx
import excludeProps from 'react-exclude-props';

const Button = excludeProps('button', p => ({active: p<boolean>()}));
const StyledButton = styled(Button)`
  color: ${props => props.active ? 'green' : 'black'};
`;

export default StyledButton;
```