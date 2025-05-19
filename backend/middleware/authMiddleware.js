const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware for HTTP routes
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user info (e.g., { username: 'Alice' })
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Function to authenticate WebSocket connections
const authenticateWebSocket = (token) => {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // Return decoded user info
  } catch (err) {
    throw new Error('Invalid token');
  }
};

module.exports = { authMiddleware, authenticateWebSocket };