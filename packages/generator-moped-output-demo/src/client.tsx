import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {Provider as BicycleProvider} from 'react-bicycle';
import Loadable from 'react-loadable';
import BicycleClient from 'src/bicycle/client';
import App from './components/App';

const SERVER_SIDE_RENDERING = (window as any).SERVER_SIDE_RENDERING === true;

const bicycle = new BicycleClient();

// You can define some global optimistic updaters here:
// bicycle.defineOptimisticUpdaters(OptimisticUpdaters);

// You can debug the internal state by inspecting BICYCLE_CLIENT on the console
(window as any).BICYCLE_CLIENT = bicycle;

function render(AppComponent: typeof App) {
  return (
    <BicycleProvider client={bicycle}>
      <BrowserRouter>
        <AppComponent />
      </BrowserRouter>
    </BicycleProvider>
  );
}

// If you are not using server side rendering, you can delete
// the "if" condition here and just always do:
//
// ReactDOM.render(render(App), document.getElementById('root'));

if (SERVER_SIDE_RENDERING) {
  (window as any).main = async () => {
    await Loadable.preloadReady();
    ReactDOM.hydrate(render(App), document.getElementById('root'));
  };
} else {
  ReactDOM.render(render(App), document.getElementById('root'));
}

if ((module as any).hot) {
  (module as any).hot.accept('./components/App', () => {
    ReactDOM.render(
      render(require('./components/App').default),
      document.getElementById('root'),
    );
  });
}
