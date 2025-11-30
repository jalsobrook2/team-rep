const http = require('http');
const opts = { hostname: 'localhost', port: 3000, path: '/', method: 'GET', timeout: 5000 };
const req = http.request(opts, res => {
  console.log('statusCode', res.statusCode);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', ()=>{ console.log('bodySnippet', body.slice(0,300)); process.exit(0) });
});
req.on('error', e => { console.error('http error', e && e.message || e); process.exit(2) });
req.end();
