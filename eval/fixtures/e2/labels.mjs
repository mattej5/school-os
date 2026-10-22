// E-2 ground truth. Sites are addressed by an anchor substring, not a line
// number, so editing a fixture file above a site does not silently re-point a
// label. The harness resolves each anchor to its line at load time and fails
// loudly if an anchor no longer matches exactly one line.
//
// decision — a choice with a visible alternative and something that breaks if
//            you remove it. Legitimate probe targets.
// trivia   — imports, config, formatting, generated banners. PRD §5 rule 3
//            says never probe these; E-2 allows zero.
// Anything unlisted is neutral: it neither earns credit nor trips the trivia
// rule. Tuning constants live here on purpose — probing `CAPACITY = 20` is not
// wrong, it is just not evidence the selector found a decision.

export const E2_FILES = [
  {
    file: 'a-token-bucket.js',
    decision: [
      // Added after round 3 for the same reason as the c- file below: process-local
      // Map vs a shared store is a choice with a visible alternative, and it is what
      // breaks the moment there is a second instance. Under-labelled, not mis-scored.
      'const buckets = new Map();',
      "const ip = req.headers['x-forwarded-for']",
      "createHash('sha256').update(ip).digest('hex').slice(0, 16)",
      'b = { tokens: CAPACITY, last: now };',
      'b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);',
      'if (b.tokens < 1) return false;',
      'if (++calls % SWEEP_EVERY === 0)',
      'const cutoff = now - (CAPACITY / REFILL_PER_SEC) * 1000;',
    ],
    trivia: [
      '/* eslint-disable no-console */',
      '// @generated banner kept from the scaffold',
      "import { createHash } from 'node:crypto';",
      "import process from 'node:process';",
      'export const config = {',
      "port: Number(process.env.PORT ?? 3000),",
      "verbose: process.env.VERBOSE === '1',",
    ],
  },
  {
    file: 'b-use-live-query.js',
    decision: [
      'if (term.trim().length < 2) {',
      'const mine = ++seq.current;',
      'const ctrl = new AbortController();',
      'const t = setTimeout(async () => {',
      'if (mine !== seq.current) return;',
      'setRows(z.array(Row).parse(raw).sort((a, b) => b.at - a.at));',
      "if (e.name !== 'AbortError') setError(e);",
      'ctrl.abort();',
      '}, [term, pageSize]);',
    ],
    trivia: [
      "import { useEffect, useRef, useState } from 'react';",
      "import { z } from 'zod';",
    ],
  },
  {
    file: 'c-ledger-append.js',
    decision: [
      "const GENESIS = '0'.repeat(64);",
      // Added after round 2, when the selector probed both and the harness scored
      // them neutral. Judged against PRD §5 rule 1+2, not against the score:
      // "no file yet" could equally have thrown or created the file, and taking
      // the chain tip from the last line could equally have been a full replay or
      // a separately stored tip. Both are choices, both are load-bearing for
      // append(). The ground truth was incomplete; the >=5/6 bar did not move.
      'if (!existsSync(FILE)) return { prev: GENESIS, count: 0 };',
      'return { prev: JSON.parse(lines[lines.length - 1]).hash, count: lines.length };',
      'const body = JSON.stringify({ ...entry, prev });',
      "readFileSync(FILE, 'utf8').split('\\n').filter(Boolean)",
      'const hash = digest(entry, prev);',
      "appendFileSync(FILE, `${JSON.stringify({ ...stamped, hash })}\\n`, { flag: 'a' });",
      'const { hash, at, prev: recorded, ...entry } = JSON.parse(lines[i]);',
      "if (recorded !== prev) return { ok: false, brokenAt: i, reason: 'chain' };",
      'if (digest(entry, prev) !== hash)',
    ],
    trivia: [
      "import { appendFileSync, readFileSync, existsSync } from 'node:fs';",
      "import { createHash } from 'node:crypto';",
      "import path from 'node:path';",
      "const FILE = path.join('.school-os', 'ledger.jsonl');",
    ],
  },
];

export const E2_GATES = {
  probesPerFile: 6,
  minDecisionHits: 5,
  maxTriviaHits: 0,
  minDistinctTypes: 3,
};
