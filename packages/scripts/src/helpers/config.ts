import getConfig, {AppConfig, Config} from '@moped/config';

export {AppConfig, Config};
export default getConfig(process.cwd(), {logAndExitOnError: true});
