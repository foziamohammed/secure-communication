const Message = require('../models/message');
const crypto = require('crypto');

exports.getMessages = async (req, res) => {
  try {
    const receiver = req.params.receiver;
    const messages = await Message.find({
      $or: [
        { sender: req.user.username, receiver },
        { sender: receiver, receiver: req.user.username },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.sendMessage = async (req, res) => {
  const { receiver, content } = req.body;
  try {
    // Simulate shared key (in production, use Diffie-Hellman with receiver)
    const sharedKey = crypto.randomBytes(32).toString('hex'); // Placeholder
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(sharedKey, 'hex'), iv);
    let encryptedContent = cipher.update(content, 'utf8', 'hex');
    encryptedContent += cipher.final('hex');

    const message = new Message({
      sender: req.user.username,
      receiver,
      encryptedContent: encryptedContent + ':' + iv.toString('hex'), // Store IV with encrypted data
    });
    await message.save();

    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};