# PRD — School OS Study Drills app (original build spec)

> Historical build spec. The app was first built for a marketing course; it is course-agnostic. Example payloads below use marketing data only as illustration.

You are building a small, local, single-user study web app. Read this whole document first.
Build exactly what is specified. Do not add dependencies, frameworks, or features beyond this
spec. When done, the app must satisfy every item in **Acceptance Criteria**.

---

## 1. Goal

A local web app that lets a student drill multiple-choice questions and tracks performance
across sessions. An external agent (Claude) generates question sets and reads results through
the JSON API — so the app's job is **storage, serving, drilling, and analytics**, not question
generation. The app must be a clean, self-contained, copyable template usable for future classes.

## 2. Non-goals (do NOT build these)

- No authentication, no users/login, no multi-user support.
- No cloud deployment, no Docker, no CI. (Architect cleanly so a later DB swap is easy — see §5 — but do not deploy.)
- No question-generation logic inside the app. Questions arrive via the API.
- No front-end build step, no bundler, no TypeScript, no React. Plain HTML/CSS/JS only.

## 3. Hard constraints

- **Node.js v26**, using **built-in modules only**: `node:http`, `node:sqlite`
  (`DatabaseSync`), `node:fs`, `node:path`, `node:url`.
- **Zero runtime dependencies.** `package.json` must have an empty (or absent) `dependencies`
  field. No `npm install` should be required to run the app. No native builds.
- A single `server.js` serves both the static front-end and the JSON REST API on one port.
- **All SQL and all DB access live in `db.js`** — server.js must never call `node:sqlite`
  directly. This isolates the storage layer so it can later be swapped for libSQL/Turso by
  editing only `db.js`.
- Front-end is a single `public/index.html` (inline CSS/JS is fine, or sibling `app.js`/
  `styles.css` in `public/` — your choice, but no external CDN links and no network deps).
- Default port `4321`, overridable via `PORT` env var. Print the URL on startup.

## 4. Folder layout (create exactly this)

```
studyapp/
  server.js          # node:http server: static files + JSON API
  db.js              # schema init + ALL queries (only file that imports node:sqlite)
  public/
    index.html       # the full UI (home, quiz, results, progress)
  study.db           # SQLite file — created automatically on first run, do NOT commit a prebuilt one
  package.json       # name, "type":"module", a "start" script, NO dependencies
  README.md          # how to run + the agent loop + how to reuse for another class
  PRD.md             # this file (already present)
```

Use ES modules (`"type": "module"` in package.json, `import` syntax).

## 5. Data model (SQLite — define in `db.js`, created on startup if missing)

```sql
CREATE TABLE IF NOT EXISTS quiz_sets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  source_note  TEXT,                 -- e.g. "Pricing + IMC focus, round 2"
  topic_filter TEXT,                 -- optional free text
  created_at   TEXT NOT NULL         -- ISO 8601 string
);

CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_set_id   INTEGER NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  lesson        TEXT,                -- e.g. "Lesson 11"
  type          TEXT NOT NULL,       -- 'conceptual' | 'application'
  difficulty    TEXT,                -- 'easy' | 'medium' | 'hard' (free text ok)
  stem          TEXT NOT NULL,       -- the question text
  options       TEXT NOT NULL,       -- JSON array of strings
  correct_index INTEGER NOT NULL,    -- 0-based index into options
  explanation   TEXT                 -- why the answer is correct
);

CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_set_id INTEGER NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  score       INTEGER,
  total       INTEGER
);

CREATE TABLE IF NOT EXISTS responses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chosen_index INTEGER NOT NULL,
  is_correct  INTEGER NOT NULL,      -- 0 or 1
  time_ms     INTEGER
);
```

Enable `PRAGMA foreign_keys = ON`. Store `options` as a JSON string; parse it when returning
questions over the API (so the API returns a real array).

## 6. REST API

All endpoints accept/return JSON (`Content-Type: application/json`). Return appropriate status
codes (200/201 success, 400 bad input, 404 not found, 500 server error) and a JSON body. CORS
is not needed (same origin) but setting `Access-Control-Allow-Origin: *` is acceptable.

### Quiz sets
- **`POST /api/quiz-sets`** — create a set and its questions in one transaction.
  Request body:
  ```json
  {
    "name": "Final Round 1 — Pricing & IMC",
    "source_note": "grounded in Final Exam guide + Lesson 11",
    "topic_filter": "Pricing, IMC",
    "questions": [
      {
        "topic": "Pricing",
        "lesson": "Lesson 10",
        "type": "application",
        "difficulty": "medium",
        "stem": "A product costs $20 and sells for $50. What is the markup percentage?",
        "options": ["60%", "150%", "40%", "100%"],
        "correct_index": 1,
        "explanation": "Markup % = (price - cost) / cost = (50-20)/20 = 150%."
      }
    ]
  }
  ```
  Response: `201` with `{ "id": <quiz_set_id>, "question_count": <n> }`.
  Validate: name present, questions non-empty, each question has stem, ≥2 options,
  `correct_index` within range, valid `type`. Reject with 400 + message otherwise.

- **`GET /api/quiz-sets`** — list all sets, newest first, each with
  `{ id, name, source_note, topic_filter, created_at, question_count, attempt_count }`.

- **`GET /api/quiz-sets/:id`** — return the set plus its full `questions` array (with `options`
  parsed to an array). Used by the UI to run a drill. 404 if missing.

### Attempts & responses
- **`POST /api/attempts`** — body `{ "quiz_set_id": <id> }`. Creates an attempt with
  `started_at = now`. Response `201` `{ "id": <attempt_id> }`. 404 if the set doesn't exist.

