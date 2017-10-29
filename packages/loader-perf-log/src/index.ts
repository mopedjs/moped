import * as webpack from 'webpack';

const loader: webpack.loader.Loader = function logLoader(content) {
  let name = '';
  if (typeof this.query === 'string') {
    name = this.query.substr(1) + ': ';
  }
  if (this.query && typeof this.query === 'object') {
    name = this.query.name + ': ';
  }
  const duration = Date.now() - this.data.start;
  console.log(name + this.resource + ' ' + require('ms')(duration));
  return content;
};
loader.pitch = function(remainingRequest, precedingRequest, data) {
  data.start = Date.now();
};

export default loader;
export const pitch = loader.pitch;

module.exports = loader;
module.exports.default = loader;
module.exports.pitch = pitch;
