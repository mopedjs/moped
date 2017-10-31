import assert = require('assert');
import bytes = require('bytes');
import ms = require('ms');
const securePassword = require('secure-password');

assert(
  typeof securePassword.OPSLIMIT_DEFAULT === 'number' &&
    !Number.isNaN(securePassword.OPSLIMIT_DEFAULT),
);
assert(
  typeof securePassword.MEMLIMIT_DEFAULT === 'number' &&
    !Number.isNaN(securePassword.MEMLIMIT_DEFAULT),
);

const opslimitMin = Math.max(securePassword.OPSLIMIT_DEFAULT, 20);
const memlimitMin = Math.max(securePassword.MEMLIMIT_DEFAULT, bytes('50MB'));

export interface Options {
  /**
   * The operations limit value passed to secure-password
   */
  opsLimit?: number;
  /**
   * The memory limit value (in bytes) passed to secure-password.
   * You can also use a string as handled by the `bytes` npm package
   */
  memLimit?: number | string;
  /**
   * The number of password attempts (including successful attempts)
   * before rate limiting begins
   */
  bucketSize?: number;
  /**
   * The time between attempts once rate limiting has started (in milliseconds)
   */
  fillRate?: number | string;
}
export interface NormalizedOptions {
  opslimit: number;
  memlimit: number;
  bucketSize: number;
  fillRate: number;
}
export default function readOptions(options: Options = {}): NormalizedOptions {
  Object.keys(options).forEach(key => {
    if (
      key !== 'opsLimit' &&
      key !== 'memLimit' &&
      key !== 'bucketSize' &&
      key !== 'fillRate'
    ) {
      throw new Error('Unrecognized option: ' + key);
    }
  });
  assert(
    typeof options.opsLimit === 'number' ||
      typeof options.opsLimit === 'undefined',
    'opsLimit must be a number, if provided',
  );
  assert(
    typeof options.memLimit === 'number' ||
      typeof options.memLimit === 'string' ||
      typeof options.memLimit === 'undefined',
    'memLimit must be a number, or string as accepted by bytes, if provided',
  );
  assert(
    typeof options.bucketSize === 'number' ||
      typeof options.bucketSize === 'undefined',
    'bucketSize must be a number, if provided',
  );
  assert(
    typeof options.fillRate === 'number' ||
      typeof options.fillRate === 'string' ||
      typeof options.fillRate === 'undefined',
    'fillRate must be a number, or string as accepted by ms, if provided',
  );

  const opslimit =
    options.opsLimit !== undefined
      ? options.opsLimit
      : parseInt(process.env.PASSWORD_OPS_LIMIT || '30', 10);

  const memlimit =
    options.memLimit !== undefined
      ? typeof options.memLimit === 'string'
        ? bytes(options.memLimit)
        : options.memLimit
      : bytes(process.env.PASSWORD_MEM_LIMIT || '80MB');

  const bucketSize =
    options.bucketSize !== undefined
      ? options.bucketSize
      : parseInt(process.env.PASSWORD_BUCKET_SIZE || '10', 10);
  const fillRate =
    options.fillRate !== undefined
      ? typeof options.fillRate === 'string'
        ? ms(options.fillRate)
        : options.fillRate
      : ms(process.env.PASSWORD_FILL_RATE || '20 seconds');

  if (
    opslimit < opslimitMin ||
    Number.isNaN(opslimitMin) ||
    Number.isNaN(opslimit) ||
    typeof opslimit !== 'number' ||
    typeof opslimitMin !== 'number' ||
    opslimit !== (opslimit | 0) ||
    opslimitMin !== (opslimitMin | 0)
  ) {
    throw new Error(
      'Invalid PASSWORD_OPS_LIMIT, must be a number and at least ' +
        opslimitMin,
    );
  }

  if (
    memlimit < memlimitMin ||
    Number.isNaN(memlimitMin) ||
    Number.isNaN(memlimit) ||
    typeof memlimit !== 'number' ||
    typeof memlimitMin !== 'number' ||
    memlimit !== (memlimit | 0) ||
    memlimitMin !== (memlimitMin | 0)
  ) {
    throw new Error(
      'Invalid PASSWORD_MEM_LIMIT, must be a number and at least ' +
        bytes(memlimitMin),
    );
  }

  if (
    typeof bucketSize !== 'number' ||
    Number.isNaN(bucketSize) ||
    bucketSize !== (bucketSize | 0)
  ) {
    throw new Error('Invalid bucket size, must be an integer');
  }
  if (bucketSize < 2 || bucketSize > 30) {
    throw new Error('Invalid bucket size, must be between 2 and 30');
  }

  if (
    typeof fillRate !== 'number' ||
    Number.isNaN(fillRate) ||
    fillRate !== (fillRate | 0)
  ) {
    throw new Error('Invalid fill rate, must be an integer');
  }
  if (fillRate < 5000 || fillRate > ms('1 hour')) {
    throw new Error('Invalid fill rate, must be between 5 seconds and 1 hour');
  }

  return {
    opslimit,
    memlimit,
    bucketSize,
    fillRate,
  };
}
