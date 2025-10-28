const fetch = require('node-fetch');
const API = process.env.API_BASE || 'http://localhost:5000/api';

async function run(){
  try{
    console.log('Simulate subscription confirm against', API);
    const email = `paytest+${Date.now()}@local`;
    const pw = 'password123';
    // register
    const reg = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name: 'PayTest', email, password: pw }) });
    console.log('register status', reg.status);
    const regj = await reg.json();
    console.log('register:', regj.success ? 'OK' : regj);

    // login
    const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password: pw }) });
    const loginj = await login.json();
    console.log('login:', loginj.token ? 'OK' : loginj);
    if (!loginj.token) return;
    const token = loginj.token;

    // confirm subscription (simulate webhook/workflow)
    const body = { sessionId: 'test-session-' + Date.now(), userId: loginj.user._id, plan: 'bronze' };
    const conf = await fetch(`${API}/payments/confirm`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    console.log('/payments/confirm status', conf.status);
    console.log(await conf.text());
    console.log('Simulation done. Check Mailtrap or backend logs for invoice email (or jsonTransport preview).');
  } catch (e) {
    console.error('simulate_stripe_confirm error', e);
    process.exit(1);
  }
}

run();
