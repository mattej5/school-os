# The Learning Ledger — Notion schema & signing

The ledger is the provenance record: proof of the thinking the student actually did, in their own words, before anything was polished. It turns academic integrity from "prove you didn't cheat" into "here's how I learned this." It lives in Notion.

## Storage

A Notion database titled **School OS — Learning Ledger**. One row per signed gate event. Append-only in practice: never edit or delete prior rows; corrections are new rows that reference the prior one.

## Columns

| Property | Type | Contents |
|---|---|---|
| `Timestamp` | Date | Time the gate was signed |
| `Course` | Text | Course name/code (inferred or supplied) |
| `Assignment` | Text | The specific assignment or question |
| `Assessed skill` | Select | Recall / Application / Synthesis / Composition |
| `Student explanation` | Text | The student's own-words explanation that was scored |
| `Rubric score` | Text | Per-dimension scores + total (e.g., "Cov2 Rel2 App1 Mis2 = 7/8") |
| `Result` | Select | Pass / Fail |
| `Integrity hash` | Text | SHA-256 of `Student explanation` + `Timestamp` (see below) |
| `Draft released` | Checkbox | Whether a submittable draft was produced |
| `Prior entry` | Relation | Link to the earlier attempt, if this corrects one |

## Tamper-evidence

At signing, compute `SHA-256(student_explanation_text + "|" + iso_timestamp)` and store it in `Integrity hash`. Because the hash is fixed at signing, any later edit of the explanation in Notion will no longer match its hash — making post-hoc edits detectable. This is not cryptographic custody; it is a low-friction integrity signal sufficient for v1. A professor (or the student, defending their work) can re-hash the stored explanation + timestamp and confirm it matches.

Compute it with the bundled helper so signing and verification use the exact same algorithm:

```bash
node tools/ledger-hash.mjs "2026-06-22T18:30:00.000Z" "the student's own-words explanation, verbatim"
# or pipe the explanation on stdin:
echo "the explanation" | node tools/ledger-hash.mjs "2026-06-22T18:30:00.000Z"
```

Store the printed hex digest in `Integrity hash` alongside the same `Timestamp` you passed in. To verify a row later, re-run the helper with the stored explanation and timestamp and confirm the digest matches.

## What gets logged

- Every **passing** gate event (the core record).
- Every **failing** attempt too — the struggle is part of the proof of genuine effort, and the pattern of misses feeds the Weakness Tracker.

## Privacy

The ledger is the student's own record in their own Notion. Sharing it with a professor is the student's choice — the system never transmits it anywhere automatically.
