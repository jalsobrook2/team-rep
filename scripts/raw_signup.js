const axios = require('axios')
const body = {name:'PosterNode', email:'poster-node@example.com', password:'Poster123!', skills:'posting'};

(async () => {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/signup', body, { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true })
    console.log('Status:', res.status);
    console.log('Body:', typeof res.data === 'string' ? res.data : JSON.stringify(res.data))
    try { console.log('JSON parsed:', res.data) }catch(e){ /* ignore parse errors */ }
  } catch (err) {
    console.error('Request error:', err.message || err)
  }
})();