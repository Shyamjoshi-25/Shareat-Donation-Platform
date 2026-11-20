// Lightweight smoke benchmark for an already-running Shareat API.
// Usage: API_URL=http://localhost:5000/api REQUESTS=100 CONCURRENCY=10 node scripts/performance-test.js
const base = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const total = Math.max(1, Number(process.env.REQUESTS || 100));
const concurrency = Math.max(1, Number(process.env.CONCURRENCY || 10));
const samples = [];
let next = 0;
async function worker() {
  while (next < total) {
    const index = next++;
    const start = performance.now();
    const response = await fetch(`${base}/health`);
    await response.arrayBuffer();
    samples[index] = performance.now() - start;
    if (!response.ok) throw new Error(`Health request failed: ${response.status}`);
  }
}
const started = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
const elapsed = performance.now() - started;
samples.sort((a, b) => a - b);
const percentile = p => samples[Math.min(samples.length - 1, Math.ceil(samples.length * p) - 1)];
console.log(JSON.stringify({ requests: total, concurrency, elapsedMs: Math.round(elapsed), avgMs: Math.round(samples.reduce((a,b)=>a+b,0)/samples.length), p50Ms: Math.round(percentile(.50)), p95Ms: Math.round(percentile(.95)), maxMs: Math.round(samples.at(-1)), targetP95Under3000ms: percentile(.95) < 3000 }, null, 2));
