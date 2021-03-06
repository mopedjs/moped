// This is a custom Jest transformer turning style imports into empty objects.
// http://facebook.github.io/jest/docs/tutorial-webpack.html

export function process(src: string, filename: string): string {
  return 'module.exports = {};';
}
export function getCacheKey(): string {
  // The output is always the same.
  return 'cssTransform';
}
