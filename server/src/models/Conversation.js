import mongoose from 'mongoose';

// Roles match the Gemini API ('user' / 'model'), so history maps 1:1 onto request contents.
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New chat', trim: true, maxlength: 100 },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

// Serves the sidebar query: a user's chats, most recently active first.
conversationSchema.index({ user: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
