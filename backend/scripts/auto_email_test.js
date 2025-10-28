/*
 Automated email flow test that mocks the nodemailer transporter to verify that email-sending code paths are invoked.
 Usage: node scripts/auto_email_test.js
 This script will:
 - temporarily override mailer transporter with a mock that records calls
 - call the sendMail helper to simulate welcome/otp/forgot/invoice emails
 - report success/failure
*/

const mailer = require('../utils/mailer');

let calls = [];

// Create a mock transporter with sendMail function
const mockTransport = {
  options: { jsonTransport: true },
  sendMail: async (opts) => {
    calls.push(opts);
    return { messageId: 'mock-' + (calls.length) };
  }
};

async function run() {
  console.log('Starting automated email tests...');
  mailer._setTransportForTests(mockTransport);

  try {
    // 1) Welcome email
    await mailer.sendMail('user1@example.com', 'Welcome to Twiller', '<p>Welcome</p>');
    // 2) OTP email
    await mailer.sendMail('user2@example.com', 'Your OTP', '<p>OTP: 123456</p>');
    // 3) Forgot password
    await mailer.sendMail('user3@example.com', 'Your temporary password', '<p>Password: AbCdEfGh</p>');
    // 4) Invoice
    await mailer.sendMail('user4@example.com', 'Your invoice', '<p>Invoice details</p>');

    if (calls.length !== 4) throw new Error('Expected 4 email calls, got ' + calls.length);

    console.log('All email flows invoked. Details:');
    calls.forEach((c, i) => console.log(i + 1, c.to, c.subject));
    console.log('Automated email test passed.');
  } catch (e) {
    console.error('Automated email test failed:', e && e.message);
    process.exit(2);
  } finally {
    // restore nothing (process exit soon)
  }
}

run();
