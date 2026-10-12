import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Pin the algorithm on both sides so a token can't pick its own (e.g. "none").
const ALGORITHM = 'HS256';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwtExpiresIn,
  });
}

// Throws if the token is malformed, tampered with, or expired.
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
}
