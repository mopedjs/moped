import * as React from 'react';
import MyEnum from './MyEnum';

export default function App() {
  return (
    <div>
      <p>Hello World</p>
      <p>
        Enum Value: <strong>{MyEnum.Bar}</strong>
      </p>
    </div>
  );
}
