#!/usr/bin/env node
// School OS — Learning Ledger integrity hash.
// Computes SHA-256(explanation + "|" + iso_timestamp), the value stored in the
// ledger's `Integrity hash` column at signing time. Re-running it later over the
// stored explanation + timestamp must reproduce the same hash; a mismatch means
// the explanation was edited after it was signed.
//
// Usage:
//   echo "<explanation>" | node tools/ledger-hash.mjs "<iso_timestamp>"
//   node tools/ledger-hash.mjs "<iso_timestamp>" "<explanation>"
//
// The timestamp must be the exact string stored in the ledger row.

import { createHash } from 'node:crypto';

const [tsArg, explArg] = process.argv.slice(2);

if (!tsArg) {
  console.error('Usage: node tools/ledger-hash.mjs "<iso_timestamp>" ["<explanation>"]');
  console.error('       (explanation may be piped on stdin instead of passed as an argument)');
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) return resolve('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

const explanation = explArg !== undefined ? explArg : (await readStdin()).replace(/\n$/, '');
if (!explanation) {
  console.error('No explanation provided (stdin empty and no argument given).');
  process.exit(1);
}

const hash = createHash('sha256').update(`${explanation}|${tsArg}`).digest('hex');
console.log(hash);
