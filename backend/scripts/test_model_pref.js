
// Simple test that creates a user, logs in, then GET/POST /auth/model
const fetch = require('node-fetch');
const API = process.env.API_BASE || 'http://localhost:5000/api';

async function run() {
  try {
    console.log('Testing model preference endpoints against', API);
    const email = `modeltest+${Date.now()}@local`;
    const pw = 'password123';

    // Register
    const reg = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ModelTest', email, password: pw })
    });
    const regj = await reg.json();
    console.log('register:', regj.success ? 'OK' : regj);

    // Login
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw })
    });
    const loginj = await login.json();
    console.log('login:', loginj.token ? 'OK' : loginj);
    if (!loginj.token) return;
    const token = loginj.token;

    // Get model
    const gm = await fetch(`${API}/auth/model`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('get model:', await gm.json());

    // Set model
    const sm = await fetch(`${API}/auth/model`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-5-mini' }) });
    console.log('set model:', await sm.json());

    // Get model after set
    const gm2 = await fetch(`${API}/auth/model`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('get model after set:', await gm2.json());

  } catch (e) {
    console.error('Error in test_model_pref:', e);
    process.exit(1);
  }
}

run();
run();
