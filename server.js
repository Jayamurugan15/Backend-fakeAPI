// server.js - Consolidated JSON Server for Vercel deployment
const jsonServer = require('json-server');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const server = jsonServer.create();

// Load database
let db;
try {
  const dbPath = path.join(__dirname, 'db.json');
  db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
} catch (error) {
  console.error('Error loading database:', error);
  db = {
    users: [],
    posts: [],
    categories: [],
    products: [],
    cart: [],
    movies: []
  };
}

const router = jsonServer.router(db);
const defaultMiddlewares = jsonServer.defaults({
  noCors: true // Disable default CORS to use custom
});

// CORS Configuration
server.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'https://container-presenter-pattern.vercel.app/'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
server.options('*', cors());

// Custom middleware - inline version
server.use((req, res, next) => {
  // Add realistic response headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Response-Time', Date.now().toString());

  // Log requests in development
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  if (!isProduction) {
    console.log(`${req.method} ${req.originalUrl || req.url} - ${new Date().toISOString()}`);
    
    // Add delay for realistic API simulation (only in dev mode)
    const delay = Math.random() * 500 + 200; // 200-700ms delay
    setTimeout(() => next(), delay);
  } else {
    next();
  }
});

// Set default middlewares (logger, static, no-cache)
server.use(defaultMiddlewares);

// Body parser for JSON
server.use(jsonServer.bodyParser);

// Custom routes before JSON Server router

// Health check endpoint
server.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.VERCEL ? 'vercel' : 'local',
    endpoints: {
      users: '/api/users/:id',
      userPosts: '/api/users/:id/posts',
      products: '/api/products',
      categories: '/api/categories',
      movies: '/api/movies'
    }
  });
});

// Custom route for user posts
server.get('/api/users/:id/posts', (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!db || !db.posts) {
      return res.status(500).json({ error: 'Database not loaded' });
    }
    
    const posts = db.posts.filter(post => post.userId === userId);
    res.json(posts);
  } catch (error) {
    console.error('Error in /api/users/:id/posts:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Custom route for products with filtering and sorting
server.get('/api/products', (req, res) => {
  try {
    const categoryId = req.query.category;
    const sortBy = req.query.sort || 'name';
    const filterBy = req.query.filter || 'all';
    const search = req.query.search;

    if (!db || !db.products) {
      return res.status(500).json({ error: 'Database not loaded' });
    }
    
    let products = [...db.products]; // Create a copy

    // Filter by category
    if (categoryId && categoryId !== 'all') {
      products = products.filter(product => product.categoryId === categoryId);
    }

    // Filter by availability
    if (filterBy === 'in-stock') {
      products = products.filter(product => product.inStock);
    } else if (filterBy === 'on-sale') {
      products = products.filter(product => product.price < product.originalPrice);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Sort products
    products.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    res.json(products);
  } catch (error) {
    console.error('Error in /api/products:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Use JSON Server router for other routes
server.use('/api', router);

// 404 handler
server.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    message: 'The requested resource was not found'
  });
});

// Error handler
server.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// For local development only
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log('🚀 Container-Presenter Pattern API Server');
    console.log(`📡 Server is running on http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log(`   GET  /api/users/:id              - Get user profile`);
    console.log(`   PUT  /api/users/:id              - Update user profile`);
    console.log(`   GET  /api/users/:id/posts        - Get user posts`);
    console.log(`   GET  /api/products               - Get products (with filtering)`);
    console.log(`   GET  /api/categories             - Get product categories`);
    console.log(`   GET  /api/movies                 - Get movies`);
    console.log('');
    console.log('🎯 Example URLs:');
    console.log(`   http://localhost:${PORT}/api/users/1`);
    console.log(`   http://localhost:${PORT}/api/users/1/posts`);
    console.log(`   http://localhost:${PORT}/api/products?category=1&sort=price-low`);
    console.log('');
    console.log('💡 Use "npm run dev" for slower responses (realistic API simulation)');
    console.log('');
  });
}

// Export for Vercel serverless
module.exports = server;
