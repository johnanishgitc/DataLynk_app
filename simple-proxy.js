const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-tallyloc-id, x-company, x-guid',
  'Access-Control-Allow-Credentials': 'true'
};

// Create server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      message: 'TallyCatalyst Simple Proxy Server is running',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Only proxy /api/* requests
  if (!req.url.startsWith('/api/')) {
    res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not found',
      message: `Route ${req.url} not found. Only /api/* routes are supported.`
    }));
    return;
  }
  
  // Parse request body for POST requests
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    // Target URL
    const targetUrl = `${process.env.API_BASE_URL || 'https://itcatalystindia.com/Development/CustomerPortal_API'}${req.url}`;
    
    // Parse target URL
    const parsedUrl = url.parse(targetUrl);
    
    // Request options
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers.authorization || '',
        'x-tallyloc-id': req.headers['x-tallyloc-id'] || '',
        'x-company': req.headers['x-company'] || '',
        'x-guid': req.headers['x-guid'] || '',
        'X-Proxy-By': 'TallyCatalyst-Simple-Proxy',
        'User-Agent': req.headers['user-agent'] || 'TallyCatalyst-Proxy'
      }
    };
    
    // Make request to target server
    const proxyReq = http.request(options, (proxyRes) => {
      // Set CORS headers
      Object.keys(corsHeaders).forEach(key => {
        res.setHeader(key, corsHeaders[key]);
      });
      
      // Forward response headers
      Object.keys(proxyRes.headers).forEach(key => {
        if (key.toLowerCase() !== 'access-control-allow-origin') {
          res.setHeader(key, proxyRes.headers[key]);
        }
      });
      
      res.writeHead(proxyRes.statusCode);
      
      // Forward response body
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('❌ Proxy error:', err.message);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Proxy error',
        message: err.message,
        timestamp: new Date().toISOString()
      }));
    });
    
    // Send request body if present
    if (body) {
      proxyReq.write(body);
    }
    
    proxyReq.end();
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 TallyCatalyst Simple Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying API requests to: ${process.env.API_BASE_URL || 'https://itcatalystindia.com/Development/CustomerPortal_API'}`);
  console.log(`🌐 CORS enabled for all origins`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Supported routes: /api/*`);
});
