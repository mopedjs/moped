import getModule from './worker-farm';
import buildEntryPointType, {
  BuildEntryPointConfig,
  BuildEntryPointResult,
} from './buildEntryPoint';

export {BuildEntryPointConfig, BuildEntryPointResult};
const buildEntryPointAsync: typeof buildEntryPointType = getModule(
  require.resolve('./buildEntryPoint'),
  ['default'],
  () => import('./buildEntryPoint'),
).default;

export default buildEntryPointAsync;
