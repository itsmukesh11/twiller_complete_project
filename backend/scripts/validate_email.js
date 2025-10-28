const fetch = require('node-fetch');
const API = process.env.API_BASE || 'http://localhost:5000/api';

async function run() {
  try {
    console.log('Validate email flows against', API);
    const email = `emailtest+${Date.now()}@local`;
    const pw = 'password123';

    // Register
    const reg = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name: 'EmailTest', email, password: pw }) });
    const regj = await reg.json();
    console.log('register:', regj.success ? 'OK' : regj);

    // Login
    const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password: pw }) });
    const loginj = await login.json();
    console.log('login:', loginj.token ? 'OK' : loginj);
    if (!loginj.token) return;
    const token = loginj.token;

    // Send OTP for audio
    const otpResp = await fetch(`${API}/audio/send-otp`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    console.log('/audio/send-otp status', otpResp.status, await otpResp.text());

    // Trigger forgot password
    const forgotResp = await fetch(`${API}/auth/forgot`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email }) });
    console.log('/auth/forgot status', forgotResp.status, await forgotResp.text());

    console.log('Validate email flows done. Check Mailtrap or backend logs for sent email previews.');

  } catch (e) {
    console.error('Error in validate_email:', e);
    process.exit(1);
  }
}

run();
