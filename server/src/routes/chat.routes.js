import { Router } from 'express';
import {
  deleteConversation,
  getConversation,
  listConversations,
  sendMessage,
} from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Every chat route requires a logged-in user.
router.use(requireAuth);

router.get('/', listConversations);
router.post('/messages', chatLimiter, sendMessage);
router.get('/:id', getConversation);
router.delete('/:id', deleteConversation);

export default router;
