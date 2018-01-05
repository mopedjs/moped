import BabelRC from './BabelRC';
import env from './env';

// The following two plugins are currently necessary to make React warnings
// include more valuable information. They are included here because they are
// currently not enabled in babel-preset-react. See the below threads for more info:
// https://github.com/babel/babel/issues/4702
// https://github.com/babel/babel/pull/3540#issuecomment-228673661
// https://github.com/facebookincubator/create-react-app/issues/989
const DevelopmentHelpers: BabelRC = [
  // Adds component stack to warning messages
  require.resolve('babel-plugin-transform-react-jsx-source'),
  // Adds __self attribute to JSX which React will use for some warnings
  require.resolve('babel-plugin-transform-react-jsx-self'),
];

const plugins: BabelRC = [
  // class { handleClick = () => { } }
  require.resolve('babel-plugin-transform-class-properties'),
  // The following two plugins use Object.assign directly, instead of Babel's
  // extends helper. Note that this assumes `Object.assign` is available.
  // { ...todo, completed: true }
  [
    require.resolve('babel-plugin-transform-object-rest-spread'),
    {
      useBuiltIns: true,
    },
  ],
  // Transforms JSX
  [
    require.resolve('babel-plugin-transform-react-jsx'),
    {
      useBuiltIns: true,
    },
  ],
  // Polyfills the runtime needed for async/await and generators
  [
    require.resolve('babel-plugin-transform-runtime'),
    {
      helpers: false,
      polyfill: false,
      regenerator: true,
    },
  ],
  [
    require.resolve('babel-plugin-styled-components'),
    {
      displayName: process.env.NODE_ENV !== 'production',
      // This option is unstable, but it gives an awesome performance boost. Lets live on the edge!
      preprocess: true,
      ssr: true,
    },
  ],
  require.resolve('react-loadable/babel'),
];

export default plugins.concat(env !== 'production' ? DevelopmentHelpers : []);
