// generated by ts-bicycle
// do not edit by hand

import Schema from 'bicycle/types/Schema';
import BicycleServer, {Options} from 'bicycle/server-core';

const schema: Schema<{}> = {};
export {Options};
export default class Server extends BicycleServer<{}> {
  constructor(options?: Options) {
    super(schema, options);
  }
}