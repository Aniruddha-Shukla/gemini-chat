import { rateLimit } from 'express-rate-limit';

const common = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
};

// Slows down password guessing. Only failed attempts count toward the limit.
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed attempts. Please wait 15 minutes and try again.' },
});

// Caps Gemini spend per account. Must run after requireAuth, since it keys on req.user.
export const chatLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  message: { message: 'You are sending messages too quickly. Please wait a moment.' },
});
