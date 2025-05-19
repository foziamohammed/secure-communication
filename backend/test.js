const authMiddleware = require('./middleware/authMiddleware').authMiddleware;
console.log(typeof authMiddleware); // Should log: "function"