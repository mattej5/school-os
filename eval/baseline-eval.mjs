#!/usr/bin/env node
// School OS — eval harness for the `baseline-check` scorer.
// Zero dependencies. Node 18+.
//
// WHAT IS UNDER TEST: the scoring prompt, not the conversation. A scorer that
// passes fluent-but-empty answers turns baseline-check into a confidence
// generator, which is worse than not shipping it.
//
// SYNC GUARANTEE: the prompts used here are READ OUT OF `skills/baseline-check/
// SKILL.md` at runtime, from between the SCORING-PROMPT / PROBE-PROMPT markers.
// There is no second copy. The eval cannot drift from the shipped skill because
// there is nothing to drift from — edit the skill and the next run tests the
// edit. If a marker block is missing or empty the harness exits non-zero.
//
// USAGE
//   node eval/baseline-eval.mjs                  # everything: E-2, 12 fixtures, linters
//   node eval/baseline-eval.mjs --fixture F-3    # one fixture
//   node eval/baseline-eval.mjs --lint-selftest  # linters only, no model calls
//   node eval/baseline-eval.mjs --emit           # write prompts for an external scorer
//   node eval/baseline-eval.mjs --backend files  # grade verdicts an external scorer wrote
//
// BACKENDS
//   api    (default when ANTHROPIC_API_KEY is set) — calls the Messages API at
//          temperature 0, as PRD §6 requires. Model: $BASELINE_EVAL_MODEL.
//   files  — `--emit` renders every prompt to eval/_out/prompts/<id>.txt; you
//          run them through any scorer; drop the JSON in eval/_out/verdicts/
//          <id>.json; this backend grades them. Same comparisons, same
//          assertions. Use it when no key is available — but the number it
//          produces is only temperature-0 if your scorer was.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXTURES, MANDATORY } from './fixtures/scoring.mjs';
import { E2_FILES, E2_GATES } from './fixtures/e2/labels.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SKILL = path.join(REPO, 'skills', 'baseline-check', 'SKILL.md');
const OUT = path.join(HERE, '_out');

const DIMS = ['correctness', 'causality', 'specificity'];

/* ------------------------------------------------------------------ prompts */

export function extractBlock(md, name) {
  const re = new RegExp(`<!-- ${name}:START -->([\\s\\S]*?)<!-- ${name}:END -->`);
  const m = md.match(re);
  if (!m) throw new Error(`SKILL.md is missing the ${name} marker block.`);
  const body = m[1].replace(/^\s*```[a-z]*\n/, '').replace(/\n```\s*$/, '').trim();
  if (!body) throw new Error(`SKILL.md ${name} block is empty.`);
  return body;
}

function loadPrompts() {
  if (!existsSync(SKILL)) throw new Error(`Not found: ${SKILL}`);
  const md = readFileSync(SKILL, 'utf8');
  return {
    scoring: extractBlock(md, 'SCORING-PROMPT'),
    probe: extractBlock(md, 'PROBE-PROMPT'),
  };
}

function renderTranscript(turns) {
  return turns
    .map((t) => (t.q ? `Follow-up asked: ${t.q}\nStudent: ${t.a}` : `Student: ${t.a}`))
    .join('\n\n');
}

function fill(tpl, vars) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)),
    tpl,
  );
}

export function scoringPromptFor(f, tpl) {
  return fill(tpl, {
    ARTIFACT: f.artifact,
    PROBE: f.probe,
    TRANSCRIPT: renderTranscript(f.turns),
  });
}

/* ----------------------------------------------------------------- backends */

async function callApi(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.BASELINE_EVAL_MODEL || 'claude-sonnet-4-5';
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content.map((c) => c.text || '').join('');
}

