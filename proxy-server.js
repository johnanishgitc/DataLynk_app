const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TallyCatalyst Proxy Server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple proxy function
function proxyRequest(req, res) {
  const targetUrl = `${process.env.API_BASE_URL || 'https://itcatalystindia.com/Development/CustomerPortal_API'}${req.path}`;
  
  console.log(`🔄 Proxying ${req.method} ${req.path} to: ${targetUrl}`);
  
  if (req.body) {
    console.log('📤 Request body:', JSON.stringify(req.body, null, 2));
  }

  const options = {
    hostname: 'itcatalystindia.com',
    port: 3001,
    path: req.path,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers.authorization || '',
      'X-Proxy-By': 'TallyCatalyst-Local-Proxy'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`✅ Response from Tally server: ${proxyRes.statusCode}`);
    
    // Forward response headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    res.status(proxyRes.statusCode);
    
    // Forward response body
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('❌ Proxy error:', err.message);
    res.status(500).json({
      error: 'Proxy error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  });

  // Send request body if present
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
}

// Proxy all /api/* requests
app.use('/api', proxyRequest);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 TallyCatalyst Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying API requests to: ${process.env.API_BASE_URL || 'https://itcatalystindia.com/Development/CustomerPortal_API'}`);
  console.log(`🌐 CORS enabled for: localhost:8081, localhost:3000, localhost:19006`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});
