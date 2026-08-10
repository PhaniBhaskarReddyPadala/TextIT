'use strict';
const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get :spaceId
const auth = require('../middleware/authMiddleware');
const { createText, getTexts, unlockText, deleteText, togglePin } = require('../controllers/textController');

// All routes are nested under /api/spaces/:spaceId/text
router.get('/', auth, getTexts);
router.post('/', auth, createText);
router.post('/:textId/unlock', auth, unlockText);
router.patch('/:textId/pin', auth, togglePin);
router.delete('/:textId', auth, deleteText);

module.exports = router;
