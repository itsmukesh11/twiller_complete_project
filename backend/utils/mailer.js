// Load .env for standalone scripts that require the mailer directly
try {
  require('dotenv').config();
} catch (e) {
  // ignore if dotenv isn't available — process.env may already be set
}

const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

let transporter;
if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
} else {
  // No SMTP configured — use a console/json transport so emails are visible in logs
  console.warn('SMTP not configured, falling back to jsonTransport for emails (emails will not be sent).');
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

const DEFAULT_FROM = SMTP_FROM || 'no-reply@twiller.local';

async function sendMail(to, subject, html) {
  // Add basic retry with backoff for transient SMTP errors (e.g. rate limits)
  const maxAttempts = 3;
  const backoffs = [300, 1200, 3000];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: DEFAULT_FROM,
        to,
        subject,
        html
      });
      // If using jsonTransport, info.message will contain the message preview
      console.debug('Email sent:', { to, subject, messageId: info.messageId || null, attempt });
      return info;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      // If last attempt, log and rethrow
      if (attempt === maxAttempts) {
        console.error('Failed to send email', { to, subject, error: msg, attempt });
        throw err;
      }
      // Decide whether to retry: transient network / rate limit / SMTP 4xx/5xx
      const retryable = /Too many|rate limit|ETIMEDOUT|ECONNRESET|ENOTFOUND|ENETUNREACH|5\d\d|4\d\d/i.test(msg);
      if (!retryable) {
        console.error('Non-retryable sendMail error', { to, subject, error: msg, attempt });
        throw err;
      }
      console.warn(`sendMail attempt ${attempt} failed, will retry after ${backoffs[attempt-1]}ms:`, msg);
      await new Promise(r => setTimeout(r, backoffs[attempt-1]));
      // then loop to retry
    }
  }
}

// For testing: allow overriding transporter
function _setTransportForTests(t) {
  transporter = t;
}

function _getTransportInfo() {
  return { type: transporter && transporter.options && transporter.options.jsonTransport ? 'json' : 'smtp' };
}

module.exports = { sendMail, _setTransportForTests, _getTransportInfo };
