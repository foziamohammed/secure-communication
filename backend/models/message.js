const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware').authMiddleware;

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // Username of sender
  receiver: { type: String, required: true }, // Username of receiver
  encryptedContent: { type: String, required: true }, // AES-encrypted message
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);