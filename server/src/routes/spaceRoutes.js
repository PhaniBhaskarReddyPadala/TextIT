'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getSpaces, createSpace, deleteSpace, verifyLockKey } = require('../controllers/spaceController');

router.get('/', auth, getSpaces);
router.post('/', auth, createSpace);
router.delete('/:id', auth, deleteSpace);
router.post('/:id/verify-lock', auth, verifyLockKey);

module.exports = router;
