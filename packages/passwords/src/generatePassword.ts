import assert = require('assert');
import {randomBytes} from 'crypto';
const base32 = require('base32');

export enum Encoding {
  base64 = 'base64',
  base32 = 'base32',
  hex = 'hex',
  decimal = 'decimal',
}

export default function generatePassword(
  length: number,
  encoding: Encoding = Encoding.base64,
): Promise<string> {
  function withPrefix(prefix: string): Promise<string> {
    return new Promise<Buffer>((resolve, reject) => {
      randomBytes(length, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    })
      .then((buffer): string => {
        switch (encoding) {
          case Encoding.base64:
            return buffer.toString('base64');
          case Encoding.base32:
            return base32.encode(buffer);
          case Encoding.hex:
            return buffer.toString('hex');
          case Encoding.decimal:
            return buffer.toString('hex').replace(/[^0-9]/g, '');
        }
      })
      .then(str => {
        assert(typeof str === 'string');
        const result = prefix + str;
        if (result.length < length) {
          return withPrefix(result);
        } else {
          return result.substr(0, length);
        }
      });
  }
  return withPrefix('').then(result => {
    assert(result.length === length);
    return result;
  });
}
