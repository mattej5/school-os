# School OS — Proposal

*A collection of skills and workflows that streamline the effort around a course while guaranteeing the learning still happens — and proving it did.*

**Author:** Vin Jones
**Date:** June 22, 2026
**Status:** Draft for approval (proposal first, then build)

---

## The one-line thesis

Universities are spending enormous energy trying to keep students from using AI. That's the wrong fight. The right one is teaching students *how* to use AI so the learning stays genuine — and giving them a way to prove it. School OS is the system that does that.

---

## The problem with the current fight

The standard institutional response to AI is detection, restriction, and suspicion: lockdown browsers, AI-detectors, honor-code threats. This treats every use of AI as cheating-in-waiting. It fails on two fronts. It's technically losing — detectors are unreliable and students route around them. And it's pedagogically backwards — it forbids the single most powerful tutor ever built instead of teaching students to use it well.

The unstated assumption is a false binary: either the student does everything unaided, or the AI does it for them. But that's not how a good tutor, a good study group, or a good accommodation works. There is a large, legitimate middle — and no one has built the system that lives there *on purpose*.

---

## The insight: you already built the prototype

Across an entire semester of an intro marketing course, you and I unintentionally ran a working prototype of this system. Reviewing the sessions, the same handful of workflows recurred, and the best of them were unmistakably *learning*, not *cheating*:

- **Socratic decomposition.** On the "Wow Factor Focus Group" assignment, you said "I don't know how to bring this down further for me," and the session kept breaking the question into smaller pieces — an analogy about one loud person dominating a group — until you could explain Six Hats parallel thinking back in your own words. *Then* it drafted the answer from your articulation. You did the thinking; the tool removed the friction.
- **Adaptive active recall.** The Lesson 12/15 quiz sessions ran escalating rounds of five questions, explained every miss (Rogers' Five Factors, the "So What?" test), and only advanced to a 10-question practice exam after a readiness threshold — "two clean 80% rounds back to back, you're there."
- **Your-words drafting.** On the channels/intermediaries study guide, you supplied the concepts (breaking bulk, the potato farmer, the four utilities); the session corrected misconceptions, then polished *your* content into the required format — two paragraphs, no em dashes.
- **Cross-session memory.** Before the midterm, the system pulled your previously-missed questions from Notion, found the pattern (disposable vs. discretionary income, AMA norms), and built targeted practice around exactly those weak spots.
- **Logistics and voice.** Weekly checklists, due-date tracking, a discussion-board reply where you said "interview me" before writing a word, and a TA email drafted in your own voice when the testing-center deadline slipped.

The components already exist as habits. School OS is the act of naming them, giving them rules, and making them repeatable for any student in any course.

---

## The ethical spine

Everything in School OS is built on one principle:

> **AI may carry the load an assignment is *not* testing. The student must carry the load it *is* testing.**

This isn't a vibe — it's operational. Every assignment exists to exercise a specific skill: recall of a framework, application of a concept to a new case, synthesis of an argument, the writing itself. School OS's job is to identify that assessed skill, protect it, and offload only the incidental friction around it (formatting, logistics, reorganizing, looking up a definition you've already learned).

Two established ideas make this defensible rather than self-serving:

- **Learning accommodations.** A legitimate accommodation removes a barrier *irrelevant* to the skill being assessed — extra time, a reader, speech-to-text — without lowering the standard of the skill itself. It never does the thinking. School OS generalizes the accommodation model to every student.
- **The Zone of Proximal Development.** A tutor helps you do what you can't *yet* do alone, then withdraws support as you internalize it. That is precisely the "bring it down further → now say it back → now you've got it" arc from your sessions.

**The plain-language version, for students and professors:** *The system will never give you anything you can't explain in your own words.* If you can explain it, you learned it. If you can't, the system won't hand it over.

This also reframes the conversation with institutions. The question stops being "did a student use AI?" (unanswerable, adversarial) and becomes "did the student exercise the assessed skill?" (answerable, and improvable).

