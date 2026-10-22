# School OS

**A set of Claude Code skills that streamline the work around a course while guaranteeing the learning still happens — and proving it did.**

Universities are spending enormous energy trying to keep students from using AI. That's the wrong fight. The right one is teaching students *how* to use AI so the learning stays genuine — and giving them a way to prove it. School OS is the system that does that.

> **The one rule everything is built on:** AI may carry the load an assignment is *not* testing. The student must carry the load it *is* testing.
>
> Plain version, for students and professors: *the system will never give you anything you can't explain in your own words.*

Read the full thinking in [PROPOSAL.md](PROPOSAL.md).

---

## What's in here

Five student-facing skills, one shared comprehension primitive they reuse, and one record that ties it all together.

| Skill | What it does | Integrity mechanism |
|---|---|---|
| **[socratic-tutor](skills/socratic-tutor/SKILL.md)** | Decomposes a concept Socratically until the student can articulate it. Never states the answer; gives the next rung. | Births the Comprehension Gate. |
| **[adaptive-quiz](skills/adaptive-quiz/SKILL.md)** | Escalating rounds of five, explains every miss, won't declare you "ready" until you clear a threshold across consecutive rounds, then issues a full practice exam. | Pure assessed-load — no gate needed. |
| **[study-guide-cowriter](skills/study-guide-cowriter/SKILL.md)** | Turns the student's *own* understanding into a formatted, submittable deliverable — only after they've explained it. | Runs the Comprehension Gate before drafting. |
| **[weakness-tracker](skills/weakness-tracker/SKILL.md)** | Persistent memory of every miss and weak concept; surfaces patterns before exams; builds dated study plans. | Tracks and schedules; never completes graded work. |
| **[baseline-check](skills/baseline-check/SKILL.md)** | Point it at something you shipped with AI. It probes the decisions in it, one at a time, and scores how much you can still explain unaided — then hands you drills and a number that moves on the re-run. | Measures explain-rate over your own artifact. Never detects, never judges whether AI was used — it assumes it was. |

**Shared primitives** (in [`shared/`](shared/)):

- **[The Comprehension Gate](shared/comprehension-gate.md)** — a rubric + algorithm. Before any polished, submittable output is released, the student must explain the idea in their own words and pass an agent-scored threshold. The gate is algorithmic and agent-signed — a student can never click "I understand" to pass. It hard-blocks the *deliverable*, never the *help*.
- **[The Learning Ledger](shared/learning-ledger.md)** — an append-only, tamper-evident record (in Notion) of the thinking the student actually did: their own-words explanations, quiz-readiness history, and the before/after of each draft. The killer feature for institutional buy-in: it flips academic integrity from "prove you didn't cheat" to "here's exactly how I learned this." Integrity hashes are computed with [`tools/ledger-hash.mjs`](tools/ledger-hash.mjs).

**The study-drills app** ([`studyapp/`](studyapp/)) — a local, zero-dependency Node web app that gives `adaptive-quiz` a clickable drill UI and persists attempts across sessions. Optional; the skill works in plain chat too.

---

## Install

Requires [Claude Code](https://claude.com/claude-code). Then:

```bash
git clone https://github.com/mattej5/school-os.git
cd school-os
./install.sh
```

`install.sh` symlinks the skills into `~/.claude/skills/` (override with `CLAUDE_SKILLS_DIR`). Symlinks keep the skills resolving their shared specs from inside this repo and let `git pull` update them in place — so keep the repo where you cloned it.

To use the study-drills app (optional, needs **Node v26**, no `npm install`):

```bash
cd studyapp && node server.js   # prints a localhost URL
```

---

## How to use it

Once installed, just talk to Claude Code about your coursework — the skills trigger on what you ask:

- "I don't get this concept, walk me through it" → **socratic-tutor**
- "Quiz me for the midterm" / "am I ready?" → **adaptive-quiz**
- "Help me write up this discussion post" → **study-guide-cowriter**
- "What should I study this week?" → **weakness-tracker**
- "Can I actually explain this code I shipped?" / "check my baseline" → **baseline-check**

The Learning Ledger and Weakness Tracker write to *your* Notion. They need a Notion connection in Claude Code (via the Notion MCP); without it, the skills still tutor, quiz, and draft — they just can't persist the provenance record across sessions.

---

## The design constraint: course-agnostic

Nothing is hardcoded to a specific course. The student (or Claude, by reading a syllabus or assignment) supplies the subject, the assignment, and — critically — the *assessed skill*. The skills operate on that input. The example payloads in `studyapp/` use a marketing course only as illustration.

**[`courses/`](courses/)** holds the human/session-context layer instead: per-class source materials and durable facts (syllabus, Canvas link, materials) so a fresh session in this repo has the same picture of the current semester without re-deriving it. The skills above never read this directory — it's for Claude and Vin, not for the skill logic.

---

## Status

v1. The Socratic Tutor and the study-drills app are the most battle-tested (they grew out of a real semester). The Comprehension Gate and Learning Ledger are specified and wired (hash helper included); the adaptive-quiz, study-guide-cowriter, and weakness-tracker skills are built and ready to exercise against real assignments. Feedback and PRs welcome.

## License

[MIT](LICENSE) © 2026 Vin Jones
