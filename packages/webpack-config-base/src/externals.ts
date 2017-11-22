import * as webpack from 'webpack';

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as any).then === 'function'
  );
}

export enum ExternalMode {
  /**
   * An external library can be available as a global variable.
   * The consumer can achieve this by including the external
   * library in a script tag. This is the default setting for
   * externals.
   */
  root = 'root',
  /**
   * The consumer application may be using a CommonJS module system
   * and hence the external library should be available as a CommonJS
   * module.
   */
  commonjs = 'commonjs',
  /**
   * Similar to commonjs but where the export is module.exports.default.
   */
  commonjs2 = 'commonjs2',
  /**
   * Similar to commonjs but using AMD module system.
   */
  amd = 'amd',
}

export type ExternalsElement =
  | ExternalsObjectElement
  | ExternalsFunctionElement;

export interface ExternalsObjectElement {
  [name: string]: {mode: ExternalMode; name: string};
}
export type ExternalsFunctionElement = (
  /**
   * The directory name of the requesting module
   */
  context: string,
  /**
   * The string passed to `require`, before it has been resolved
   */
  request: string,
) =>
  | void
  | null
  | {mode: ExternalMode; name: string}
  | Promise<void | null | {mode: ExternalMode; name: string}>;

function buildExternals(externals: ExternalsElement): webpack.ExternalsElement;
function buildExternals(
  externals: ExternalsElement[],
): webpack.ExternalsElement[];
function buildExternals(
  externals: ExternalsElement | ExternalsElement[],
): webpack.ExternalsElement | webpack.ExternalsElement[];
function buildExternals(
  externals: ExternalsElement | ExternalsElement[],
): webpack.ExternalsElement | webpack.ExternalsElement[] {
  if (Array.isArray(externals)) {
    return externals.map(element => buildExternals(element));
  }
  if (typeof externals === 'function') {
    return (context, request, callback) => {
      const result = externals(context, request);
      if (isPromise(result)) {
        result.then(
          value => {
            if (value == null) {
              callback(undefined, undefined);
            } else {
              callback(undefined, value.mode + ' ' + value.name);
            }
          },
          err => {
            callback(err, undefined);
          },
        );
      } else if (result == null) {
        callback(undefined, undefined);
      } else {
        callback(undefined, result.mode + ' ' + result.name);
      }
    };
  }
  const result: {[key: string]: string} = {};
  Object.keys(externals).forEach(key => {
    result[key] = externals[key].mode + ' ' + externals[key].name;
  });
  return result;
}
export default buildExternals;
