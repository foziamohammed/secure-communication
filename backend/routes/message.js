const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middleware/authMiddleware');
const { getMessages, sendMessage } = require('../controllers/messageController');


router.get('/messages/:receiver', authMiddleware, getMessages); // Fetch messages with a specific user
router.post('/messages', authMiddleware, sendMessage); // Send a message (stored for history)

module.exports = router;