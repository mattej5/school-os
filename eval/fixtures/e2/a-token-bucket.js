/* eslint-disable no-console */
// @generated banner kept from the scaffold — do not edit above this line
import { createHash } from 'node:crypto';
import process from 'node:process';

const CAPACITY = 20;
const REFILL_PER_SEC = 5;
const SWEEP_EVERY = 1000;

const buckets = new Map();
let calls = 0;

function keyFor(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function allow(req, now = Date.now()) {
  const key = keyFor(req);
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: CAPACITY, last: now };
    buckets.set(key, b);
  }

  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);
  b.last = now;

  if (b.tokens < 1) return false;
  b.tokens -= 1;

  if (++calls % SWEEP_EVERY === 0) {
    const cutoff = now - (CAPACITY / REFILL_PER_SEC) * 1000;
    for (const [k, v] of buckets) if (v.last < cutoff) buckets.delete(k);
  }
  return true;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  verbose: process.env.VERBOSE === '1',
};
