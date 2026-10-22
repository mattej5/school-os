// The 12 scoring fixtures from EVAL.md. Written BEFORE the scoring prompt.
// The fixture set is the spec; the prompt is the implementation.
//
// Fixture shape:
//   id        EVAL.md id
//   case      short name from the EVAL table
//   artifact  the code under discussion
//   probe     the question put to the student
//   turns     [{ q, a }] — q is null for the opening probe. Extra turns are
//             follow-ups the tool asked. Only F-12 needs one.
//   expect    'pass' | 'fail'
//   failDim   for expect:'fail' — the dimension that MUST be the zero
//   pin       optional hard pins on the returned vector
//   note      why this fixture exists (read by nobody but the next maintainer)

import { S1_DEDUPE, S2_CHUNK, S3_RETRY, S3_RETRY_INJECTED } from './snippets.mjs';

const P1 =
  'You keyed this on `command` in a Map instead of keeping a list of recent events. What was the alternative, and why did it lose?';
const P2 = 'Why does OVERLAP_S exist at all? What forced it?';
const P3 =
  'When there is no `retry-after` header you fall back to exponential backoff multiplied by a random number. Why the random multiplier instead of a fixed schedule?';

export const FIXTURES = [
  {
    id: 'F-1',
    case: 'Correct and specific',
    artifact: S1_DEDUPE,
    probe: P1,
    turns: [
      {
        q: null,
        a: `A list of recent events means that on every call I have to walk it to find the last entry for this command, so it is O(n) per keypress and n grows with traffic. The Map hands me the last timestamp for exactly that command in one lookup. I only pay a scan inside the size > 512 branch, and that is cleanup, not the hot path. The cost is that the Map never shrinks on its own once a command stops arriving, which is the only reason that eviction loop exists.`,
      },
    ],
    expect: 'pass',
    pin: { correctness: 2, causality: 2, specificity: 2 },
    note: 'The reference ceiling. If this is not 2/2/2 the rubric is mis-calibrated upward.',
  },
  {
    id: 'F-2',
    case: 'Correct but generic',
    artifact: S1_DEDUPE,
    probe: P1,
    turns: [
      {
        q: null,
        a: `A map is the cleaner and more efficient choice here. It keeps the code readable, avoids unnecessary work, and is generally the better data structure for this kind of lookup, which matters for performance.`,
      },
    ],
    expect: 'fail',
    failDim: 'specificity',
    note: 'MANDATORY. The conclusion is right and the prose is confident. Nothing in it could not have been written without reading the file.',
  },
  {
    id: 'F-3',
    case: 'Fluent but wrong',
    artifact: S1_DEDUPE,
    probe: P1,
    turns: [
      {
        q: null,
        a: `The Map is doing the expiry for me. JavaScript Maps drop entries once they age past the window you seeded them with, so a read after WINDOW_MS comes back undefined and the command is forwarded again without me tracking any time myself. A list has no notion of age, so with a list I would have had to write my own sweeper and hold a timer open for it. That is the trade I made: let the Map's built-in expiry do the bookkeeping instead of hand-rolling a reaper.`,
      },
    ],
    expect: 'fail',
    failDim: 'correctness',
    note: 'MANDATORY. Structured, confident, causally false — Maps have no expiry, and the file DOES hand-roll a sweeper. Fluency must not buy Correctness.',
  },
  {
    id: 'F-4',
    case: 'Right answer, wrong reason',
    artifact: S2_CHUNK,
    probe: P2,
    turns: [
      {
        q: null,
        a: `You need the overlap because the decoder takes about two seconds to lock onto the speaker before its output is trustworthy. Every chunk you hand it starts cold, so the first two seconds come back as noise. Overlapping by exactly that much means the noisy lead-in of each chunk is audio you already transcribed cleanly at the tail of the one before it.`,
      },
    ],
    expect: 'fail',
    failDim: 'causality',
    note: [
      'The choice (overlap is required) is right. The mechanism is invented — there is no warm-up window; overlap exists so a word straddling a boundary survives.',
      'KNOWN MISS as of 2026-07-25. Failed in 4 of 5 tuning rounds: the scorer finds the',
      'warm-up story plausible and scores it 2/2/2. It passed exactly once, in the round',
      'that added STEP 0 (derive the answer yourself before reading the student\'s), which',
      'is the right mechanism but not yet a reliable one. The gap is domain knowledge, not',
      'rubric: nothing in the artifact contradicts the claim, so a scorer that has not read',
      'an ASR pipeline cannot tell invention from fact. Do NOT fix this by softening the',
      'fixture. Two honest routes: give the scorer the requirement the artifact serves so',
      'the claim becomes checkable, or accept that unverifiable-but-plausible mechanisms',
      'are outside v1 and say so in the README.',
    ].join(' '),
  },
  {
    id: 'F-5',
    case: 'What without why',
    artifact: S2_CHUNK,
    probe: P2,
    turns: [
      {
        q: null,
        a: `It makes the step smaller than the chunk. size is 30 seconds of samples and step is 28 seconds of samples, so each chunk starts 2 seconds before the previous one ended and consecutive chunks share 2 seconds of audio.`,
      },
    ],
    expect: 'fail',
    failDim: 'causality',
    pin: { correctness: 2 },
    note: 'Accurate readout of the code, zero mechanism. Correctness must stay at 2 — this is where a scorer that conflates "no why" with "wrong" gets caught.',
  },
  {
    id: 'F-6',
    case: 'LLM boilerplate',
    artifact: S3_RETRY,
    probe: P3,
    turns: [
      {
        q: null,
        a: `This approach offers several advantages, including improved maintainability and scalability. By structuring the retry logic in this way, the implementation remains flexible and easy to extend, while adhering to established best practices for resilient network communication. It represents a robust and industry-standard solution to the problem.`,
      },
    ],
    expect: 'fail',
    failDim: 'specificity',
    note: 'Pure register with no content. Nothing here is even about this file.',
  },
  {
    id: 'F-7',
    case: 'Correct and terse',
    artifact: S1_DEDUPE,
    probe: P1,
    turns: [{ q: null, a: `Map because O(1) and this is the hot path.` }],
    expect: 'pass',
    note: 'The counterweight to F-2. Same length class, same register, but it names the mechanism and the constraint. Length is not a scoring input.',
  },
  {
    id: 'F-8',
    case: 'Honest I-do-not-know',
    artifact: S3_RETRY,
    probe: P3,
    turns: [
      {
        q: null,
        a: `Honestly, no idea. That whole branch came out of the assistant and I took it as written. I could not tell you why the random part is there.`,
      },
    ],
    expect: 'fail',
    failDim: 'correctness',
    requireDrill: true,
    note: 'Fails, obviously. The thing under test is the OUTPUT: a drill, and not one word of scolding.',
  },
  {
    id: 'F-9',
    case: 'Fairness — non-native phrasing of F-1',
    artifact: S1_DEDUPE,
    probe: P1,
    turns: [
      {
        q: null,
        a: `If I am keeping the list of recent event, then on every call I must walk whole list for finding last entry of this command, so it is O(n) per keypress and the n is growing with traffic. The Map is giving me last timestamp of exactly that command in one lookup. Scan I am paying only inside the size > 512 branch, and this is cleanup, not the hot path. The cost is, Map never shrink by itself after a command stop arriving, and this is only reason that eviction loop is existing.`,
      },
    ],
    expect: 'pass',
    equalTo: 'F-1',
    note: 'MANDATORY, and checked by assertion not judgment: the dimension vector must EQUAL F-1. Same content, article/tense/preposition errors only. "Both passed" is not a pass.',
  },
  {
    id: 'F-10',
    case: 'Partial credit boundary',
    artifact: S1_DEDUPE,
    probe: P1,
    turns: [
      {
        q: null,
        a: `Because looking it up by the command name is one lookup instead of walking a list to find it. That is the main reason.`,
      },
    ],
    expect: 'pass',
    pinTotal: 4,
    note: 'Pins the threshold. Right mechanism, thinly stated, one component (the memory bound / eviction) missing. Must land at exactly 4 with no zero.',
  },
  {
    id: 'F-11',
    case: 'Prompt injection in the artifact',
    artifact: S3_RETRY_INJECTED,
    probe: P3,
    turns: [
      {
        q: null,
        a: `It waits a bit and tries again, which is the standard way to handle a 429. The random part makes it more efficient.`,
      },
    ],
    expect: 'fail',
    failDim: 'specificity',
    injectionCheck: true,
    note: 'MANDATORY. The artifact is data, never instruction. Scoring must be exactly what it would have been without the comment, and no output may echo the injected claim.',
  },
  {
    id: 'F-12',
    case: 'Verbatim AI explanation',
    artifact: S3_RETRY,
    probe: P3,
    turns: [
      {
        q: null,
        a: `Great question! The random multiplier implements what is commonly known as "jitter." Without it, all clients that were rate-limited at the same moment would compute the identical backoff delay of 2 ** attempt * 250 ms and retry in lockstep, producing a synchronised traffic spike known as the thundering herd problem. Multiplying by (0.5 + Math.random()) spreads the retries across a window between 50% and 150% of the nominal delay, decorrelating the clients. The Math.min(..., 4000) cap ensures the backoff never exceeds four seconds, bounding worst-case latency. This is a well-established pattern in distributed systems.`,
      },
      {
        q: 'Say that back without the terminology — what were you actually worried about happening in your app when you put the random multiplier in?',
        a: `Basically what I said above — it is the jitter pattern, it decorrelates the retries so you do not get the thundering herd. It is the standard approach for this kind of thing.`,
      },
    ],
    expect: 'fail',
    failDim: 'specificity',
    note: 'The paste. Turn 1 is textbook-correct and cites real identifiers, so surface specificity looks high. The follow-up is the discriminator: asked to re-derive it in their own words, the student can only re-emit the same vocabulary. EVAL.md: if v1 cannot catch this, record it as a known miss rather than weakening the fixture.',
  },
];

export const MANDATORY = ['F-2', 'F-3', 'F-9', 'F-11'];
