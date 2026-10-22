# The Comprehension Gate — rubric & algorithm

The gate decides whether a student has done enough of the assessed cognitive work for the agent to hand over a polished, submittable draft. It only applies to that specific graded artifact — not to conversation, coaching, or help in general. The agent scores it against the rubric below rather than taking the student's own "I understand" as the pass signal, since the whole point is an outside check on genuine understanding.

## Inputs

- The student's own-words explanation of the concept, applied to the specific assignment.
- The **assessed skill** inferred in Step 0 (Recall / Application / Synthesis / Composition).

## Rubric

Score each dimension 0–2.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **Coverage** — names the key components the concept requires | Misses most | Partial | Substantially complete |
| **Relationships** — gets the causal/structural links right, not just a list | Wrong or absent | Some links, some gaps | Correct relationships explained |
| **Application** — applies correctly to the specific/novel case | Cannot apply | Applies with errors | Applies cleanly |
| **Misconception-free** — no major errors | Major misconception present | Minor slip | Clean |

## Weighting by assessed skill

- **Recall:** Coverage and Misconception-free are decisive. Application optional.
- **Application:** Application **must** score 2. Coverage + Relationships ≥ 3 combined.
- **Synthesis:** Relationships **must** score 2; Application ≥ 1.
- **Composition:** All substance dimensions ≥ 1 (the student owns the ideas); the *writing* is then the part the agent must NOT do for them — coach, don't ghostwrite.

## Pass threshold

A pass requires **all** of:

1. Total score ≥ 6 of 8, **and**
2. No dimension at 0, **and**
3. The skill-specific "must" condition above is met, **and**
4. **Misconception-free ≥ 1** (a major active misconception is an automatic fail regardless of total).

On a fail, identify the **single lowest-scoring dimension** and route the Socratic loop back to exactly that gap. Re-score on the next attempt. Do not lower the threshold for repeated attempts — repeated tries are how learning happens.

## Course policy and fast lanes

How strictly the gate applies depends on the course's syllabus AI policy (see `course-policy.md`). The agent asks for the syllabus before helping with graded work in a new course. In a **No AI** course it never releases a submittable draft, whatever the score. A student's optional personal fast lane (`local/fast-lane.md`, kept local) can skip the gate only in **AI-open** courses.

## Signing

On a pass, the agent signs by writing the Learning Ledger entry (see `learning-ledger.md`). The signature is the agent's act of recording — it cannot be produced by the student. Without a signed entry, no submittable draft is released.
