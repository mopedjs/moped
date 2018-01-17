# react-broadcast

An implementation of the new react context API: https://github.com/reactjs/rfcs/pull/2

## Installation

```
yarn add @moped/react-broadcast
```

## Usage

```ts
import createBroadcast from '@moped/react-broadcast';

const {Broadcast, Subscriber} = createBroadcast('black');

const ColoredLink = ({href, children}) => (
  <Subscriber
    children={color => (
      <a href={href} style={{color}}>
        {children}
      </a>
    )}
  />
);

<div>
  <Broadcast value="green">
    <ColoredLink href="/">Link A</ColoredLink>
    <ColoredLink href="/">Link B</ColoredLink>
    <ColoredLink href="/">Link C</ColoredLink>
  </Broadcast>
  <Broadcast value="red">
    <ColoredLink href="/">Link D</ColoredLink>
    <ColoredLink href="/">Link E</ColoredLink>
    <ColoredLink href="/">Link F</ColoredLink>
  </Broadcast>
  <ColoredLink href="/">Link G</ColoredLink>
  <ColoredLink href="/">Link H</ColoredLink>
  <ColoredLink href="/">Link I</ColoredLink>
</div>;
```

Links A, B and C will be green. Links D, E and F will be red. Since they are not inside a Broadcast, Links G H and I will take the default color of black.

## License

MIT
