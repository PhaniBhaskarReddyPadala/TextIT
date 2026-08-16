'use strict';
const mongoose = require('mongoose');

const textSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: true,
    },
    // Plain text for unlocked spaces; JSON-encrypted for locked spaces
    // Not required at schema level — controller validates that at least
    // one of content / imageData is present before creation.
    content: {
      type: String,
      default: '',
      maxlength: [200000, 'Content too large'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title too long'],
      default: '',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    // Base64 data URL of an attached file — image, PDF, PPT, etc. (optional)
    imageData: {
      type: String,
      default: null,
    },
    // Original filename for non-image attachments
    fileName: {
      type: String,
      default: null,
    },
    // true = floats to top of list
    isPinned: {
      type: Boolean,
      default: false,
    },
    // For code-type spaces: the programming language label
    language: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Fast: get latest texts in a space, pinned first
textSchema.index({ spaceId: 1, isPinned: -1, createdAt: -1 });
// Fast: auth ownership check
textSchema.index({ userId: 1, spaceId: 1 });
// TTL: auto-delete expired documents
textSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

textSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Text', textSchema);
