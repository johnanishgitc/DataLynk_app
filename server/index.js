// Minimal production server: create-order + verify-payment (no webhooks)
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');

const { pushPaymentToTally } = require('./mockTally'); // replace with real adapter
// Replace the paymentsStore usage with your DB (Postgres/MySQL) in production.
const paymentsStore = {}; // simple in-memory store { paymentId: {...}, orderId: {...} }

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:3000', 'http://192.168.1.12:8081', 'http://192.168.1.12:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company', 'x-tallyloc-id', 'x-guid'],
  exposedHeaders: ['x-rtb-fingerprint-id', 'x-razorpay-signature', 'x-razorpay-payment-id', 'x-razorpay-order-id']
}));

app.use(bodyParser.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, req.body);
  next();
});

// Additional CORS headers for Razorpay
app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'x-rtb-fingerprint-id, x-razorpay-signature, x-razorpay-payment-id, x-razorpay-order-id');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-company, x-tallyloc-id, x-guid, x-rtb-fingerprint-id, x-razorpay-signature, x-razorpay-payment-id, x-razorpay-order-id');
  next();
});

const rzp = new Razorpay({
  key_id: config.key_id,
  key_secret: config.key_secret
});

// Helper: idempotent create-order recording
function recordOrder(order, invoiceId, amountPaise) {
  // persist order info: replace with DB insert
  paymentsStore[order.id] = {
    invoiceId,
    orderId: order.id,
    amount: amountPaise,
    currency: order.currency || 'INR',
    status: 'created',
    createdAt: new Date().toISOString()
  };
}

// POST /create-order
// Body: { invoiceId: string, amount: number } // amount in INR
app.post('/create-order', async (req, res) => {
  try {
    console.log('📦 Creating Razorpay order with config:', { key_id: config.key_id });
    
    const { invoiceId, amount } = req.body;
    if (!invoiceId || !amount) {
      console.error('❌ Missing required fields:', { invoiceId, amount });
      return res.status(400).json({ ok:false, error: 'invoiceId and amount required' });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    console.log('💰 Order amount:', { amount, amountPaise });

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `inv_${invoiceId}`,
      payment_capture: 1,
      notes: { invoiceId }
    };

    console.log('🔧 Razorpay options:', options);
    const order = await rzp.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);

    // record order id mapping
    recordOrder(order, invoiceId, amountPaise);

    res.json({ ok: true, order });
  } catch (err) {
    console.error('❌ create-order error:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message,
      details: err.error ? err.error : 'Unknown error'
    });
  }
});

// POST /verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId }
app.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ ok:false, error: 'missing required fields' });
    }

    // Verify signature: HMAC SHA256 of "order_id|payment_id" using secret
    const expected = crypto.createHmac('sha256', config.key_secret)
                           .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                           .digest('hex');

    if (expected !== razorpay_signature) {
      console.warn('Invalid signature', { razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ ok:false, error: 'Invalid signature' });
    }

    // Idempotency: check if we already processed this payment
    if (paymentsStore[razorpay_payment_id]) {
      return res.json({ ok:true, message: 'already processed' });
    }

    // Record payment (replace with DB insert)
    const paidAt = new Date().toISOString();
    paymentsStore[razorpay_payment_id] = {
      invoiceId,
      gateway_payment_id: razorpay_payment_id,
      gateway_order_id: razorpay_order_id,
      status: 'paid',
      paidAt
    };

    // push to Tally (mock adapter)
    try {
      await pushPaymentToTally({
        invoiceId,
        amount: paymentsStore[razorpay_order_id]?.amount || null, // if available
        gateway: 'razorpay',
        gateway_payment_id: razorpay_payment_id
      });
    } catch (err) {
      console.error('Tally push failed', err);
      // Do not fail verification — return success to client but mark for retry in background
      // Record a retry flag in DB (not implemented in this minimal example)
    }

    res.json({ ok:true });
  } catch (err) {
    console.error('verify-payment err', err);
    res.status(500).json({ ok:false, error: err.message });
  }
});

// Optional: small health check and debug endpoint to list stored payments (remove in prod)
app.get('/health', (req, res) => res.json({ ok:true, env: process.env.NODE_ENV || 'production' }));
app.get('/_payments_debug', (req, res) => res.json({ ok:true, paymentsStore }));

const port = config.port;
app.listen(port, '0.0.0.0', () => console.log(`🚀 Razorpay server running on port ${port} (accessible from network)`));
