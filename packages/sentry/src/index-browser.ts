import server from './client';
import Sentry, {verify, Breadcrumb, CaptureOptions, User} from './interface';

export {Sentry, Breadcrumb, CaptureOptions, User};

const output = verify(server);
export default output;

module.exports = output;
module.exports.default = output;
