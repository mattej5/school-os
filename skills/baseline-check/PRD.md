# PRD — `baseline-check` (School OS skill #5)

**Status:** spec, not built. Written 2026-07-25.
**One line:** Point it at work you shipped with AI; it measures how much of it you can still explain unaided, and gives you a number that moves.

---

## 1. The problem, stated honestly

Students who ship with AI report a specific fear, in their own words:

> *"I sit there with a lot of IDEs open, just switching between chats and barely understanding what I am doing."*
> *"whenever I was asked anything related to programming my thoughts would start to scramble themselves"*
> *"my code-reading muscles have completely atrophied"*

The fear is loud and well-attested. **The mechanism behind it is not.** Do not build on "AI erodes skills" — the strongest studies conflict (MIT n=54 has a published rebuttal; Fan/Gašević found no significant difference; two better-powered studies show AI *improving* unaided performance).

What survives replication is narrower and enough:

- **Bastani et al., PNAS (~1,000 students):** unguarded answer-delivery cut exam scores **17%**; a hint-only tutor did not (−0.4%, ns).

So the defensible claim, and the entire product thesis:

> **Nobody measures the gap between what a student can produce with AI and what they can explain without it. That gap is measurable, and measuring it is the intervention.**

## 2. What this is NOT

Hard constraints. Violating any of these is a failed build.

| Not | Because |
|---|---|
| Not a detector | It never judges whether AI was used. It assumes it was. |
| Not an integrity tool | The #1 post in r/csMajors last month re-labeled interview cheating as "proper interview preparation" (1,012 upvotes on that comment). A tool that moralizes gets rejected on arrival. |
| Not anti-AI | The student shipped with AI and that was correct. The tool is about what they retained, not what they should have done. |
| Not a grade | No pass/fail on the person. A score on an artifact, with drills attached. |
| Not institutional | No professor, no LMS, no submission. The student is the only user and the only audience. |

**Register:** the tool talks like a lifting coach, not a proctor. It never says "you should have," "you failed to," or "this is concerning."

## 3. User and trigger

**User:** a university CS student (or self-taught builder) who shipped something with heavy AI assistance and has an interview, an oral defense, or a nagging doubt.

**Trigger phrases:** "check my baseline", "do I actually understand this", "quiz me on my own code", "am I going to be able to explain this", "baseline check", or pointing the skill at a repo/PR/file.

## 4. The metric

**Baseline Score = passed probes / total probes**, over a specific artifact.

Name it exactly what it is: **explain-rate over your own artifact.** It does NOT measure whether the student could rewrite the code unaided. Do not label it, print it, or describe it as anything stronger. Overclaiming here is the single most likely way this ships dishonest.

Deeper mode (`--reconstruct`, optional, one probe site only): close the artifact, re-derive that one decision from the requirement. Slower, stronger signal, explicitly opt-in.

## 5. Probe design (the load-bearing part)

A bad probe set makes the whole tool noise. Probes target **decisions**, never trivia.

- Bad: "What does line 42 do?" (readable off the screen)
- Good: "Why a map here instead of a list?" (a decision with an alternative)

### Probe taxonomy — every run draws from at least three types

| Type | Form | Tests |
|---|---|---|
| **Why-this-not-that** | "You used X. What was the alternative and why did it lose?" | Design judgment |
| **Break-it** | "What input makes this fail?" | Boundary understanding |
| **Trace** | "Walk me through what happens on this exact input." | Mechanical grasp |
| **Blast radius** | "If I delete this, what else stops working?" | Structural model |
| **Provenance** | "Why does this exist at all? What forced it?" | Requirement memory |

### Selection rules

1. Prefer sites with a **visible alternative** (a choice was made).
2. Prefer sites that are **load-bearing** (removal breaks something).
3. Skip boilerplate, imports, config, generated files, and formatting.
4. Never reveal upcoming probes. One at a time, no lookahead.
5. Default 6 probes. `--quick` = 3, `--deep` = 10.

## 6. Scoring

