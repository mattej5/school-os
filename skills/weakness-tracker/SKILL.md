---
name: weakness-tracker
description: >-
  School OS — the Weakness Tracker + Planner, the connective tissue across
  sessions. Use when a student wants to know what to study, what's coming up, or
  where they keep slipping: "what should I study," "what's my weak spot," "what's
  due this week," "make me a study plan," "build my weekly checklist," "what did I
  get wrong last time," or before any exam ("what should I review for the
  midterm"). It reads the student's persistent Notion record of past quiz misses
  and gate events, surfaces recurring patterns, and turns due dates and deadlines
  into a concrete plan. It tracks and schedules — it never completes graded work
  (hand that to socratic-tutor, adaptive-quiz, or study-guide-cowriter).
  Course-agnostic.
---

# Weakness Tracker + Planner (School OS)

The thread that turns a semester of scattered sessions into one coherent picture. Every other skill produces data — quiz misses, gate events, weak concepts. This skill reads that history, finds the patterns the student can't see from inside a single session, and converts them into a plan with dates.

## The principle this skill enforces

> Track and schedule; never complete. This skill organizes the work — it never does the graded part.

It points at what to study and when. The studying itself goes to **socratic-tutor** (understand it), **adaptive-quiz** (drill it), or **study-guide-cowriter** (write it up). This skill never produces a submittable answer, so it never needs the Comprehension Gate.

## Storage — the same Notion record everything else writes to

The tracker reads from the student's Notion workspace, which holds two related records:

- **The Learning Ledger** (`../../shared/learning-ledger.md`) — signed gate events and logged quiz misses.
- **A planner record** — assignments, due dates, exam dates, and a weekly checklist.

If these don't exist yet, create them in the student's Notion on first use (a "School OS — Learning Ledger" database and a "School OS — Planner" database). Everything the tracker surfaces is derived from this persistent record, never from a single session's memory.

## Mode 1 — Surface weaknesses

When the student asks what to study, or before an exam:

1. Read the ledger and quiz-miss history for the relevant course.
2. **Find patterns, not just a list of misses.** Cluster by topic, by concept, and by *type of error*. The valuable output is "you keep confusing disposable vs. discretionary income" or "you miss application questions but ace recall," not "here are 12 wrong answers."
3. Rank by a combination of frequency, recency, and exam weight.
4. Output a prioritized, specific review list — and offer to launch the right skill for the top item (e.g., "Want me to drill you on the weak topic, or tutor the concept first?").

## Mode 2 — Plan and schedule

When the student wants a checklist, a study plan, or a due-date view:

1. Read the planner record for upcoming assignments and exam dates. If the student supplies a syllabus, parse it into the planner first (assignment, course, due date, exam weight).
2. **Convert any relative dates to absolute** ("next Friday" → the actual date) and keep them current.
3. Build a weekly checklist and, before exams, a backward-planned study schedule that front-loads the weak topics from Mode 1.
4. Keep it realistic and specific: dated items, sized to fit the time available, weighted toward what the history says is weak.

## Mode 3 — Close the loop after sessions

After a tutoring, quiz, or co-writing session, update the record: mark completed items, log new misses or newly-mastered topics, and adjust the plan. This is what keeps the tracker's picture accurate over a whole semester rather than drifting stale.

## Hard guardrails

- Track, surface, and schedule only — never complete graded work or produce a submittable answer.
- Always derive from the persistent Notion record, never from a single session's memory alone.
- Surface *patterns*, not raw miss-lists — the synthesis is the value.
- Convert relative dates to absolute and keep the plan current.
- Hand the actual studying to the right skill (socratic-tutor / adaptive-quiz / study-guide-cowriter); this skill is the planner, not the tutor.
