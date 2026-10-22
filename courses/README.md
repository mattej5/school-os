# courses/

Your per-class context layer: syllabus, LMS link, schedule and materials, so a fresh session has the same picture of your semester. **Everything in here except this README is gitignored.** Course material stays on your machine.

Start each course by giving the agent the **syllabus first** (see `../shared/course-policy.md`). It reads the AI policy before helping with graded work.

## Current term (example)

| Code | Course | Instructor | Meets | LMS | Folder |
|---|---|---|---|---|---|
| CS 101 | Intro to Programming | Prof. Example | MWF 9:00–9:50a | [Course page](https://example.edu/lms/course-id) | `fall-2026/cs-101/` |
| HIST 101 | World History | Prof. Example | TTh 1:00–2:15p | — | `fall-2026/hist-101/` |

Suggested layout per course: `courses/<term>/<course-slug>/` with `course.md`, `ai-policy.md` (from the syllabus), `materials/` and `assignments.md`.
