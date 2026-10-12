import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/token.js';

// Guards a route: expects `Authorization: Bearer <jwt>` and attaches the user as req.user.
export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Your session is invalid or has expired. Please log in again.');
  }

  // A valid signature isn't enough: the account may have been deleted since the token was issued.
  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists');
  }

  req.user = user;
  next();
}
