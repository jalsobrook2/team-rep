#!/usr/bin/env node
/* Simple smoke test for frontend and backend
   Usage:
     FRONTEND_URL=http://localhost:5173 BACKEND_URL=http://localhost:3000 node scripts/smoke-test.js
   Defaults: frontend -> http://localhost:5173, backend -> http://localhost:3000
*/

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'
const TIMEOUT = parseInt(process.env.SMOKE_TIMEOUT || '5000', 10)
const axios = require('axios')

function timeoutPromise(ms, msg){
  return new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))
}

async function checkUrl(url, opts={expectJson:false, expectContains:null}){
  try{
    const res = await axios.get(url, { timeout: TIMEOUT, responseType: 'text', validateStatus: () => true })
    if(!res) throw new Error('No response')
    if(res.status < 200 || res.status >= 400) throw new Error(`HTTP ${res.status}`)
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    if(opts.expectJson){
      try{ JSON.parse(text) }catch(e){ throw new Error('Response is not valid JSON') }
    }
    if(opts.expectContains && !text.includes(opts.expectContains)){
      throw new Error(`Response did not contain expected text: ${opts.expectContains}`)
    }
    return { ok:true, status: res.status }
  }catch(err){
    return { ok:false, error: err.message || String(err) }
  }
}

(async ()=>{
  console.log('Smoke test starting')
  console.log('Frontend ->', FRONTEND_URL)
  console.log('Backend  ->', BACKEND_URL)

  const results = []

  // Frontend: expect index.html contains root div
  results.push({ name: 'frontend', url: FRONTEND_URL, result: await checkUrl(FRONTEND_URL, { expectContains: '<div id="root">' }) })

  // Backend: root route should return JSON with success:true
  const backendRoot = BACKEND_URL.replace(/\/$/, '') + '/'
  const backendRes = await checkUrl(backendRoot, { expectJson:true })
  if(backendRes.ok){
    // further validate JSON success flag
    try{
      const r = await axios.get(backendRoot, { timeout: TIMEOUT, validateStatus: () => true })
      const j = r.data
      if(!j || j.success !== true) results.push({ name:'backend', url: backendRoot, result: { ok:false, error: 'Backend root returned JSON but success!==true' } })
      else results.push({ name:'backend', url: backendRoot, result: { ok:true } })
    }catch(e){ results.push({ name:'backend', url: backendRoot, result: { ok:false, error: e.message } }) }
  } else {
    results.push({ name:'backend', url: backendRoot, result: backendRes })
  }

  // Summary
  let allOk = true
  for(const r of results){
    if(r.result.ok) console.log(`OK  - ${r.name} (${r.url})`)
    else { allOk = false; console.error(`FAIL - ${r.name} (${r.url}) -> ${r.result.error}`) }
  }

  if(!allOk){
    console.error('\nSmoke test FAILED')
    process.exitCode = 2
  } else {
    console.log('\nSmoke test PASSED')
    process.exitCode = 0
  }
})()
