'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const spaceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Space name is required'],
      trim: true,
      maxlength: [50, 'Space name too long'],
    },
    // 'text' = normal space, 'code' = code snippet space
    type: {
      type: String,
      enum: ['text', 'code'],
      default: 'text',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    // bcrypt hash of the lock key — null for unlocked spaces
    lockKeyHash: {
      type: String,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index: fast lookup of all spaces for a user
spaceSchema.index({ userId: 1, createdAt: 1 });

spaceSchema.methods.verifyLockKey = async function (key) {
  if (!this.isLocked || !this.lockKeyHash) return false;
  return bcrypt.compare(key, this.lockKeyHash);
};

spaceSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.lockKeyHash; // Never expose hash
    return ret;
  },
});

module.exports = mongoose.model('Space', spaceSchema);
