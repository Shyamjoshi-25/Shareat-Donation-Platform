const buckets = new Map();

/** Lightweight per-process protection for authentication endpoints.
 * For multi-instance production deployments, replace this with a shared store.
 */
export function authRateLimit({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    // Bound memory usage and remove expired entries during traffic.
    if (buckets.size > 5000) {
      for (const [ip, value] of buckets) if (value.resetAt <= now) buckets.delete(ip);
    }
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      return res.status(429).json({ message: 'Too many authentication attempts. Please wait and try again.' });
    }
    return next();
  };
}
