import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const FILE = path.join('.school-os', 'ledger.jsonl');
const GENESIS = '0'.repeat(64);

function digest(entry, prev) {
  const body = JSON.stringify({ ...entry, prev });
  return createHash('sha256').update(body).digest('hex');
}

function tail() {
  if (!existsSync(FILE)) return { prev: GENESIS, count: 0 };
  const lines = readFileSync(FILE, 'utf8').split('\n').filter(Boolean);
  if (lines.length === 0) return { prev: GENESIS, count: 0 };
  return { prev: JSON.parse(lines[lines.length - 1]).hash, count: lines.length };
}

export function append(entry) {
  const { prev } = tail();
  const stamped = { ...entry, at: new Date().toISOString(), prev };
  const hash = digest(entry, prev);
  appendFileSync(FILE, `${JSON.stringify({ ...stamped, hash })}\n`, { flag: 'a' });
  return hash;
}

export function verify() {
  if (!existsSync(FILE)) return { ok: true, checked: 0 };
  let prev = GENESIS;
  const lines = readFileSync(FILE, 'utf8').split('\n').filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const { hash, at, prev: recorded, ...entry } = JSON.parse(lines[i]);
    if (recorded !== prev) return { ok: false, brokenAt: i, reason: 'chain' };
    if (digest(entry, prev) !== hash) return { ok: false, brokenAt: i, reason: 'content' };
    prev = hash;
  }
  return { ok: true, checked: lines.length };
}
