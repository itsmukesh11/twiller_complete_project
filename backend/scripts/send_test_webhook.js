/*
 Simulate a Stripe webhook POST to /api/payments/webhook for local testing.
 Usage:
   node send_test_webhook.js [userId] [plan]
 Example:
   node send_test_webhook.js 64f2c1a0ad3e3b1a1c2d3e4f bronze

 Note: If your backend has STRIPE_WEBHOOK_SECRET set, the server will try to verify signature
 and this script will NOT be able to compute a valid signature. For quick local testing,
 either unset STRIPE_WEBHOOK_SECRET or set it to an empty value in your .env and restart.
*/

const fetch = require('node-fetch');
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function run() {
  const args = process.argv.slice(2);
  const userId = args[0] || 'test-user-id';
  const plan = args[1] || 'bronze';

  const fakeSession = {
    id: 'cs_test_' + Date.now(),
    object: 'checkout.session',
    metadata: { userId, plan },
    payment_status: 'paid'
  };

  const event = {
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: fakeSession }
  };

  try {
    console.log('Posting fake webhook event to', `${API_BASE}/payments/webhook`);
    const res = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    console.log('Status:', res.status);
    const txt = await res.text();
    console.log('Response body:', txt);
    console.log('Done');
  } catch (e) {
    console.error('Error sending webhook:', e);
    process.exit(1);
  }
}

run();
