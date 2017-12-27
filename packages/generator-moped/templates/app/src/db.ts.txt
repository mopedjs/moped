import connection from './db-connection';
import DatabaseAPI from './db-schema';

export default new DatabaseAPI(connection);
