const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const { authenticateWebSocket } = require('./middleware/authMiddleware');
const Message = require('./models/message');

const app = express();
app.use(express.json());
app.use(cors());

// Hardcoded encryption key (256-bit/32-byte key in hex)
const HARDCODED_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', authRoutes);
app.use('/api', messageRoutes);

// WebSocket server
const server = app.listen(5000, () => console.log('Server running on port 5000'));
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws, req) => {
  const token = req.url.split('token=')[1];

  try {
    const decoded = authenticateWebSocket(token);
    const username = decoded.username;
    clients.set(username, ws);
    console.log(`${username} connected`);

    ws.on('message', async (data) => {
      try {
        const { receiver, encryptedContent, iv } = JSON.parse(data.toString());
        if (!receiver || !encryptedContent || !iv) {
          console.error('Invalid message format:', data.toString());
          return;
        }

        // Save the encrypted message to MongoDB
        const message = new Message({
          sender: username,
          receiver,
          encryptedContent,
          iv
        });
        await message.save();
        console.log(`Message saved to MongoDB: ${message._id}`);

        // Relay the message to the receiver if online
        const receiverWs = clients.get(receiver);
        if (receiverWs) {
          receiverWs.send(JSON.stringify({ 
            sender: username, 
            encryptedContent,
            iv
          }));
          console.log(`Message relayed to ${receiver}`);
        } else {
          console.log(`${receiver} is offline, message stored for later retrieval`);
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err.message);
      }
    });

    ws.on('close', () => {
      clients.delete(username);
      console.log(`${username} disconnected`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${username}:`, error.message);
    });
  } catch (err) {
    console.error('WebSocket authentication error:', err.message);
    ws.close();
  }
});

// Helper function to get the encryption key
function getEncryptionKey() {
  return Buffer.from(HARDCODED_ENCRYPTION_KEY, 'hex');
}

module.exports = {
  app,
  getEncryptionKey
};