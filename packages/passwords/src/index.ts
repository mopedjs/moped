import assert = require('assert');
import generatePassword, {Encoding} from './generatePassword';
import PasswordCore from './core';
import lock from './lock';
import readOptions, {Options, NormalizedOptions} from './readOptions';
import PasswordData from './PasswordData';

export {generatePassword, Encoding, Options, PasswordData};

function getAdjustedNumberOfPasswordAttempts(
  value: {
    numberOfPasswordAttempts: number;
    timeStampOfLastReset: number;
  },
  rateLimitInterval: number,
) {
  return (
    Math.max(
      0,
      value.numberOfPasswordAttempts -
        Math.floor(
          (Date.now() - value.timeStampOfLastReset) / rateLimitInterval,
        ),
    ) + 1
  );
}

interface PasswordStoreBase<IdType extends string | number> {
  read(id: IdType): Promise<PasswordData | null | void>;
  create(id: IdType, data: PasswordData): Promise<IdType>;
  update(id: IdType, data: PasswordData): Promise<{} | void | null>;
}

export interface PasswordStoreProvidedID<IdType extends string | number> {
  read(id: IdType): Promise<PasswordData | null | void>;
  set(id: IdType, data: PasswordData): Promise<{} | void | null>;
}
export interface PasswordStoreAutoID<IdType extends string | number> {
  read(id: IdType): Promise<PasswordData | null | void>;
  create(data: PasswordData): Promise<IdType>;
  update(id: IdType, data: PasswordData): Promise<{} | void | null>;
}

class PasswordsBase<IdType extends string | number> {
  private store: PasswordStoreBase<IdType>;
  private options: NormalizedOptions;
  private pwd: PasswordCore;
  constructor(store: PasswordStoreBase<IdType>, options: Options) {
    this.store = store;
    this.options = readOptions(options);
    this.pwd = new PasswordCore(this.options);
  }
  write(id: IdType, password: string): Promise<IdType> {
    assert(
      typeof id === 'string' || typeof id === 'number',
      'expected id to be a string or number',
    );
    assert(
      typeof password === 'string' && password.length > 0,
      'expected password to be a non empty string',
    );
    return this.pwd
      .hash(password)
      .then(passwordHash =>
        this.store.create(id, {
          hash: passwordHash,
          numberOfPasswordAttempts: 0,
          timeStampOfLastReset: 0,
        }),
      )
      .then(id => {
        assert(
          typeof id === 'string' || typeof id === 'number',
          'expected id to be a string or number',
        );
        return id;
      });
  }
  verify(id: IdType, password: string): Promise<boolean> {
    assert(
      typeof id === 'string' || typeof id === 'number',
      'expected id to be a string or number',
    );
    assert(
      typeof password === 'string' && password.length > 0,
      'expected password to be a non empty string',
    );
    return lock(id, async () => {
      const data = await this.store.read(id);
      if (data == null) {
        throw new Error('Invalid password id');
      }
      const numberOfPasswordAttempts = getAdjustedNumberOfPasswordAttempts(
        data,
        this.options.fillRate,
      );
      await this.store.update(id, {
        hash: data.hash,
        numberOfPasswordAttempts,
        timeStampOfLastReset: Date.now(),
      });
      if (numberOfPasswordAttempts > this.options.bucketSize) {
        await new Promise(resolve =>
          setTimeout(
            resolve,
            this.options.fillRate *
              (numberOfPasswordAttempts - this.options.bucketSize),
          ),
        );
      }
      return await this.pwd.verify(password, data.hash, newHash =>
        this.store.update(id, {
          hash: newHash,
          numberOfPasswordAttempts,
          timeStampOfLastReset: Date.now(),
        }),
      );
    });
  }
}
export class PasswordsProvidedID<IdType extends string | number> {
  private base: PasswordsBase<IdType>;
  constructor(store: PasswordStoreProvidedID<IdType>, options: Options) {
    this.base = new PasswordsBase(
      {
        read: id => store.read(id),
        create: (id, data) => store.set(id, data).then(() => id),
        update: (id, data) => store.set(id, data),
      },
      options,
    );
  }
  write(id: IdType, password: string): Promise<IdType> {
    assert(arguments.length === 2, 'Expected 2 arguments to write password');
    return this.base.write(id, password);
  }
  verify(id: IdType, password: string): Promise<boolean> {
    assert(arguments.length === 2, 'Expected 2 arguments to verify password');
    return this.base.verify(id, password);
  }
  generatePassword(length: number, encoding?: Encoding) {
    return generatePassword(length, encoding);
  }
}
export class PasswordsAutoID<IdType extends string | number> {
  private base: PasswordsBase<IdType>;
  constructor(store: PasswordStoreAutoID<IdType>, options: Options) {
    this.base = new PasswordsBase(
      {
        read: id => store.read(id),
        create: (id, data) => store.create(data),
        update: (id, data) => store.update(id, data),
      },
      options,
    );
  }
  write(password: string): Promise<IdType> {
    assert(arguments.length === 1, 'Expected 1 argument to write password');
    return this.base.write(0 as any, password);
  }
  verify(id: IdType, password: string): Promise<boolean> {
    assert(arguments.length === 2, 'Expected 2 arguments to verify password');
    return this.base.verify(id, password);
  }
  generatePassword(length: number, encoding?: Encoding) {
    return generatePassword(length, encoding);
  }
}

