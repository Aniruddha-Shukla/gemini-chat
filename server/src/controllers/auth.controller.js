import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt ignores everything past 72 bytes

// Accept only real strings: a JSON body like {"email": {"$gt": ""}} must never reach a query.
const str = (value) => (typeof value === 'string' ? value.trim() : '');

function authResponse(user) {
  return { token: signToken(user._id), user: user.toPublic() };
}

// POST /api/auth/register
export async function register(req, res) {
  const name = str(req.body?.name);
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!name || name.length > 60) throw new ApiError(400, 'Name is required (max 60 characters)');
  if (!EMAIL_RE.test(email) || email.length > 254) throw new ApiError(400, 'Please enter a valid email address');
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new ApiError(400, `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters`);
  }

  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({ name, email, password });
  res.status(201).json(authResponse(user));
}

// POST /api/auth/login
export async function login(req, res) {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+password');

  // Same response for "no such user" and "wrong password", so the endpoint
  // can't be used to discover which emails have accounts.
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res.json(authResponse(user));
}

// GET /api/auth/me  (protected) — lets the client verify a stored token on page load.
export function me(req, res) {
  res.json({ user: req.user.toPublic() });
}
