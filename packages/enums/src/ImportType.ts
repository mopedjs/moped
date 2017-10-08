const enum ImportType {
  /**
   * An external library can be available as a global variable. The consumer can achieve this
   * by including the external library in a script tag.
   */
  Global = 'global',
  /**
   * The consumer application may be using a CommonJS module system and hence the external
   * library should be available as a CommonJS module
   */
  CommonJS = 'commonjs',
  /**
   * Similar to the above line but where the export is module.exports.default.
   */
  CommonJS2 = 'commonjs2',
  /**
   * Similar to the above line but using AMD module system.
   */
  // We don't support AMD
  // AMD = 'amd',
}
export default ImportType;
