import bytes = require('bytes');
const securePassword = require('secure-password');

const opslimitMin = Math.max(securePassword.OPSLIMIT_DEFAULT, 20);
const memlimitMin = Math.max(securePassword.MEMLIMIT_DEFAULT, bytes('50MB'));
const opslimit = parseInt(process.env.PASSWORD_OPS_LIMIT || '20', 10);
const memlimit = bytes(process.env.PASSWORD_MEM_LIMIT || '50MB');

if (
  opslimit < opslimitMin ||
  Number.isNaN(opslimitMin) ||
  Number.isNaN(opslimit) ||
  typeof opslimit !== 'number' ||
  typeof opslimitMin !== 'number'
) {
  throw new Error('Invalid PASSWORD_OPS_LIMIT');
}
if (
  memlimit < memlimitMin ||
  Number.isNaN(memlimitMin) ||
  Number.isNaN(memlimit) ||
  typeof memlimit !== 'number' ||
  typeof memlimitMin !== 'number'
) {
  throw new Error('Invalid PASSWORD_MEM_LIMIT');
}

export default class PasswordCore {
  private pwd: any;
  constructor(options: {opslimit: number; memlimit: number}) {
    const pwd = securePassword({
      opslimit: options.opslimit,
      memlimit: options.memlimit,
    });
    this.pwd = pwd;
    if (process.env.NODE_ENV === 'production') {
      this.hash('test password', {isStartup: true}).catch(ex => {
        setTimeout(() => {
          throw ex;
        }, 0);
      });
    }
  }
  hash(password: string, options?: {isStartup: boolean}): Promise<string> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      this.pwd.hash(
        Buffer.from(password, 'utf8'),
        (err: Error | null, passwordHash: Buffer) => {
          if (process.env.NODE_ENV === 'production') {
            const end = Date.now();
            if (options && options.isStartup && end - start < 600) {
              throw new Error(
                'Password hashing should be taking at least 1 second, it is currently taking under 600ms.  ' +
                  'To fix this, try updating the PASSWORD_OPS_LIMIT and PASSWORD_MEM_LIMIT environment variables.',
              );
            }
            if (end - start < 1000) {
              console.warn(
                'Password hashing should be taking at least 1 second',
              );
            }
            if (end - start < 200) {
              throw new Error(
                'Password hashing should be taking at least 1 second, it is currently taking under 200ms.  ' +
                  'To fix this, try updating the PASSWORD_OPS_LIMIT and PASSWORD_MEM_LIMIT environment variables.',
              );
            }
          }
          if (err) reject(err);
          else resolve(passwordHash.toString('base64'));
        },
      );
    });
  }
  verify(
    password: string,
    passwordHash: string,
    onUpdate: (passwordHash: string) => Promise<{} | void | null>,
  ): Promise<boolean> {
    return new Promise<number>((resolve, reject) => {
      this.pwd.verify(
        Buffer.from(password),
        new Buffer(passwordHash, 'base64'),
        (err: Error | null, result: number) => {
          if (err) reject(err);
          else resolve(result);
        },
      );
    }).then(result => {
      if (result === securePassword.VALID_NEEDS_REHASH) {
        return this.hash(password)
          .then(onUpdate)
          .then(
            () =>
              result === securePassword.VALID ||
              result === securePassword.VALID_NEEDS_REHASH,
          );
      }
      return (
        result === securePassword.VALID ||
        result === securePassword.VALID_NEEDS_REHASH
      );
    });
  }
}
