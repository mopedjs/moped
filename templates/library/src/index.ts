export default function add(a: number, b: number): number {
  return a + b;
}

module.exports = add;
module.exports.default = add;
