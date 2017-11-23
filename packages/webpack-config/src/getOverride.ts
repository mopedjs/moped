import {Environment, Platform} from '@moped/enums';

export interface OverrideEnvironment<T> {
  production: T;
  test?: T;
  development: T;
}
export interface OverridePlatform<T> {
  client: T | OverrideEnvironment<T>;
  server: T | OverrideEnvironment<T>;
}
export type Override<T> = T | OverridePlatform<T> | OverrideEnvironment<T>;

export default function getOverride<T>(
  input: Override<T>,
  environment: Environment,
  platform: Platform,
): T {
  if (input && typeof input === 'object') {
    const keys = Object.keys(input).sort();
    if (keys.length === 2 && keys[0] === 'client' && keys[1] === 'server') {
      return getOverride(
        (<OverridePlatform<T>>input)[platform],
        environment,
        platform,
      );
    }
    if (
      (keys.length === 3 &&
        keys[0] === 'development' &&
        keys[1] === 'production' &&
        keys[2] === 'test') ||
      (keys.length === 2 &&
        keys[0] === 'development' &&
        keys[1] === 'production')
    ) {
      const i = <OverrideEnvironment<T>>input;
      if (i.test === undefined && environment === Environment.Test) {
        return i.development;
      }
      return <T>i[environment];
    }
  }
  return <T>input;
}
