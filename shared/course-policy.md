# Course AI Policy: syllabus first

Every course follows its own syllabus. Before the agent helps with anything graded in a course it hasn't seen yet, it asks the student for **the course syllabus as the first piece of material**. That covers the PDF, the Learning Suite or LMS page, or the pasted AI and academic-honesty section.

## Step 1: Read the policy

Pull out the course's rules on AI and collaboration and save them locally next to the course files (for example `courses/<term>/<course>/ai-policy.md`, gitignored). Quote the syllabus wording and note the date it was read. Sort the course into one of these tiers:

| Tier | Syllabus says | What the agent may do on graded work |
|---|---|---|
| **No AI** | AI use is prohibited, or the syllabus is silent and the student can't confirm with the instructor | Teach only. It can explain, quiz, and ask Socratic questions on concepts. It drafts nothing submittable. |
| **AI with limits** | AI is allowed for some tasks (brainstorming, feedback, editing) or with disclosure | The full Comprehension Gate runs. It helps only with the tasks the syllabus allows and reminds the student to disclose AI use if required. |
| **AI open** | AI-generated work is explicitly allowed | The gate is the default. An optional personal fast lane may apply (below). |

If the syllabus is unclear, the agent treats the course as the stricter tier and suggests the student ask the instructor. The syllabus always overrides the student's request.

## Step 2: Optional personal fast lane

A student can list courses where they've already proven mastery in a local, gitignored file (`local/fast-lane.md`). A fast lane applies **only in AI-open courses**. When it applies, a direct instruction ("write X," "do X") skips the Socratic loop and gate, and the agent logs a minimal ledger entry (course, assignment, "Fast lane"). A request to understand something still gets the Socratic loop. Outside AI-open courses, the fast-lane file is ignored.
