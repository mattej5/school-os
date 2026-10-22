---
name: adaptive-quiz
description: >-
  School OS — the Adaptive Quiz + Readiness Engine. Use whenever a student wants
  to test themselves, drill for an exam, or check if they're ready: "quiz me,"
  "test me on this," "am I ready for the exam," "give me practice questions,"
  "let's do flashcards," "help me study for the midterm/final." Runs escalating
  rounds of questions grounded in the course material, explains every miss,
  tracks readiness across consecutive rounds, and won't declare the student ready
  until they clear a threshold — then issues a full-length practice exam. This is
  pure assessed-load: the student answers unaided, so it needs no Comprehension
  Gate. It logs misses to the Learning Ledger and feeds the Weakness Tracker.
  Course-agnostic. Pairs with the bundled study-drills web app for a clickable UI.
---

# Adaptive Quiz + Readiness Engine (School OS)

Active recall plus a readiness gate. The student does the answering — every question is load the assessment is *supposed* to test — so this skill offloads nothing and is integrity-clean by construction. Its job is to make recall and application effortful, honest, and measured, and to refuse to say "you're ready" until the evidence supports it.

## The principle this skill enforces

> Readiness is earned across rounds, not declared after one good run.

A single 80% can be luck or a soft set. Sustained accuracy across consecutive, varied rounds is the signal. This skill holds that line.

## Step 0 — Ground the questions in real material

Never quiz from generic memory. Before generating any set:

1. Find the source — pasted notes, a syllabus, a study guide, uploaded readings, or the Weakness Tracker's record of past misses. If none is supplied, ask for the topic and the most authoritative material the student has.
2. Identify the **topics** and **lessons** to cover, and tag each question with them. Tags are what make the analytics and the Weakness Tracker useful later.
3. Mix **conceptual** (recall/understanding) and **application** (apply to a new case) questions. An exam-readiness drill that is all recall is a false signal.
4. Apply the repetition signal (`../../shared/repetition-signal.md`): concepts the professor repeats across slides or sessions get weighted more heavily and drilled more often.

## Step 1 — Run escalating rounds of five

The unit is a **round of five questions**. After each round:

1. Score it. Show the student which they missed.
2. **Explain every miss** — not just the right letter, but *why* it's right and why their pick was wrong, tied back to the underlying concept. This is where the learning happens; never skip it.
3. Decide the next round (Step 2).

Keep rounds short (five) so feedback is tight and the student stays in the loop. Escalate difficulty and broaden topic coverage as accuracy climbs; on weak topics, weight the next round toward them.

## Step 2 — The Readiness Gate

Track a rolling record of round scores. The student is **ready** only when:

- **Two consecutive rounds at ≥ 80%**, *and*
- those rounds covered the **full topic span** of the exam (not the same easy slice twice), *and*
- no single topic is sitting below 60% accuracy across the session.

Until all three hold, the student is **not ready** — say so plainly and keep drilling, weighting toward the weak topics. Do not lower the bar for fatigue, time pressure, or frustration. "You're close — two clean rounds back to back and you're there" is the honest, motivating framing; use it.

When the gate clears, declare readiness and move to Step 3.

## Step 3 — The full-length practice exam

On readiness, issue one **full-length practice exam**: longer (e.g., 15–25 questions), all topics, exam-realistic difficulty, no mid-exam explanations. Score it at the end, then review every miss. This is the capstone that converts "ready" into proof.

## Step 4 — Log misses to the Learning Ledger + Weakness Tracker

Every missed question is data. Record misses (question, topic, lesson, the student's wrong pick, the correct answer, the concept behind it) to the student's Notion record per `../../shared/learning-ledger.md`. This is what the **weakness-tracker** skill reads to surface patterns before the next exam. Quiz misses are logged as effort evidence, not as gate events — there is no draft to gate here.

## Using the bundled study-drills app (optional but recommended)

The repo ships a local web app (`studyapp/`) that gives the student a clickable drill UI and persists attempts in SQLite, so the loop survives across sessions. The division of labor:

- **The agent (this skill)** generates question sets grounded in the material, reads analytics, explains misses, and decides the next round.
- **The app** serves the drill, records responses, and computes accuracy by topic/type/lesson.

The loop:

1. Start the app: `cd studyapp && node server.js` (Node v26, zero dependencies). It prints a localhost URL.
2. Agent posts a set: `POST /api/quiz-sets` with the generated questions.
3. Student drills in the browser.
4. Agent reads `GET /api/analytics` and `GET /api/analytics/wrong`.
5. Agent applies the Readiness Gate (Step 2) to the analytics, explains misses, and posts the next weighted set.

See `studyapp/README.md` for the full API and example payloads. The app is single-user and local — no data leaves the machine. If the student would rather just go back-and-forth in chat, skip the app entirely; the round/readiness logic above is the same either way.

## Hard guardrails

- Never quiz from generic memory — always ground questions in the student's material.
- Never declare readiness before the gate's three conditions all hold.
- Never skip the explanation of a miss; the miss is the lesson.
- Never quiz the same easy slice to manufacture a passing streak.
- This skill produces no submittable deliverable, so it never invokes the Comprehension Gate — the student is doing the assessed work directly.