- **`POST /api/attempts/:id/responses`** — record one or many responses. Accept either a single
  object or `{ "responses": [ ... ] }`. Each: `{ question_id, chosen_index, time_ms? }`. The
  server computes `is_correct` by comparing `chosen_index` to the question's `correct_index`
  (do NOT trust a client-sent correctness flag). Response `201` `{ "recorded": <n> }`.

- **`POST /api/attempts/:id/finish`** — finalize: set `finished_at = now`, compute and store
  `score` (count of correct responses) and `total` (count of responses). Response `200` with
  `{ id, score, total, pct }`.

### Analytics (this is what the agent reads)
- **`GET /api/analytics`** — return an object:
  ```json
  {
    "overall": { "attempts": n, "questions_answered": n, "accuracy": 0.0 },
    "by_topic":  [ { "topic": "Pricing", "correct": n, "total": n, "accuracy": 0.0 } ],
    "by_type":   [ { "type": "application", "correct": n, "total": n, "accuracy": 0.0 } ],
    "by_lesson": [ { "lesson": "Lesson 11", "correct": n, "total": n, "accuracy": 0.0 } ],
    "recent_attempts": [ { "id": n, "quiz_set_id": n, "set_name": "...", "score": n, "total": n, "finished_at": "..." } ],
    "trend": [ { "finished_at": "...", "pct": 0.0 } ]
  }
  ```
  Aggregate across ALL attempts/responses. `accuracy`/`pct` are 0–1 floats (round to 3 dp).
  Only count finished attempts in trend/recent; topic/type/lesson aggregate over all responses.

- **`GET /api/analytics/wrong`** — every wrong response, newest first, each with:
  `{ question_id, topic, lesson, type, stem, options (array), chosen_index, chosen_text,
  correct_index, correct_text, explanation, attempt_id, answered_at }`. Optional query param
  `?limit=` (default 100). This is the agent's review feed.

## 7. Front-end (`public/index.html`)

Single-page app, vanilla JS, screen-switching (show/hide divs). Base the **visual design** on
the sibling file `../MKTG 101_Daily_Quiz.html` (same folder's parent) — reuse its CSS aesthetic:
navy/blue palette, card layout, rounded option buttons, progress bar, mobile-friendly
(max-width ~680px, `viewport` meta). You may copy its CSS. Do NOT copy its hardcoded question
array or localStorage logic — data comes from the API.

Screens:
1. **Home** — fetch `GET /api/quiz-sets`; render a list of sets (name, source_note, question
   count, attempt count, date). Click a set → start a drill (calls `POST /api/attempts`, then
   loads questions via `GET /api/quiz-sets/:id`). Also show a "Progress" button → Progress screen.
2. **Quiz** — one question at a time: topic/type tag, stem, option buttons, progress bar,
   running score. On answer: highlight correct/wrong, show explanation, record the response
   (you may POST each response immediately or batch at finish — but DB must end with correct
   `responses` rows and a finished attempt). Next button advances. After last question →
   `POST /api/attempts/:id/finish` → Results.
3. **Results** — score, percent, and a by-topic breakdown for THIS attempt, plus a review list
   of the questions missed this attempt (stem + your answer + correct answer + explanation).
   Buttons: retry set, back home.
4. **Progress** — fetch `GET /api/analytics`; show overall accuracy, accuracy by topic and by
   type (simple bars or rows), and a list of recent attempts. Keep it simple but readable.

Handle the empty state (no sets yet): Home shows a friendly "No question sets yet — generate one
with the agent" message.

## 8. README.md (write this)

Cover: how to run (`node server.js`, open the printed URL), the data flow, the **agent loop**
(agent POSTs a quiz set → student drills → agent GETs `/api/analytics` + `/api/analytics/wrong`
→ agent explains misses and POSTs a new weighted set), example `curl` commands for each endpoint,
and a short "Reuse for another class" section (copy `studyapp/`, delete `study.db`, point the
agent at the new class's source docs).

## 9. Acceptance criteria (the build is done when ALL pass)

1. `node server.js` starts with no install step and prints a localhost URL.
2. `package.json` has `"type": "module"`, a `start` script, and **no `dependencies`**.
3. `study.db` is created automatically on first run with all four tables.
4. `POST /api/quiz-sets` with a 2-question payload returns `201` and an id.
5. `GET /api/quiz-sets` lists it with `question_count: 2`; `GET /api/quiz-sets/:id` returns the
   questions with `options` as a real array.
6. `POST /api/attempts` → `POST /api/attempts/:id/responses` (2 responses) →
   `POST /api/attempts/:id/finish` returns a correct score; server-computed `is_correct` is right
   even if the client lies about correctness.
7. `GET /api/analytics` reflects the attempt (overall accuracy + by_topic populated);
   `GET /api/analytics/wrong` lists any missed question with chosen vs correct text.
8. Opening the printed URL in a browser shows Home; a full drill can be completed and the
   Results + Progress screens render real data.
9. No external network requests from the front-end; no CDN; no extra files beyond §4.

## 10. Notes for the builder

- Keep `server.js` to a simple manual router (switch on method + pathname via `URL`). No
  framework.
- Parse `:id` path params yourself.
- Use parameterized statements (`db.prepare(...).run(...)`) everywhere — no string-built SQL.
- Wrap multi-row inserts (a quiz set + its questions) in a transaction.
- Times are ISO strings via `new Date().toISOString()`.
- Return clear JSON errors: `{ "error": "message" }`.
