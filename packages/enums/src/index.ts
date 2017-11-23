import Environment from './Environment';
import ImportType from './ImportType';
import Platform from './Platform';

export function getEnvironment(environment: void | Environment) {
  if (environment === undefined || environment === null) {
    if (process.env.NODE_ENV === 'development') {
      return Environment.Development;
    }
    if (process.env.NODE_ENV === 'production') {
      return Environment.Production;
    }
    if (process.env.NODE_ENV === 'test') {
      return Environment.Test;
    }
    if (!process.env.NODE_ENV) {
      throw new Error(
        'You need to either pass in an "environment", or set the environment variable, "NODE_ENV" to "development", "production" or "test"',
      );
    }
    throw new Error(
      'The enrivonment variable, "NODE_ENV" must be "development", "production" or "test", but was set to "' +
        process.env.NODE_ENV +
        '"',
    );
  }
  if (
    environment === Environment.Development ||
    environment === Environment.Production ||
    environment === Environment.Test
  ) {
    return environment;
  }
  throw new Error(
    'enrivonment must be "development", "production" or "test", but was set to "' +
      environment +
      '"',
  );
}

export function getPlatform(
  platform: void | Platform,
  defaultPlatform?: Platform,
): Platform {
  if (platform === Platform.Client || platform === Platform.Server) {
    return platform;
  }
  if (platform === undefined && defaultPlatform !== undefined) {
    return defaultPlatform;
  }
  throw new Error(
    'platform must be either "client" or "server" but was set to "' +
      platform +
      '"',
  );
}
export {Environment, ImportType, Platform};
