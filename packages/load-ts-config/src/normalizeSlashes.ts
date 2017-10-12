/**
 * Replace backslashes with forward slashes.
 */
export default function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}
