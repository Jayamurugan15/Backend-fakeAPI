// middlewares.js - Custom middlewares for JSON Server
const cors = require('cors');

module.exports = (req, res, next) => {
  // Enable CORS for all routes
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
    credentials: true
  })(req, res, () => {});

  // Add delay for realistic API simulation (only in dev mode)
  if (process.env.NODE_ENV !== 'production') {
    const delay = Math.random() * 500 + 200; // 200-700ms delay
    setTimeout(() => next(), delay);
  } else {
    next();
  }

 

  // Add realistic response headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Response-Time', Date.now().toString());

  // Log requests in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.originalUrl || req.url} - ${new Date().toISOString()}`);
  }

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};