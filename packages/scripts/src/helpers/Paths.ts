import {join} from 'path';
import {realpathSync} from 'fs';

const basedir = realpathSync(process.cwd());
export default {
  buildDirectory: join(basedir, 'build'),
  nodeModulesDirectory: join(basedir, 'node_modules'),
  sourceDirectory: join(basedir, 'src'),
  packageJSON: join(basedir, 'package.json'),
};

// fixed case
