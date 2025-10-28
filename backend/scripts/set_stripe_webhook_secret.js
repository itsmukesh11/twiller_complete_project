// Usage: node set_stripe_webhook_secret.js <whsec_value>
// This simple script will append or replace STRIPE_WEBHOOK_SECRET in backend/.env

const fs = require('fs');
const path = require('path');

const secret = process.argv[2];
if (!secret) {
  console.error('Usage: node set_stripe_webhook_secret.js <whsec_value>');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env');
let content = '';
try {
  content = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.warn('.env not found, creating a new one');
}

const lines = (content || '').split(/\r?\n/).filter(Boolean).filter(l => !l.startsWith('STRIPE_WEBHOOK_SECRET='));
lines.push(`STRIPE_WEBHOOK_SECRET=${secret}`);
fs.writeFileSync(envPath, lines.join('\n') + '\n');
console.log('STRIPE_WEBHOOK_SECRET set in', envPath);
