import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Stored as a bcrypt hash; excluded from queries unless explicitly selected with '+password'.
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// Hash only when the password was set or changed, so re-saving a user never double-hashes.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// The only user shape the API ever returns.
userSchema.methods.toPublic = function () {
  return { id: this._id, name: this.name, email: this.email, createdAt: this.createdAt };
};

export const User = mongoose.model('User', userSchema);
