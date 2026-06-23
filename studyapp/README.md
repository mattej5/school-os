# School OS — Study Drills

Local single-user study web app for drilling multiple-choice question sets and tracking performance across sessions. It is the engine behind the **adaptive-quiz** skill, but runs standalone. The example payloads below happen to use a marketing course; the app is course-agnostic. It uses only built-in Node.js modules, serves the front end and API from one process, and stores data in a local SQLite file.

## Run

1. Make sure you are using Node.js v26.
2. From `studyapp/`, start the app:

```bash
node server.js
```

The server prints a local URL such as `http://localhost:4321`. Open that URL in a browser.

You can also use:

```bash
npm start
```

No `npm install` step is required.

## Data Flow

1. An external agent creates a question set with `POST /api/quiz-sets`.
2. The student opens the local app, picks a set, and completes a drill.
3. The app records attempts and responses in `study.db`.
4. The agent reads `GET /api/analytics` and `GET /api/analytics/wrong`.
5. The agent explains misses and posts a new weighted set for another round.

## Agent Loop

1. Agent posts a quiz set grounded in course materials.
2. Student drills that set in the browser.
3. Agent reads aggregate analytics and the wrong-answer feed.
4. Agent explains misses, identifies weak topics, and posts a new set focused on those gaps.

## API Examples

Create a quiz set:

```bash
curl -X POST http://localhost:4321/api/quiz-sets \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Final Round 1 - Pricing and IMC",
    "source_note": "grounded in final guide",
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
        "explanation": "Markup % = (50 - 20) / 20 = 150%."
      },
      {
        "topic": "IMC",
        "lesson": "Lesson 11",
        "type": "conceptual",
        "difficulty": "easy",
        "stem": "Which IMC tool focuses on unpaid media coverage?",
        "options": ["Public relations", "Personal selling", "Direct mail"],
        "correct_index": 0,
        "explanation": "Public relations focuses on earned media and reputation."
      }
    ]
  }'
```

List quiz sets:

```bash
curl http://localhost:4321/api/quiz-sets
```

Get one quiz set with questions:

```bash
curl http://localhost:4321/api/quiz-sets/1
```

Create an attempt:

```bash
curl -X POST http://localhost:4321/api/attempts \
  -H 'Content-Type: application/json' \
  -d '{"quiz_set_id":1}'
```

Record one response:

```bash
curl -X POST http://localhost:4321/api/attempts/1/responses \
  -H 'Content-Type: application/json' \
  -d '{"question_id":1,"chosen_index":0,"time_ms":3200}'
```

Record multiple responses at once:

```bash
curl -X POST http://localhost:4321/api/attempts/1/responses \
  -H 'Content-Type: application/json' \
  -d '{
    "responses": [
      {"question_id":1,"chosen_index":0,"time_ms":3200},
      {"question_id":2,"chosen_index":0,"time_ms":4100}
    ]
  }'
```

Finish an attempt:

```bash
curl -X POST http://localhost:4321/api/attempts/1/finish
```

Read aggregate analytics:

```bash
curl http://localhost:4321/api/analytics
```

Read the wrong-answer feed:

```bash
curl http://localhost:4321/api/analytics/wrong
curl http://localhost:4321/api/analytics/wrong?limit=25
```

## Reuse For Another Class

1. Copy the `studyapp/` folder.
2. Delete `study.db` if it exists.
3. Keep the same app structure and API.
4. Point the agent at the new course source documents so it can post new question sets.
5. Start the server and drill normally.
