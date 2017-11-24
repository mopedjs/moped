import * as webpack from 'webpack';
const FileSizeReporter = require('react-dev-utils/FileSizeReporter');

export const enum FileSizeInfo {}
export function measureFileSizesBeforeBuild(
  directory: string,
): Promise<FileSizeInfo> {
  return FileSizeReporter.measureFileSizesBeforeBuild(directory);
}

export function printFileSizesAfterBuild(
  stats: webpack.Stats,
  previousFileSizes: FileSizeInfo,
  directory: string,
  WARN_AFTER_BUNDLE_GZIP_SIZE: number,
  WARN_AFTER_CHUNK_GZIP_SIZE: number,
): void {
  FileSizeReporter.printFileSizesAfterBuild(
    stats,
    previousFileSizes,
    directory,
    WARN_AFTER_BUNDLE_GZIP_SIZE,
    WARN_AFTER_CHUNK_GZIP_SIZE,
  );
}