### Where the line actually bites

Being honest about the prototype: most of what we did was clean, but two patterns sit on the line and need guardrails.

1. **"Suggest some examples to speed this up."** When you picked Coke / KitchenAid / Lamborghini from a list I generated, that was fine *if* the assignment tested whether you understood intensive/selective/exclusive distribution — and risky *if* it tested whether you could generate and justify examples yourself. School OS should ask which it is before offering.
2. **Drafting before articulation.** The integrity-preserving version always drafts *after* you've explained the concept, never before. The order is the whole ballgame.

These become the system's hard rules, not afterthoughts.

---

## Architecture

School OS is four student-facing skills, one shared primitive they all reuse, and one record that ties it together.

### The shared primitive: the Comprehension Gate

A single reusable mechanism: before the system releases any polished/submittable output, the student must explain the idea in their own words and have it pass. This is the "say it back to me" move from your tutoring sessions, extracted into a component every other skill plugs into. It's what makes the integrity principle enforceable rather than aspirational.

**The gate is algorithmic and agent-signed — never self-attested.** The student cannot let themselves through by clicking "I understand." Instead, the agent scores the student's own-words explanation against a rubric for the assessed skill (does it cover the key components, get the relationships right, apply correctly to a novel case, avoid major misconceptions?) and clears a defined threshold — the same readiness logic as the quiz engine's "two clean rounds," applied to comprehension. Only the agent running that algorithm can sign the approval. This is what gives the gate teeth: the only path through is to actually produce a passing explanation, which *is* the learning.

**It hard-blocks the deliverable, never the help.** The block applies only to releasing polished/submittable output. Tutoring, hints, decomposition, and "bring it down further" stay open at all times — the student is never stuck, only ever one good explanation away from the draft. This keeps incentives aligned: a soft warning trains students to click past it, and blocking *help* would push them back to an unsupervised chatbot. Blocking only the artifact avoids both.

A student can still feed the gate a strong explanation they don't fully believe — but "explain it well enough to pass the rubric" is a far higher bar than "click OK," and the attempt itself is the cognitive work the assignment exists to exercise.

### The four skills (v1)

**1. Socratic Tutor** — *the genuine-learning core.*
Decomposes a concept until the student can articulate it: simpler question → analogy → "say it back" → confirm. Refuses to give the answer; gives the next rung of the ladder. This is the skill the Comprehension Gate is born from, which is why it's the foundation.
*Guardrail:* never states the conclusion the student is trying to reach; only narrows the gap.

**2. Adaptive Quiz + Readiness Engine** — *the most distinctive, most demoable.*
Escalating rounds of five, mixed conceptual + applied, explanation on every miss, and a readiness gate that won't declare you ready until you clear a threshold across consecutive rounds. Ends with a full-length practice exam.
*Guardrail:* tests recall and application the student must perform unaided — this skill is pure assessed-load, zero offload. It is inherently legitimate.

**3. Study-Guide Co-Writer** — *highest daily utility, tightest guardrails.*
Takes the student's own understanding as input, corrects misconceptions, and renders it into the assignment's required format (length, structure, style constraints). Runs the Comprehension Gate *before* drafting.
*Guardrail:* will not draft a concept the student hasn't explained first; flags when the assignment is testing generation (examples, arguments) the student must supply themselves.

**4. Weakness Tracker + Planner** — *the connective tissue.*
Persistent memory (Notion) of every missed question and weak concept across sessions, surfacing patterns before exams; plus weekly checklists, due dates, and study scheduling. Turns a semester of scattered sessions into one coherent thread.
*Guardrail:* tracks and schedules; never completes graded work.

### The record: the Learning Ledger (core feature)