function isProvidedID<IdType extends string | number>(
  store: Partial<PasswordStoreProvidedID<IdType>>,
): store is PasswordStoreProvidedID<IdType> {
  return !!store.set;
}
function isAutoID<IdType extends string | number>(
  store: Partial<PasswordStoreAutoID<IdType>>,
): store is PasswordStoreAutoID<IdType> {
  return !!(store.create && store.update);
}

function passwords<IdType extends string | number>(
  store: PasswordStoreProvidedID<IdType>,
  options: Options,
): PasswordsProvidedID<IdType>;
function passwords<IdType extends string | number>(
  store: PasswordStoreAutoID<IdType>,
  options: Options,
): PasswordsAutoID<IdType>;
function passwords<IdType extends string | number>(
  store: PasswordStoreProvidedID<IdType> | PasswordStoreAutoID<IdType>,
  options: Options = {},
): PasswordsProvidedID<IdType> | PasswordsAutoID<IdType> {
  if (!store || typeof store !== 'object') {
    throw new Error('Expected the store to be an object');
  }
  if (typeof store.read !== 'function' || store.read.length !== 1) {
    throw new Error(
      'Expected store.read to be a function that takes 1 argument',
    );
  }
  if (isProvidedID(store)) {
    Object.keys(store).forEach(key => {
      if (key !== 'read' && key !== 'set') {
        throw new Error('Unexpected key ' + key);
      }
    });
    if (typeof store.set !== 'function' || store.set.length !== 2) {
      throw new Error(
        'Expected store.set to be a function that takes 2 argument',
      );
    }
    return new PasswordsProvidedID(store, options);
  }
  if (isAutoID(store)) {
    Object.keys(store).forEach(key => {
      if (key !== 'read' && key !== 'create' && key !== 'update') {
        throw new Error('Unexpected key ' + key);
      }
    });
    if (typeof store.create !== 'function' || store.create.length !== 1) {
      throw new Error(
        'Expected store.create to be a function that takes 1 argument',
      );
    }
    if (typeof store.update !== 'function' || store.update.length !== 2) {
      throw new Error(
        'Expected store.update to be a function that takes 2 argument',
      );
    }
    return new PasswordsAutoID(store, options);
  }
  throw new Error(
    'Invalid store, expected either:\n' +
      '  {read(id: ID): Promise<Data>, create(data: Data): Promise<ID>, update(id: ID, data: Data): Promise<any>}' +
      '\nor\n' +
      '  {read(id: ID): Promise<Data>, set(id: ID, data: Data): Promise<any>}',
  );
}
export default passwords;

module.exports = passwords;
module.exports.default = passwords;
module.exports.PasswordsProvidedID = PasswordsProvidedID;
module.exports.PasswordsAutoID = PasswordsAutoID;
module.exports.generatePassword = generatePassword;
module.exports.Encoding = Encoding;
