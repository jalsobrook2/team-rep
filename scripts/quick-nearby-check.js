const axios = require('axios');
(async ()=>{
  try{
    const base = process.env.BACKEND_URL || 'http://localhost:3000';
    console.log('Backend:', base);
    const demoEmail = process.env.DEMO_EMAIL || 'demo@pocketjob.test';
    const login = await axios.post(`${base}/api/auth/demo-login`, { email: demoEmail }, { timeout: 5000 });
    if(!login || !login.data || !login.data.success){ console.error('Demo login failed', login && login.data); process.exit(2) }
    const token = login.data.data.accessToken || login.data.accessToken || (login.data.data && login.data.data.accessToken);
    console.log('Got token:', !!token);
    // Use explicit coordinates (default to San Francisco) so endpoint returns nearby results
    const lat = process.env.LAT || 37.7749;
    const lng = process.env.LNG || -122.4194;
    const radius = process.env.RADIUS_KM || 50;
    const near = await axios.get(`${base}/api/jobs/near?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusKm=${encodeURIComponent(radius)}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 });
    console.log('Nearby status:', near.status);
    console.log(JSON.stringify(near.data, null, 2));
  }catch(e){
    console.error('Error details:');
    try{ console.error(e && e.stack ? e.stack : e) }catch(_){}
    if(e && e.response){
      try{ console.error('Response status:', e.response.status); console.error('Response data:', JSON.stringify(e.response.data,null,2)) }catch(_){}
    }
    process.exit(1)
  }
})();
