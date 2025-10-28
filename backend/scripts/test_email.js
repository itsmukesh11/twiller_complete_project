/*
 Simple script to test mailer configuration by sending a test email to the given address.
 Usage: node scripts/test_email.js recipient@example.com
 */

const { sendMail } = require('../utils/mailer');

async function run() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test_email.js recipient@example.com');
    process.exit(1);
  }
  try {
    await sendMail(to, 'Twiller test email', '<p>This is a test email from Twiller.</p>');
    console.log('Email send attempted. Check your SMTP (Mailtrap) inbox.');
  } catch (e) {
    console.error('sendMail failed:', e && e.message);
    process.exit(2);
  }
}

run();
