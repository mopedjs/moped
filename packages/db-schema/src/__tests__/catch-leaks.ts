const errors: Error[] = [];

const then = Promise.prototype.then;
Promise.prototype.then = function(...args: any[]) {
  const result = then.call(this, ...args);
  const e = new Error('Then Call Timeout');
  errors.push(e);
  result.then(
    () => {
      errors.splice(errors.indexOf(e), 1);
    },
    () => {
      errors.splice(errors.indexOf(e), 1);
    },
  );
  return result;
};

export default errors;
