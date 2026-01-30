// server.js - Custom JSON Server setup
const jsonServer = require('json-server');
const middlewares = require('./middlewares');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const defaultMiddlewares = jsonServer.defaults();

server.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', '*'],  // Add '*' for Vercel testing if needed
  credentials: true
}));

// Set default middlewares (logger, static, cors and no-cache)
server.use(defaultMiddlewares);

// Custom middlewares
server.use(middlewares);

// Custom routes before JSON Server router
server.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      users: '/api/users/:id',
      userPosts: '/api/users/:id/posts',
      products: '/api/products',
      categories: '/api/categories',
      movies: '/api/movies'
    }
  });
});

// Add custom routes for better API structure
server.get('/api/users/:id/posts', (req, res) => {
  const userId = req.params.id;
  const db = router.db; // Get the database
  if (!db) {
    return res.status(500).json({ error: 'Database not loaded' });
  }
  const posts = db.get('posts').filter({ userId }).value();
  res.json(posts);
});

// Custom route for products with filtering and sorting
server.get('/api/products', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const categoryId = url.searchParams.get('category');
  const sortBy = url.searchParams.get('sort') || 'name';
  const filterBy = url.searchParams.get('filter') || 'all';
  const search = url.searchParams.get('search');

  const db = router.db;
  if (!db) {
    return res.status(500).json({ error: 'Database not loaded' });
  }
  let products = db.get('products').value();

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
      product.tags.some(tag => tag.toLowerCase().includes(searchLower))
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
});

// Use default router
server.use('/api', router);
//server.use(router);

server.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// For local dev only (comment out or remove for Vercel)
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