Per probe, score three dimensions 0–2. Mirrors `shared/comprehension-gate.md` but adapted for code.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **Correctness** | Wrong | Partly right | Right |
| **Causality** | States *what*, not *why* | Gestures at why | Explains the actual mechanism |
| **Specificity** | Generic ("it's cleaner", "more efficient") | Some concrete detail | Names the specific thing in *this* artifact |

**Probe passes** iff total ≥ 4 **and** no dimension is 0.

**Specificity is the anti-fluency dimension.** A confident, well-written, generic answer must fail. This is the most common real failure mode and the eval weights it heaviest.

**Brevity is never penalized.** "Map because it's O(1) and this is in the request hot path" is a 2/2/2. Length is not a scoring input.

**Fairness constraint (hard):** score content only. Grammar, phrasing, idiom, and non-native English phrasing must not affect any dimension. Research on adjacent tooling shows strong writers and ESL students get systematically penalized by detection-flavored scoring; this tool must not reproduce that. There is a mandatory eval fixture for it.

**Temperature 0** for all scoring calls.

## 7. Output

Three parts, in this order, nothing else:

1. **The number.** `Baseline: 4/6 (67%)` plus prior run if one exists: `↑ from 3/6 two weeks ago`.
2. **The held / the gaps.** Which probe sites held, which didn't, one line each, factual.
3. **The drill list.** Weakest 2 sites, each with a specific thing to go learn or re-derive. Hands off to `weakness-tracker` if installed.

No paragraph of encouragement. No warning. No "consider whether you..."

## 8. Retention (the actual risk)

The honest read from research: students voice this fear constantly and **have never once asked for the cure**. Zero unprompted student complaints about AI answering too fast were found; that pain is a designer's projection. Demand is the open question, not the tech.

So the number must **move and be re-testable**:

- Re-running on the same artifact after drills is the core loop.
- Store runs so the delta is visible. Delta is the retention hook, not the score.
- Success metric for v1: **a student opens it twice.** Not stars, not installs.

## 9. Storage

**Deviation from `shared/learning-ledger.md`, deliberate:** that spec requires Notion. For a code tool aimed at students who will not configure a Notion integration to try something, that is fatal install friction.

- v1 writes `.school-os/baseline.jsonl` in the student's working directory (gitignored by the skill's own instruction).
- Reuses `tools/ledger-hash.mjs` unchanged for the integrity hash on each entry.
- Notion mirroring is optional and off by default.
- One JSON object per run: timestamp, artifact ref, probe list with per-dimension scores, total, hash.

## 10. Scope

**In:** the skill (`SKILL.md`), local JSONL storage, the eval harness and fixtures, README section, installer already globs `skills/*/` so no installer change needed.

**Out of v1:** Notion sync, web UI, multi-file repo crawling (v1 takes one file, one PR diff, or a pasted snippet), IDE integration, anything institutional.

**Shape:** weekend-sized. One skill file plus an eval. If it needs a service, the scope is wrong.

## 11. Known holes — state them, do not paper over them

1. **The student can paste probes into another AI.** Unfixable in v1 and the tool must not pretend otherwise. Partial mitigation: no probe lookahead, and follow-ups target the student's own wording, which generic pasted answers fail on Specificity. The README says this plainly — it is a self-imposed device and it works only for someone who wants it to.
2. **Explain-rate is not coding ability.** Named in §4. Never drifts.
3. **Probe quality is model-dependent.** Bad site selection produces a meaningless number. Eval covers it separately (§ eval E-2).
4. **n=1 prior evidence.** The only person who has run School OS for a semester is its author.

## 12. Definition of done

- [ ] `skills/baseline-check/SKILL.md` written, matching the frontmatter style of the other four skills
- [ ] Runs end to end on a real file with 6 probes
- [ ] Eval harness passes **≥10/12** fixtures (see `EVAL.md`)
- [ ] The three deterministic linters pass (no-moralize, score-arithmetic, drill-routing)
- [ ] Fairness fixture (F-9) passes — non-native phrasing scores identically to native phrasing on identical content
- [ ] Injection fixture (F-11) passes
- [ ] README table updated with the fifth skill
- [ ] No commit or push without the repo owner's explicit go
