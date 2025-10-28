const fetch = require('node-fetch');
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function run(){
  console.log('Smoke test starting against', API_BASE);
  try {
    // Register
    const reg = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'smoketest', email: `smoke+${Date.now()}@local`, password: 'password123' })
    });
    const regj = await reg.json();
    console.log('register:', regj.success ? 'OK' : regj);

    // Login
    const login = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regj.user.email, password: 'password123' })
    });
    const loginj = await login.json();
    if (!loginj.token) throw new Error('Login failed: ' + JSON.stringify(loginj));
    console.log('login: OK');
    const token = loginj.token;

    // Create a tweet (if allowed) or pick an existing seeded tweet
    let tweetId = null;
    try {
      const form = new (require('form-data'))();
      form.append('text', 'Smoke test tweet #smoke');
      const t = await fetch(`${API_BASE}/tweets`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const tj = await t.json();
      console.log('create tweet:', tj.tweet ? 'OK' : tj);
      tweetId = tj.tweet ? tj.tweet._id : null;
    } catch (e) {
      console.debug('create tweet error', e.message || e);
    }

    if (!tweetId) {
      // fetch existing tweets and pick the first one
      const gt = await fetch(`${API_BASE}/tweets`);
      const gtr = await gt.json();
      if (Array.isArray(gtr) && gtr.length) {
        tweetId = gtr[0]._id;
        console.log('Using seeded tweet id for interactions:', tweetId);
      } else {
        console.log('No tweets available to interact with');
      }
    }

    if (tweetId) {
      // like
      const lk = await fetch(`${API_BASE}/tweets/${tweetId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      console.log('like:', (await lk.json()));
      // comment
      const cm = await fetch(`${API_BASE}/tweets/${tweetId}/comment`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Nice!' }) });
      console.log('comment:', (await cm.json()));
      // share
      const sh = await fetch(`${API_BASE}/tweets/${tweetId}/share`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      console.log('share:', (await sh.json()));
    }

    // trending
    const tr = await fetch(`${API_BASE}/tweets/trending/hashtags`);
    console.log('trending:', await tr.json());

    // get tweets
    const gt = await fetch(`${API_BASE}/tweets`);
    const gtr = await gt.json();
    console.log('tweets count:', Array.isArray(gtr) ? gtr.length : gtr);

    console.log('Smoke test completed');
    process.exit(0);
  } catch (e) {
    console.error('Smoke test failed', e);
    process.exit(1);
  }
}

run();
