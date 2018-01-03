import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {Provider as BicycleProvider} from 'react-bicycle';
import BicycleClient from 'src/bicycle/client';
import App from './components/App';

const bicycle = new BicycleClient();

// You can define some global optimistic updaters here:
// bicycle.defineOptimisticUpdaters(OptimisticUpdaters);

// You can debug the internal state by inspecting BICYCLE_CLIENT on the console
(window as any).BICYCLE_CLIENT = bicycle;

ReactDOM.render(
  <BicycleProvider client={bicycle}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </BicycleProvider>,
  document.getElementById('root'),
);
