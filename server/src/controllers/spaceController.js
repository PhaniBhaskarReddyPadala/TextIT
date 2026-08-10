'use strict';
const bcrypt = require('bcryptjs');
const Space = require('../models/Space');
const Text = require('../models/Text');

const MAX_SPACES = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSpace = (space) => ({
  id: space._id || space.id,
  name: space.name,
  type: space.type || 'text',
  isLocked: space.isLocked,
  isDefault: space.isDefault,
  createdAt: space.createdAt,
});

// ─── Ensure default space exists (called after login/register) ───────────────

const ensureDefaultSpace = async (userId) => {
  const existing = await Space.findOne({ userId, isDefault: true });
  if (existing) return existing;
  return Space.create({ userId, name: 'General', isLocked: false, isDefault: true });
};

// ─── List spaces ─────────────────────────────────────────────────────────────

const getSpaces = async (req, res, next) => {
  try {
    // Ensure default space exists on every fetch
    await ensureDefaultSpace(req.user.id);

    const spaces = await Space.find({ userId: req.user.id })
      .sort({ isDefault: -1, createdAt: 1 }) // Default first, then by creation
      .lean();

    res.json({ success: true, data: spaces.map(formatSpace) });
  } catch (err) {
    next(err);
  }
};

// ─── Create space ─────────────────────────────────────────────────────────────

const createSpace = async (req, res, next) => {
  try {
    const { name, isLocked, lockKey, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Space name is required' });
    }

    // Validate type
    const spaceType = type === 'code' ? 'code' : 'text';
    // Code spaces cannot be locked
    const locked = spaceType === 'code' ? false : Boolean(isLocked);

    const count = await Space.countDocuments({ userId: req.user.id });
    if (count >= MAX_SPACES) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_SPACES} spaces allowed` });
    }

    if (locked && (!lockKey || lockKey.length < 4)) {
      return res.status(400).json({ success: false, message: 'Lock key must be at least 4 characters' });
    }

    const spaceData = {
      userId: req.user.id,
      name: name.trim(),
      type: spaceType,
      isLocked: locked,
      isDefault: false,
    };

    if (locked) {
      spaceData.lockKeyHash = await bcrypt.hash(lockKey, 12);
    }

    const space = await Space.create(spaceData);

    res.status(201).json({ success: true, data: formatSpace(space) });
  } catch (err) {
    next(err);
  }
};

// ─── Update/Rename space ──────────────────────────────────────────────────────

const updateSpace = async (req, res, next) => {
  try {
    const { name, lockKey } = req.body;
    const { id } = req.params;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Space name is required' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ success: false, message: 'Space name must be 50 characters or less' });
    }

    const space = await Space.findOne({ _id: id, userId: req.user.id });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // If space is locked, verify lockKey password
    if (space.isLocked) {
      if (!lockKey) {
        return res.status(400).json({ success: false, message: 'Password is required to rename a private space' });
      }
      const valid = await bcrypt.compare(lockKey, space.lockKeyHash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Incorrect password for private space' });
      }
    }

    space.name = name.trim();
    await space.save();

    res.json({ success: true, data: formatSpace(space) });
  } catch (err) {
    next(err);
  }
};

// ─── Delete space ─────────────────────────────────────────────────────────────

const deleteSpace = async (req, res, next) => {
  try {
    const space = await Space.findOne({ _id: req.params.id, userId: req.user.id });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    if (space.isDefault) {
      return res.status(400).json({ success: false, message: 'Cannot delete the default space' });
    }

    // Require password for locked (private) spaces
    if (space.isLocked) {
      const lockKey = req.body?.lockKey || req.headers['x-lock-key'] || req.query?.lockKey;
      if (!lockKey) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete a private space',
          isPasswordRequired: true,
        });
      }

      const valid = await bcrypt.compare(lockKey, space.lockKeyHash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Incorrect password for private space' });
      }
    }

    // Delete all texts in this space first
    await Text.deleteMany({ spaceId: space._id, userId: req.user.id });
    await space.deleteOne();

    res.json({ success: true, message: 'Space deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Verify lock key (unlock a space) ────────────────────────────────────────

const verifyLockKey = async (req, res, next) => {
  try {
    const { lockKey } = req.body;

    if (!lockKey) {
      return res.status(400).json({ success: false, message: 'Lock key is required' });
    }

    const space = await Space.findOne({ _id: req.params.id, userId: req.user.id });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    if (!space.isLocked) {
      return res.status(400).json({ success: false, message: 'This space is not locked' });
    }

    const valid = await bcrypt.compare(lockKey, space.lockKeyHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Incorrect lock key' });
    }

    res.json({ success: true, message: 'Unlocked' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSpaces, createSpace, updateSpace, deleteSpace, verifyLockKey, ensureDefaultSpace };
