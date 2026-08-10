'use strict';
const Text = require('../models/Text');
const Space = require('../models/Space');
const { encrypt, decrypt } = require('../utils/encryption');
const bcrypt = require('bcryptjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EXPIRY_MAP = {
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const parseExpiry = (expiry) => {
  if (!expiry || expiry === 'never') return null;
  const ms = EXPIRY_MAP[expiry];
  return ms ? new Date(Date.now() + ms) : null;
};

// Verify the space belongs to the authenticated user
const getOwnedSpace = async (spaceId, userId) => {
  return Space.findOne({ _id: spaceId, userId });
};

// ─── Create text in a space ──────────────────────────────────────────────────

const createText = async (req, res, next) => {
  try {
    const { spaceId } = req.params;
    const { content, title, expiry, lockKey, imageData, language } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Validate imageData is a proper data URL if provided
    if (imageData && !imageData.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Invalid image data' });
    }

    const space = await getOwnedSpace(spaceId, req.user.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    let storedContent = content.trim();
    let storedImage = imageData || null;
    let expiresAt = parseExpiry(expiry ?? (space.isLocked ? 'never' : '1d'));

    if (space.isLocked) {
      // Locked space: verify lock key before writing
      if (!lockKey) {
        return res.status(400).json({ success: false, message: 'Lock key is required for this space' });
      }
      const valid = await bcrypt.compare(lockKey, space.lockKeyHash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Incorrect lock key' });
      }
      storedContent = encrypt(content.trim());
      if (storedImage) storedImage = encrypt(storedImage);
    }

    const text = await Text.create({
      userId: req.user.id,
      spaceId: space._id,
      content: storedContent,
      title: title?.trim() || '',
      expiresAt,
      imageData: storedImage,
      language: language?.trim() || '',
    });

    // For locked spaces, don't return content in the creation response
    const responseData = {
      id: text._id,
      title: text.title,
      isPinned: text.isPinned,
      language: text.language || '',
      createdAt: text.createdAt,
      expiresAt: text.expiresAt,
    };

    if (!space.isLocked) {
      responseData.content = text.content;
      responseData.imageData = text.imageData;
    }

    res.status(201).json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

// ─── Get texts in a space ────────────────────────────────────────────────────

const getTexts = async (req, res, next) => {
  try {
    const { spaceId } = req.params;

    const space = await getOwnedSpace(spaceId, req.user.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;
    const now = new Date();

    const query = {
      spaceId: space._id,
      userId: req.user.id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    // Select fields — for locked spaces never return content or imageData
    const selectFields = space.isLocked
      ? 'title isPinned language createdAt expiresAt'
      : 'content title isPinned imageData language createdAt expiresAt';

    const [texts, total] = await Promise.all([
      Text.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(selectFields)
        .lean(),
      Text.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: texts.map((t) => ({
        id: t._id,
        ...(space.isLocked ? {} : { content: t.content, imageData: t.imageData || null }),
        title: t.title || '',
        isPinned: t.isPinned || false,
        language: t.language || '',
        createdAt: t.createdAt,
        expiresAt: t.expiresAt || null,
      })),
      pagination: { page, limit, total, hasMore: skip + texts.length < total },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Unlock (decrypt) a single text ─────────────────────────────────────────

const unlockText = async (req, res, next) => {
  try {
    const { spaceId, textId } = req.params;
    const { lockKey } = req.body;

    if (!lockKey) {
      return res.status(400).json({ success: false, message: 'Lock key is required' });
    }

    const space = await getOwnedSpace(spaceId, req.user.id);
    if (!space || !space.isLocked) {
      return res.status(404).json({ success: false, message: 'Locked space not found' });
    }

    const valid = await bcrypt.compare(lockKey, space.lockKeyHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Incorrect lock key' });
    }

    const text = await Text.findOne({ _id: textId, spaceId: space._id, userId: req.user.id }).lean();
    if (!text) {
      return res.status(404).json({ success: false, message: 'Text not found' });
    }

    const decrypted = decrypt(text.content);
    const decryptedImage = text.imageData ? decrypt(text.imageData) : null;

    res.json({
      success: true,
      data: {
        id: text._id,
        content: decrypted,
        imageData: decryptedImage,
        title: text.title,
        isPinned: text.isPinned || false,
        createdAt: text.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Toggle pin on a text ────────────────────────────────────────────────────

const togglePin = async (req, res, next) => {
  try {
    const { spaceId, textId } = req.params;

    const space = await getOwnedSpace(spaceId, req.user.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    const text = await Text.findOne({ _id: textId, spaceId: space._id, userId: req.user.id });
    if (!text) {
      return res.status(404).json({ success: false, message: 'Text not found' });
    }

    text.isPinned = !text.isPinned;
    await text.save();

    res.json({ success: true, data: { id: text._id, isPinned: text.isPinned } });
  } catch (err) {
    next(err);
  }
};

// ─── Delete a text ───────────────────────────────────────────────────────────

const deleteText = async (req, res, next) => {
  try {
    const { spaceId, textId } = req.params;

    const space = await getOwnedSpace(spaceId, req.user.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    const result = await Text.deleteOne({ _id: textId, spaceId: space._id, userId: req.user.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Text not found' });
    }

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createText, getTexts, unlockText, deleteText, togglePin };