The killer feature for institutional buy-in. As the student works, School OS logs the *provenance of the thinking they actually did*: Socratic transcripts, quiz scores and readiness history, the student's own-words explanations that passed the Comprehension Gate, the before-and-after of each draft. The result is an auditable record a student can show a professor that says, in effect: *here is the work I did, in my own words, before anything was polished.*

**It lives in Notion.** Lowest friction for markdown, it's where the Weakness Tracker's data already lives, and it's shareable to a professor with a single link. Each entry is a signed gate event — timestamp, assignment, the assessed skill, the student's own-words explanation, the agent's rubric score and pass/fail, and the resulting draft. To keep it *evidence* rather than just a diary, entries are append-only in spirit and tamper-evident: at signing, the agent records a hash of the explanation plus timestamp, so any later edit in Notion is detectable. Not bulletproof against a determined student, but enough to make the ledger trustworthy for v1.

This flips academic integrity from accusation to evidence. It's the difference between "prove you didn't cheat" and "here's exactly how I learned this." No detector can produce that; School OS produces it as a byproduct of normal use.

---

## Build roadmap

**Phase 0 — Foundations (now).** This proposal; lock the ethical spine; define the Comprehension Gate spec.

**Phase 1 — Flagship skill.** Build one skill end-to-end as proof. *(Recommendation below.)*

**Phase 2 — The engine.** Add the Adaptive Quiz + Readiness skill — the most striking standalone demo and the clearest "this is just learning" artifact.

**Phase 3 — Co-writer + Gate.** Build the Study-Guide Co-Writer on top of the Comprehension Gate, with the assessed-vs-incidental check built in.

**Phase 4 — Memory + Ledger.** Wire the Weakness Tracker/Planner and the Learning Ledger across all skills, so the system has continuity and produces the proof-of-effort record.

**Phase 5 — Package + share.** Package for distribution to any student at any university — the stated audience.

**Design constraint across all phases: course-agnostic from day one.** Nothing is hardcoded to an intro marketing course. The student (or the agent, by reading a syllabus/assignment) supplies the subject, the assignment, and — critically — *the assessed skill*; the skills operate on that input. MKTG 101 is the test case, not the design target.

### Recommended flagship: the Socratic Tutor

I'd build the **Socratic Tutor first**, for three reasons. It's the purest embodiment of the thesis — if it works, the whole philosophy is proven in miniature. It produces the **Comprehension Gate** primitive that every other skill reuses, so building it first pays compound interest. And it's the hardest to get right (knowing when to give the next rung vs. the answer), so proving it early de-risks everything downstream. The Adaptive Quiz is the more *impressive* demo and should be a fast follow — but the Tutor is the load-bearing wall.

---

## What this proves to universities

School OS is, quietly, an argument. If a student can show a ledger of their own-words explanations, their quiz-readiness history, and their pre-draft thinking, then "AI use" was never the right thing to police — *skill exercise* was, and here's proof it happened. The system demonstrates a better institutional posture: define the assessed skill for each assignment, let AI remove the irrelevant friction, and require evidence the skill was exercised. That's a model a university could adopt without fighting an unwinnable war.

---

## Resolved decisions

1. **Course-agnostic from day one.** No MKTG 101-specific hardcoding; the assessed skill is an input, not a constant. MKTG 101 is the test case.
2. **The Comprehension Gate hard-blocks the deliverable, never the help.** Submittable output is gated; tutoring and hints stay open always.
3. **The gate is algorithmic and agent-signed.** The agent scores the student's explanation against a rubric and clears a threshold; only the agent can sign the approval — never the student via self-attestation.
4. **The Learning Ledger lives in Notion**, as append-only, tamper-evident signed gate events (explanation hash + timestamp recorded at signing).
5. **On self-honesty:** the system makes the honest path the easy one and lets the ledger make dishonesty visible, rather than trying to make cheating impossible. The agent-signed rubric raises the floor; the ledger raises the cost.

---

*Next step: build the Socratic Tutor skill and its Comprehension Gate, tested against a real assignment.*