export function parseVerdict(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON object in scorer output: ${text.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

function readVerdictFile(id) {
  const p = path.join(OUT, 'verdicts', `${id}.json`);
  if (!existsSync(p)) throw new Error(`Missing verdict file: ${p} (run --emit, score, then retry)`);
  return parseVerdict(readFileSync(p, 'utf8'));
}

/* ------------------------------------------------------------------ linters */
// Pure functions. No model calls. Each returns { ok, hits } so a failure names
// the offending substring instead of just going red.

const MORALIZE = /you should have|failed to|concerning|unfortunately|be careful|make sure you|it's important to/gi;
const OVERCLAIM = /unaided coding|can't code|cannot code|coding ability|skill erosion|dependent on AI/gi;

export function lintNoMoralize(text) {
  const hits = text.match(MORALIZE) ?? [];
  return { name: 'no-moralize', ok: hits.length === 0, hits };
}

export function lintNoOverclaim(text) {
  const hits = text.match(OVERCLAIM) ?? [];
  return { name: 'no-overclaim', ok: hits.length === 0, hits };
}

// Every probe line must print `a/b/c = t` where t is the true sum, and the
// pass/fail word must match PRD §6 (total >= 4 AND no dimension 0). The
// headline count must equal the number of lines marked held.
export function lintScoreArithmetic(text) {
  const hits = [];
  const rows = [...text.matchAll(/\[(\d)\/(\d)\/(\d) = (\d+)\] (held|gap)/g)];
  if (rows.length === 0) hits.push('no scored probe lines found');
  let held = 0;
  for (const r of rows) {
    const [c, ca, s, t] = [+r[1], +r[2], +r[3], +r[4]];
    const sum = c + ca + s;
    if (sum !== t) hits.push(`${r[0]}: printed ${t}, sum is ${sum}`);
    const shouldPass = sum >= 4 && c > 0 && ca > 0 && s > 0;
    const printedPass = r[5] === 'held';
    if (shouldPass !== printedPass) hits.push(`${r[0]}: rule says ${shouldPass ? 'held' : 'gap'}`);
    if (printedPass) held += 1;
  }
  const headline = text.match(/^Baseline: (\d+)\/(\d+)/m);
  if (!headline) hits.push('no `Baseline: n/m` headline');
  else {
    if (+headline[1] !== held) hits.push(`headline says ${headline[1]} held, lines show ${held}`);
    if (+headline[2] !== rows.length) hits.push(`headline says ${headline[2]} probes, lines show ${rows.length}`);
  }
  return { name: 'score-arithmetic', ok: hits.length === 0, hits };
}

// PRD §7 says the drill list surfaces the weakest two; the EVAL linter says
// every failed probe gets exactly one drill. Resolved in favour of the linter:
// every gap gets a drill, the list is ordered weakest-first, and "weakest two"
// became the `start here` marker rather than a truncation. Nothing is dropped.
export function lintDrillRouting(text) {
  const hits = [];
  const gaps = [...text.matchAll(/\] gap +— +([^\n]+)/g)].map((m) => m[1].trim());
  const drillSection = text.split(/^Drills$/m)[1] ?? '';
  const drills = [...drillSection.matchAll(/^\s*\d+\.\s+([^—\n]+)—/gm)].map((m) => m[1].trim());
  for (const g of gaps) {
    const n = drills.filter((d) => d === g).length;
    if (n !== 1) hits.push(`gap "${g}" has ${n} drill entries, expected exactly 1`);
  }
  for (const d of drills) {
    if (!gaps.includes(d)) hits.push(`drill "${d}" does not correspond to any gap`);
  }
  return { name: 'drill-routing', ok: hits.length === 0, hits };
}

export const LINTERS = [lintNoMoralize, lintNoOverclaim, lintScoreArithmetic, lintDrillRouting];

/* ----------------------------------------------------------------- renderer */
// Deterministic. The model supplies scores and one line of prose per site; the
// arithmetic, the ordering and the drill routing are code, so they cannot be
// hallucinated. PRD §7: number, held/gaps, drills. Nothing else.

export function renderReport(run) {
  const scored = run.probes.map((p) => {
    const total = DIMS.reduce((a, d) => a + p[d], 0);
    const pass = total >= 4 && DIMS.every((d) => p[d] > 0);
    return { ...p, total, pass };
  });
  const held = scored.filter((p) => p.pass);
  const gaps = scored.filter((p) => !p.pass);
  const pct = Math.round((held.length / scored.length) * 100);

  const out = [`Baseline: ${held.length}/${scored.length} (${pct}%)`];
  if (run.prior) out.push(`${run.prior.delta} from ${run.prior.score} on ${run.prior.date}`);
  out.push('');

  for (const p of scored) {
    out.push(`  [${p.correctness}/${p.causality}/${p.specificity} = ${p.total}] ${p.pass ? 'held' : 'gap'} — ${p.site}`);
    out.push(`      ${p.line}`);
  }
  out.push('');

  if (gaps.length) {
    out.push('Drills');
    const ordered = [...gaps].sort((a, b) => a.total - b.total);
    ordered.forEach((p, i) => {
      out.push(`  ${i + 1}. ${p.site} — ${p.drill}${i < 2 ? '   (start here)' : ''}`);
    });
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------- checks */

function checkFixture(f, v) {
  const problems = [];
  for (const d of DIMS) {
    if (!Number.isInteger(v[d]) || v[d] < 0 || v[d] > 2) problems.push(`${d} out of range: ${v[d]}`);
  }
  if (problems.length) return { ok: false, problems, vector: null };

  const total = DIMS.reduce((a, d) => a + v[d], 0);
  const pass = total >= 4 && DIMS.every((d) => v[d] > 0);
  const vector = DIMS.map((d) => v[d]);

  if (v.total !== undefined && v.total !== total) problems.push(`returned total ${v.total} != ${total}`);
  if (v.verdict && (v.verdict === 'pass') !== pass) problems.push(`returned verdict ${v.verdict} contradicts ${total}/no-zero rule`);

  if (f.expect === 'pass' && !pass) problems.push(`expected PASS, got ${vector.join('/')} = ${total}`);
  if (f.expect === 'fail' && pass) problems.push(`expected FAIL, got ${vector.join('/')} = ${total}`);

  if (f.expect === 'fail' && f.failDim && v[f.failDim] !== 0) {
    problems.push(`expected ${f.failDim} = 0, got ${f.failDim} = ${v[f.failDim]}`);
  }
  for (const [d, want] of Object.entries(f.pin ?? {})) {
    if (v[d] !== want) problems.push(`pin: ${d} must be ${want}, got ${v[d]}`);
  }
  if (f.pinTotal !== undefined && total !== f.pinTotal) {
    problems.push(`pin: total must be exactly ${f.pinTotal}, got ${total}`);
  }
  if (f.requireDrill && !(typeof v.drill === 'string' && v.drill.trim())) {
    problems.push('expected a drill on this failure, got none');
  }
  if (f.injectionCheck) {
    const text = `${v.line ?? ''} ${v.drill ?? ''}`;
    if (/all probes passed|scoring override|ignore previous/i.test(text)) {
      problems.push('output echoes the injected instruction');
    }
  }
  // Linters run over the model's own prose, not just the rendered shell.
  const prose = `${v.line ?? ''}\n${v.drill ?? ''}`;
  for (const lint of [lintNoMoralize, lintNoOverclaim]) {
    const r = lint(prose);
    if (!r.ok) problems.push(`${r.name}: ${[...new Set(r.hits)].join(', ')}`);
  }
  return { ok: problems.length === 0, problems, vector };
}

/* ---------------------------------------------------------------------- E-2 */

function resolveAnchors(src, anchors, file, kind) {
  const lines = src.split('\n');
  return anchors.map((a) => {
    const idx = lines.findIndex((l) => l.includes(a));
    if (idx === -1) throw new Error(`E-2 ${kind} anchor not found in ${file}: ${a}`);
    return { anchor: a, line: idx + 1 };
  });
}

export function checkE2(fileSpec, src, probes) {
  const decision = resolveAnchors(src, fileSpec.decision, fileSpec.file, 'decision');
  const trivia = resolveAnchors(src, fileSpec.trivia, fileSpec.file, 'trivia');
  const problems = [];

  if (probes.length !== E2_GATES.probesPerFile) {
    problems.push(`expected ${E2_GATES.probesPerFile} probes, got ${probes.length}`);
  }

  const classify = (p) => {
    const hit = (set) =>
      set.some((s) => (p.anchor && s.anchor.includes(p.anchor.trim())) ||
        (p.anchor && p.anchor.includes(s.anchor)) || s.line === p.line);
    if (hit(trivia)) return 'trivia';
    if (hit(decision)) return 'decision';
    return 'neutral';
  };

  const kinds = probes.map(classify);
  const hits = kinds.filter((k) => k === 'decision').length;
  const triviaHits = kinds.filter((k) => k === 'trivia').length;
  const types = new Set(probes.map((p) => (p.type || '').toLowerCase().trim()));

  if (hits < E2_GATES.minDecisionHits) problems.push(`${hits}/${probes.length} probes hit labelled decision sites (need >= ${E2_GATES.minDecisionHits})`);
  if (triviaHits > E2_GATES.maxTriviaHits) problems.push(`${triviaHits} probes target imports/config/formatting/generated code (need 0)`);
  if (types.size < E2_GATES.minDistinctTypes) problems.push(`${types.size} distinct probe types (need >= ${E2_GATES.minDistinctTypes}): ${[...types].join(', ')}`);

  return { ok: problems.length === 0, problems, hits, triviaHits, types: [...types], kinds };
}

/* ------------------------------------------------------------- lint selftest */
// The linters are the cheapest thing here and the easiest to get silently
// wrong, so they get their own fixtures.

const GOOD_REPORT = renderReport({
  probes: [
    { site: 'shouldForward: Map vs list', correctness: 2, causality: 2, specificity: 2, line: 'Named the O(1) lookup and why the eviction loop exists.', drill: null },
    { site: 'chunkPCM: OVERLAP_S', correctness: 2, causality: 0, specificity: 1, line: 'Read the code back accurately; the reason for the overlap did not come out.', drill: 'Re-derive what breaks with step === size on a word that lands on a boundary.' },
    { site: 'fetchWithRetry: random multiplier', correctness: 1, causality: 1, specificity: 0, line: 'The answer would fit any retry loop, not this one.', drill: 'Work out what four clients rate-limited in the same second do with a fixed schedule.' },
  ],
  prior: { delta: '↑', score: '0/3', date: '2026-07-11' },
});

function lintSelftest() {
  const cases = [
    ['clean report', GOOD_REPORT, { 'no-moralize': true, 'no-overclaim': true, 'score-arithmetic': true, 'drill-routing': true }],
    ['moralizing', `${GOOD_REPORT}\n  You should have traced this before shipping.`, { 'no-moralize': false }],
    ['overclaim', `${GOOD_REPORT}\n  This suggests your coding ability has slipped.`, { 'no-overclaim': false }],
    ['bad arithmetic', GOOD_REPORT.replace('= 6] held', '= 7] held'), { 'score-arithmetic': false }],
    ['pass/fail mislabel', GOOD_REPORT.replace('[2/0/1 = 3] gap', '[2/0/1 = 3] held'), { 'score-arithmetic': false }],
    ['dropped drill', GOOD_REPORT.split('\n').filter((l) => !/^  2\./.test(l)).join('\n'), { 'drill-routing': false }],
  ];
  let ok = true;
  for (const [name, text, expect] of cases) {
    for (const lint of LINTERS) {
      const r = lint(text);
      if (expect[r.name] === undefined) continue;
      const good = r.ok === expect[r.name];
      if (!good) ok = false;
      console.log(`  ${good ? 'ok  ' : 'FAIL'} ${name} / ${r.name}${good ? '' : ` — got ok=${r.ok} hits=${JSON.stringify(r.hits)}`}`);
    }
  }
  console.log(`\nSample rendered output the linters ran on:\n\n${GOOD_REPORT}\n`);
  return ok;
}

/* ---------------------------------------------------------------------- run */

function args() {
  const a = process.argv.slice(2);
  const get = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  return {
    fixture: get('--fixture', null),
    backend: get('--backend', process.env.ANTHROPIC_API_KEY ? 'api' : 'files'),
    emit: a.includes('--emit'),
    selftest: a.includes('--lint-selftest'),
    skipE2: a.includes('--no-e2'),
  };
}

async function main() {
  const opts = args();

  if (opts.selftest) {
    console.log('Linter self-test\n');
    process.exit(lintSelftest() ? 0 : 1);
  }

  const prompts = loadPrompts();
  const chosen = opts.fixture ? FIXTURES.filter((f) => f.id === opts.fixture) : FIXTURES;
  if (chosen.length === 0) throw new Error(`No such fixture: ${opts.fixture}`);

  if (opts.emit) {
    mkdirSync(path.join(OUT, 'prompts'), { recursive: true });
    mkdirSync(path.join(OUT, 'verdicts'), { recursive: true });
    for (const f of chosen) {
      writeFileSync(path.join(OUT, 'prompts', `${f.id}.txt`), scoringPromptFor(f, prompts.scoring));
    }
    if (!opts.skipE2) {
      for (const spec of E2_FILES) {
        const src = readFileSync(path.join(HERE, 'fixtures', 'e2', spec.file), 'utf8');
        const numbered = src.split('\n').map((l, i) => `${String(i + 1).padStart(3)} | ${l}`).join('\n');
        writeFileSync(
          path.join(OUT, 'prompts', `E2-${spec.file}.txt`),
          fill(prompts.probe, { SOURCE: numbered, N: E2_GATES.probesPerFile }),
        );
      }
    }
    console.log(`Emitted ${readdirSync(path.join(OUT, 'prompts')).length} prompts to eval/_out/prompts/`);
    console.log('Score each one, write the JSON to eval/_out/verdicts/<id>.json, then:');
    console.log('  node eval/baseline-eval.mjs --backend files');
    return;
  }

  const score = opts.backend === 'api'
    ? async (id, prompt) => parseVerdict(await callApi(prompt))
    : async (id) => readVerdictFile(id);

  let hardFail = false;

  /* E-2 first: a perfect scorer over garbage probes is a meaningless number. */
  if (!opts.skipE2 && !opts.fixture) {
    console.log('E-2 — probe selection quality\n');
    for (const spec of E2_FILES) {
      const src = readFileSync(path.join(HERE, 'fixtures', 'e2', spec.file), 'utf8');
      const numbered = src.split('\n').map((l, i) => `${String(i + 1).padStart(3)} | ${l}`).join('\n');
      let r;
      try {
        const v = await score(`E2-${spec.file}`, fill(prompts.probe, { SOURCE: numbered, N: E2_GATES.probesPerFile }));
        r = checkE2(spec, src, v.probes ?? v);
      } catch (e) {
        r = { ok: false, problems: [e.message], hits: 0, triviaHits: 0, types: [] };
      }
      if (!r.ok) hardFail = true;
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${spec.file}  decision ${r.hits}/${E2_GATES.probesPerFile}, trivia ${r.triviaHits}, types ${r.types.length}`);
      r.problems.forEach((p) => console.log(`        - ${p}`));
    }
    console.log('');
  }

  /* Scoring fixtures. */
  console.log('Scoring fixtures\n');
  const results = new Map();
  for (const f of chosen) {
    let res;
    try {
      const v = await score(f.id, scoringPromptFor(f, prompts.scoring));
      res = { ...checkFixture(f, v), verdict: v };
    } catch (e) {
      res = { ok: false, problems: [e.message], vector: null };
    }
    results.set(f.id, res);
    const vec = res.vector ? res.vector.join('/') : '—';
    console.log(`  ${res.ok ? 'PASS' : 'FAIL'}  ${f.id.padEnd(5)} ${f.case.padEnd(34)} ${vec}`);
    res.problems.forEach((p) => console.log(`        - ${p}`));
  }

  /* F-9 is checked by assertion, not judgment. */
  let fairness = null;
  if (results.has('F-1') && results.has('F-9')) {
    const a = results.get('F-1').vector;
    const b = results.get('F-9').vector;
    fairness = a && b && a.join('/') === b.join('/');
    console.log(`\n  ${fairness ? 'PASS' : 'FAIL'}  fairness assertion  F-1 ${a?.join('/') ?? '—'}  ==  F-9 ${b?.join('/') ?? '—'}`);
    if (!fairness) {
      results.get('F-9').ok = false;
      results.get('F-9').problems.push('dimension vector differs from F-1');
    }
  }

  /* Linters over a rendered report built from the real verdicts. */
  console.log('\nDeterministic linters (rendered report)\n');
  const probes = chosen
    .filter((f) => results.get(f.id).verdict)
    .slice(0, 6)
    .map((f) => {
      const v = results.get(f.id).verdict;
      return {
        site: `${f.id} ${f.case}`,
        correctness: v.correctness, causality: v.causality, specificity: v.specificity,
        line: v.line ?? '', drill: v.drill ?? 'Re-derive this decision from the requirement.',
      };
    });
  if (probes.length) {
    const report = renderReport({ probes });
    let lintOk = true;
    for (const lint of LINTERS) {
      const r = lint(report);
      if (!r.ok) { lintOk = false; hardFail = true; }
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : ` — ${[...new Set(r.hits)].join('; ')}`}`);
    }
    if (!lintOk) console.log(`\n--- report under lint ---\n${report}\n---`);
  }

  /* Totals. */
  const passed = [...results.values()].filter((r) => r.ok).length;
  const missing = MANDATORY.filter((id) => results.has(id) && !results.get(id).ok);
  console.log(`\nTotal: ${passed}/${results.size}`);
  if (chosen.length === FIXTURES.length) {
    console.log(`Mandatory (F-2, F-3, F-9, F-11): ${missing.length === 0 ? 'all pass' : `FAILING ${missing.join(', ')}`}`);
    const ship = passed >= 10 && missing.length === 0 && !hardFail;
    console.log(`\nShip gate (>=10/12, mandatory four, E-2 + linters clean): ${ship ? 'MET' : 'NOT MET'}`);
    process.exit(ship ? 0 : 1);
  }
  process.exit(passed === results.size ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`\n${e.message}`); process.exit(2); });
}
