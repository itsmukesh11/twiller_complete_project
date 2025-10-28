const fetch = require('node-fetch');
const API = process.env.API_BASE || 'http://localhost:5000/api';
const token = process.argv[2] || '';
(async ()=>{
  if (!token) return console.error('Usage: node check_token.js <token>');
  try{
    const r = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('status', r.status);
    console.log(await r.text());
  } catch(e) { console.error('err', e.message); }
})();
