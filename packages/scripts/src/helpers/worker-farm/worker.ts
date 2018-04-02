const modules: any = {};

module.exports = function(
  moduleName: string,
  methodName: string,
  args: any[],
  callback: (err: any, result?: any) => void,
) {
  const m = modules[moduleName] || (modules[moduleName] = require(moduleName));
  Promise.resolve(m[methodName](...args)).then(
    result => callback(null, result),
    err => callback(err),
  );
};
