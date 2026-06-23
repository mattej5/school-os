import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = process.env.STUDYAPP_DB
  ? path.resolve(process.env.STUDYAPP_DB)
  : path.join(__dirname, 'study.db');

if (!fs.existsSync(dbFile)) {
  fs.closeSync(fs.openSync(dbFile, 'a'));
}

const db = new DatabaseSync(dbFile);
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_sets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    source_note  TEXT,
    topic_filter TEXT,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_set_id   INTEGER NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
    topic         TEXT NOT NULL,
    lesson        TEXT,
    type          TEXT NOT NULL,
    difficulty    TEXT,
    stem          TEXT NOT NULL,
    options       TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation   TEXT
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
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id   INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    chosen_index INTEGER NOT NULL,
    is_correct   INTEGER NOT NULL,
    time_ms      INTEGER
  );
`);

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

if (!hasColumn('questions', 'concepts')) {
  db.exec('ALTER TABLE questions ADD COLUMN concepts TEXT');
}

if (!hasColumn('questions', 'bloom')) {
  db.exec('ALTER TABLE questions ADD COLUMN bloom TEXT');
}

const VALID_TYPES = new Set(['conceptual', 'application']);
const VALID_BLOOMS = new Set(['remember', 'understand', 'apply', 'analyze']);

const insertQuizSetStmt = db.prepare(`
  INSERT INTO quiz_sets (name, source_note, topic_filter, created_at)
  VALUES (?, ?, ?, ?)
`);
const insertQuestionStmt = db.prepare(`
  INSERT INTO questions (
    quiz_set_id, topic, lesson, type, difficulty, stem, options, correct_index, explanation, concepts, bloom
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getQuizSetStmt = db.prepare(`
  SELECT id, name, source_note, topic_filter, created_at
  FROM quiz_sets
  WHERE id = ?
`);
const listQuizSetsStmt = db.prepare(`
  SELECT
    qs.id,
    qs.name,
    qs.source_note,
    qs.topic_filter,
    qs.created_at,
    COUNT(DISTINCT q.id) AS question_count,
    COUNT(DISTINCT a.id) AS attempt_count
  FROM quiz_sets qs
  LEFT JOIN questions q ON q.quiz_set_id = qs.id
  LEFT JOIN attempts a ON a.quiz_set_id = qs.id
  GROUP BY qs.id
  ORDER BY qs.created_at DESC, qs.id DESC
`);
const getQuestionsForSetStmt = db.prepare(`
  SELECT
    id,
    quiz_set_id,
    topic,
    lesson,
    type,
    difficulty,
    stem,
    options,
    correct_index,
    explanation,
    concepts,
    bloom
  FROM questions
  WHERE quiz_set_id = ?
  ORDER BY id ASC
`);
const insertAttemptStmt = db.prepare(`
  INSERT INTO attempts (quiz_set_id, started_at)
  VALUES (?, ?)
`);
const getAttemptStmt = db.prepare(`
  SELECT id, quiz_set_id, started_at, finished_at, score, total
  FROM attempts
  WHERE id = ?
`);
const getQuestionForAttemptStmt = db.prepare(`
  SELECT q.id, q.options, q.correct_index
  FROM questions q
  JOIN attempts a ON a.quiz_set_id = q.quiz_set_id
  WHERE a.id = ? AND q.id = ?
`);
const insertResponseStmt = db.prepare(`
  INSERT INTO responses (attempt_id, question_id, chosen_index, is_correct, time_ms)
  VALUES (?, ?, ?, ?, ?)
`);
const finishAttemptTotalsStmt = db.prepare(`
  SELECT
    COALESCE(SUM(is_correct), 0) AS score,
    COUNT(*) AS total
  FROM responses
  WHERE attempt_id = ?
`);
const finishAttemptStmt = db.prepare(`
  UPDATE attempts
  SET finished_at = ?, score = ?, total = ?
  WHERE id = ?
`);
const overallAttemptsStmt = db.prepare('SELECT COUNT(*) AS attempts FROM attempts');
const overallResponsesStmt = db.prepare(`
  SELECT COUNT(*) AS questions_answered, COALESCE(SUM(is_correct), 0) AS correct
  FROM responses
`);
const byTopicStmt = db.prepare(`
  SELECT q.topic AS label, COALESCE(SUM(r.is_correct), 0) AS correct, COUNT(*) AS total
  FROM responses r
  JOIN questions q ON q.id = r.question_id
  GROUP BY q.topic
  ORDER BY q.topic COLLATE NOCASE ASC
`);
const byTypeStmt = db.prepare(`
  SELECT q.type AS label, COALESCE(SUM(r.is_correct), 0) AS correct, COUNT(*) AS total
  FROM responses r
  JOIN questions q ON q.id = r.question_id
  GROUP BY q.type
  ORDER BY q.type COLLATE NOCASE ASC
`);
const byLessonStmt = db.prepare(`
  SELECT COALESCE(NULLIF(q.lesson, ''), 'Unspecified') AS label, COALESCE(SUM(r.is_correct), 0) AS correct, COUNT(*) AS total
  FROM responses r
  JOIN questions q ON q.id = r.question_id
  GROUP BY COALESCE(NULLIF(q.lesson, ''), 'Unspecified')
  ORDER BY label COLLATE NOCASE ASC
`);
const recentAttemptsStmt = db.prepare(`
  SELECT
    a.id,
    a.quiz_set_id,
    qs.name AS set_name,
    a.score,
    a.total,
    a.finished_at
  FROM attempts a
  JOIN quiz_sets qs ON qs.id = a.quiz_set_id
  WHERE a.finished_at IS NOT NULL
  ORDER BY a.finished_at DESC, a.id DESC
  LIMIT 10
`);
const trendStmt = db.prepare(`
  SELECT finished_at, score, total
  FROM attempts
  WHERE finished_at IS NOT NULL
  ORDER BY finished_at ASC, id ASC
`);
const wrongResponsesStmt = db.prepare(`
  SELECT
    r.attempt_id,
    r.question_id,
    r.chosen_index,
    q.topic,
    q.lesson,
    q.type,
    q.stem,
    q.options,
    q.correct_index,
    q.explanation,
    COALESCE(a.finished_at, a.started_at) AS answered_at
  FROM responses r
  JOIN questions q ON q.id = r.question_id
  JOIN attempts a ON a.id = r.attempt_id
  WHERE r.is_correct = 0
  ORDER BY r.id DESC
  LIMIT ?
`);
const joinedResponseRowsStmt = db.prepare(`
  SELECT
    r.id AS response_id,
    r.attempt_id,
    r.question_id,
    r.chosen_index,
    r.is_correct,
    r.time_ms,
    a.started_at AS attempt_started_at,
    a.finished_at AS attempt_finished_at,
    COALESCE(a.finished_at, a.started_at) AS answered_at,
    qs.id AS quiz_set_id,
    qs.name AS quiz_set_name,
    q.topic,
    q.lesson,
    q.type,
    q.difficulty,
    q.bloom,
    q.concepts,
    q.stem,
    q.options,
    q.correct_index
  FROM responses r
  JOIN attempts a ON a.id = r.attempt_id
  JOIN quiz_sets qs ON qs.id = a.quiz_set_id
  JOIN questions q ON q.id = r.question_id
  ORDER BY r.id ASC
`);
const distinctTopicsStmt = db.prepare(`
  SELECT DISTINCT topic
  FROM questions
  WHERE topic IS NOT NULL AND TRIM(topic) <> ''
  ORDER BY topic COLLATE NOCASE ASC
`);

function nowIso() {
  return new Date().toISOString();
}

function roundRatio(correct, total) {
  if (!total) {
    return 0;
  }
  return Number((correct / total).toFixed(3));
}

function roundAverage(values) {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function badRequest(error) {
  const issue = new Error(error);
  issue.statusCode = 400;
  return issue;
}

function notFound(error) {
  const issue = new Error(error);
  issue.statusCode = 404;
  return issue;
}

function parseOptions(optionsText) {
  try {
    const parsed = JSON.parse(optionsText);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseConcepts(conceptsText) {
  if (!conceptsText) {
    return [];
  }
  try {
    const parsed = JSON.parse(conceptsText);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [];
  } catch {
    return [];
  }
}

function normalizeDifficulty(value) {
  return value && `${value}`.trim() ? `${value}` : 'unspecified';
}

function normalizeJoinedRow(row) {
  const options = parseOptions(row.options);
  return {
    response_id: row.response_id,
    attempt_id: row.attempt_id,
    attempt_started_at: row.attempt_started_at,
    attempt_finished_at: row.attempt_finished_at,
    answered_at: row.answered_at,
    quiz_set_id: row.quiz_set_id,
    quiz_set_name: row.quiz_set_name,
    question_id: row.question_id,
    topic: row.topic,
    lesson: row.lesson,
    type: row.type,
    difficulty: row.difficulty,
    bloom: row.bloom,
    concepts: parseConcepts(row.concepts),
    stem: row.stem,
    options,
    chosen_index: row.chosen_index,
    chosen_text: options[row.chosen_index] ?? null,
    correct_index: row.correct_index,
    correct_text: options[row.correct_index] ?? null,
    is_correct: row.is_correct,
    time_ms: row.time_ms
  };
}

function normalizeQuestion(row) {
  return {
    id: row.id,
    quiz_set_id: row.quiz_set_id,
    topic: row.topic,
    lesson: row.lesson,
    type: row.type,
    difficulty: row.difficulty,
    stem: row.stem,
    options: parseOptions(row.options),
    correct_index: row.correct_index,
    explanation: row.explanation,
    concepts: parseConcepts(row.concepts),
    bloom: row.bloom
  };
}

function validateQuestion(question, index) {
  if (!question || typeof question !== 'object') {
    throw badRequest(`Question ${index + 1} must be an object`);
  }
  if (!question.topic || typeof question.topic !== 'string') {
    throw badRequest(`Question ${index + 1} is missing topic`);
  }
  if (!question.stem || typeof question.stem !== 'string') {
    throw badRequest(`Question ${index + 1} is missing stem`);
  }
  if (!VALID_TYPES.has(question.type)) {
    throw badRequest(`Question ${index + 1} has invalid type`);
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw badRequest(`Question ${index + 1} must have at least 2 options`);
  }
  if (!question.options.every((option) => typeof option === 'string' && option.length > 0)) {
    throw badRequest(`Question ${index + 1} options must be non-empty strings`);
  }
  if (!Number.isInteger(question.correct_index) || question.correct_index < 0 || question.correct_index >= question.options.length) {
    throw badRequest(`Question ${index + 1} has invalid correct_index`);
  }
  if (question.bloom != null && !VALID_BLOOMS.has(question.bloom)) {
    throw badRequest(`Question ${index + 1} has invalid bloom`);
  }
  if (Array.isArray(question.concepts) && !question.concepts.every((concept) => typeof concept === 'string' && concept.trim())) {
    throw badRequest(`Question ${index + 1} concepts must be non-empty strings`);
  }
}

function buildAccuracyRows(rows, key) {
  return rows.map((row) => ({
    [key]: row.label,
    correct: row.correct,
    total: row.total,
    accuracy: roundRatio(row.correct, row.total)
  }));
}

function runTransaction(work) {
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function getJoinedResponseRows() {
  return joinedResponseRowsStmt.all().map(normalizeJoinedRow);
}

function buildQuestionAnalytics(rows) {
  const questions = new Map();

  for (const row of rows) {
    const key = row.question_id;
    if (!questions.has(key)) {
      questions.set(key, {
        question_id: row.question_id,
        topic: row.topic,
        lesson: row.lesson,
        type: row.type,
        difficulty: row.difficulty,
        concepts: row.concepts,
        bloom: row.bloom,
        stem: row.stem,
        options: row.options,
        correct_index: row.correct_index,
        times_seen: 0,
        times_correct: 0,
        time_values: [],
        last_answered_at: row.answered_at,
        distractor_counts: Array.from({ length: row.options.length }, () => 0)
      });
    }

    const entry = questions.get(key);
    entry.times_seen += 1;
    entry.times_correct += row.is_correct;
    if (row.time_ms != null) {
      entry.time_values.push(row.time_ms);
    }
    if (row.answered_at > entry.last_answered_at) {
      entry.last_answered_at = row.answered_at;
    }
    if (entry.distractor_counts[row.chosen_index] != null) {
      entry.distractor_counts[row.chosen_index] += 1;
    }
  }

  return Array.from(questions.values()).map((entry) => {
    const distractors = entry.options.map((text, index) => ({
      index,
      text,
      is_correct: index === entry.correct_index,
      chosen_count: entry.distractor_counts[index] ?? 0
    }));
    const topDistractor = distractors
      .filter((item) => !item.is_correct && item.chosen_count > 0)
      .sort((left, right) => right.chosen_count - left.chosen_count || left.index - right.index)[0] ?? null;

    return {
      question_id: entry.question_id,
      topic: entry.topic,
      lesson: entry.lesson,
      type: entry.type,
      difficulty: entry.difficulty,
      concepts: entry.concepts,
      bloom: entry.bloom,
      stem: entry.stem,
      options: entry.options,
      correct_index: entry.correct_index,
      times_seen: entry.times_seen,
      times_correct: entry.times_correct,
      accuracy: roundRatio(entry.times_correct, entry.times_seen),
      avg_time_ms: roundAverage(entry.time_values),
      last_answered_at: entry.last_answered_at,
      distractors,
      top_distractor: topDistractor
        ? {
            index: topDistractor.index,
            text: topDistractor.text,
            chosen_count: topDistractor.chosen_count
          }
        : null
    };
  });
}

function buildConceptRows(rows) {
  const concepts = new Map();

  for (const row of rows) {
    for (const concept of row.concepts) {
      const entry = concepts.get(concept) || { concept, correct: 0, total: 0 };
      entry.total += 1;
      entry.correct += row.is_correct;
      concepts.set(concept, entry);
    }
  }

  return Array.from(concepts.values())
    .map((entry) => ({
      concept: entry.concept,
      correct: entry.correct,
      total: entry.total,
      accuracy: roundRatio(entry.correct, entry.total)
    }))
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total || left.concept.localeCompare(right.concept));
}

function buildDifficultyRows(rows) {
  const difficulties = new Map();

  for (const row of rows) {
    const difficulty = normalizeDifficulty(row.difficulty);
    const entry = difficulties.get(difficulty) || { difficulty, correct: 0, total: 0 };
    entry.total += 1;
    entry.correct += row.is_correct;
    difficulties.set(difficulty, entry);
  }

  return Array.from(difficulties.values())
    .map((entry) => ({
      difficulty: entry.difficulty,
      correct: entry.correct,
      total: entry.total,
      accuracy: roundRatio(entry.correct, entry.total)
    }))
    .sort((left, right) => left.difficulty.localeCompare(right.difficulty));
}

function buildTiming(rows) {
  const timeRows = rows.filter((row) => row.time_ms != null);
  if (!timeRows.length) {
    return {
      overall_avg_ms: null,
      by_topic: [],
      median_ms: null
    };
  }

  const values = timeRows.map((row) => row.time_ms);
  const byTopic = new Map();
  for (const row of timeRows) {
    const entry = byTopic.get(row.topic) || { topic: row.topic, values: [] };
    entry.values.push(row.time_ms);
    byTopic.set(row.topic, entry);
  }

  return {
    overall_avg_ms: roundAverage(values),
    by_topic: Array.from(byTopic.values())
      .map((entry) => ({
        topic: entry.topic,
        avg_ms: roundAverage(entry.values),
        n: entry.values.length
      }))
      .sort((left, right) => left.topic.localeCompare(right.topic)),
    median_ms: median(values)
  };
}

function buildTopicWeights(topics, totalQuestions) {
  if (!topics.length) {
    return [];
  }

  const weights = topics.map((topic) => ({ ...topic, weight: 1 - topic.accuracy }));
  const weightSum = weights.reduce((sum, topic) => sum + topic.weight, 0);
  if (weightSum <= 0) {
    return distributeEvenly(topics.map((topic) => topic.topic), totalQuestions);
  }

  const counts = weights.map((topic) => ({
    topic: topic.topic,
    count: Math.max(1, Math.round((totalQuestions * topic.weight) / weightSum))
  }));
  const total = counts.reduce((sum, topic) => sum + topic.count, 0);
  if (total !== totalQuestions) {
    counts.sort((left, right) => right.count - left.count || left.topic.localeCompare(right.topic));
    counts[0].count += totalQuestions - total;
  }
  return counts.sort((left, right) => left.topic.localeCompare(right.topic));
}

function distributeEvenly(topics, totalQuestions) {
  if (!topics.length) {
    return [];
  }
  const base = Math.floor(totalQuestions / topics.length);
  let remainder = totalQuestions % topics.length;
  return [...topics]
    .sort((left, right) => left.localeCompare(right))
    .map((topic) => {
      const count = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder -= 1;
      }
      return { topic, count };
    });
}

function escapeCsv(value) {
  if (value == null) {
    return '';
  }
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function createQuizSet(payload) {
  if (!payload || typeof payload !== 'object') {
    throw badRequest('Request body must be a JSON object');
  }
  if (!payload.name || typeof payload.name !== 'string') {
    throw badRequest('name is required');
  }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw badRequest('questions must be a non-empty array');
  }

  payload.questions.forEach(validateQuestion);

  return runTransaction(() => {
    const createdAt = nowIso();
    const setResult = insertQuizSetStmt.run(
      payload.name.trim(),
      typeof payload.source_note === 'string' ? payload.source_note : null,
      typeof payload.topic_filter === 'string' ? payload.topic_filter : null,
      createdAt
    );
    const quizSetId = Number(setResult.lastInsertRowid);

    for (const question of payload.questions) {
      const concepts = Array.isArray(question.concepts)
        ? JSON.stringify(question.concepts.map((concept) => concept.trim()))
        : null;
      insertQuestionStmt.run(
        quizSetId,
        question.topic,
        typeof question.lesson === 'string' ? question.lesson : null,
        question.type,
        typeof question.difficulty === 'string' ? question.difficulty : null,
        question.stem,
        JSON.stringify(question.options),
        question.correct_index,
        typeof question.explanation === 'string' ? question.explanation : null,
        concepts,
        typeof question.bloom === 'string' ? question.bloom : null
      );
    }

    return { id: quizSetId, question_count: payload.questions.length };
  });
}

export function listQuizSets() {
  return listQuizSetsStmt.all().map((row) => ({
    id: row.id,
    name: row.name,
    source_note: row.source_note,
    topic_filter: row.topic_filter,
    created_at: row.created_at,
    question_count: row.question_count,
    attempt_count: row.attempt_count
  }));
}

export function getQuizSet(id) {
  const quizSet = getQuizSetStmt.get(id);
  if (!quizSet) {
    throw notFound('Quiz set not found');
  }
  const questions = getQuestionsForSetStmt.all(id).map(normalizeQuestion);
  return { ...quizSet, questions };
}

export function createAttempt(payload) {
  if (!payload || typeof payload !== 'object' || !Number.isInteger(payload.quiz_set_id)) {
    throw badRequest('quiz_set_id is required');
  }
  const quizSet = getQuizSetStmt.get(payload.quiz_set_id);
  if (!quizSet) {
    throw notFound('Quiz set not found');
  }
  const result = insertAttemptStmt.run(payload.quiz_set_id, nowIso());
  return { id: Number(result.lastInsertRowid) };
}

function normalizeIncomingResponses(payload) {
  if (!payload || typeof payload !== 'object') {
    throw badRequest('Request body must be a JSON object');
  }
  if (Array.isArray(payload.responses)) {
    if (payload.responses.length === 0) {
      throw badRequest('responses must be a non-empty array');
    }
    return payload.responses;
  }
  if (Number.isInteger(payload.question_id)) {
    return [payload];
  }
  throw badRequest('Body must contain a response object or responses array');
}

export function recordResponses(attemptId, payload) {
  const attempt = getAttemptStmt.get(attemptId);
  if (!attempt) {
    throw notFound('Attempt not found');
  }
  const responses = normalizeIncomingResponses(payload);

  return runTransaction(() => {
    for (let i = 0; i < responses.length; i += 1) {
      const response = responses[i];
      if (!response || typeof response !== 'object') {
        throw badRequest(`Response ${i + 1} must be an object`);
      }
      if (!Number.isInteger(response.question_id)) {
        throw badRequest(`Response ${i + 1} is missing question_id`);
      }
      if (!Number.isInteger(response.chosen_index)) {
        throw badRequest(`Response ${i + 1} is missing chosen_index`);
      }

      const question = getQuestionForAttemptStmt.get(attemptId, response.question_id);
      if (!question) {
        throw badRequest(`Question ${response.question_id} does not belong to this attempt`);
      }

      const options = parseOptions(question.options);
      if (response.chosen_index < 0 || response.chosen_index >= options.length) {
        throw badRequest(`Response ${i + 1} chosen_index is out of range`);
      }

      const isCorrect = response.chosen_index === question.correct_index ? 1 : 0;
      const timeMs = Number.isInteger(response.time_ms) && response.time_ms >= 0 ? response.time_ms : null;
      insertResponseStmt.run(attemptId, response.question_id, response.chosen_index, isCorrect, timeMs);
    }

    return { recorded: responses.length };
  });
}

export function finishAttempt(attemptId) {
  const attempt = getAttemptStmt.get(attemptId);
  if (!attempt) {
    throw notFound('Attempt not found');
  }

  const totals = finishAttemptTotalsStmt.get(attemptId);
  const score = totals.score ?? 0;
  const total = totals.total ?? 0;
  const finishedAt = nowIso();
  finishAttemptStmt.run(finishedAt, score, total, attemptId);

  return {
    id: attemptId,
    score,
    total,
    pct: roundRatio(score, total)
  };
}

export function getAnalytics() {
  const attempts = overallAttemptsStmt.get().attempts;
  const responseStats = overallResponsesStmt.get();
  const joinedRows = getJoinedResponseRows();

  return {
    overall: {
      attempts,
      questions_answered: responseStats.questions_answered,
      accuracy: roundRatio(responseStats.correct, responseStats.questions_answered)
    },
    by_topic: buildAccuracyRows(byTopicStmt.all(), 'topic'),
    by_type: buildAccuracyRows(byTypeStmt.all(), 'type'),
    by_lesson: buildAccuracyRows(byLessonStmt.all(), 'lesson'),
    by_difficulty: buildDifficultyRows(joinedRows),
    by_concept: buildConceptRows(joinedRows),
    timing: buildTiming(joinedRows),
    recent_attempts: recentAttemptsStmt.all().map((row) => ({
      id: row.id,
      quiz_set_id: row.quiz_set_id,
      set_name: row.set_name,
      score: row.score,
      total: row.total,
      finished_at: row.finished_at
    })),
    trend: trendStmt.all().map((row) => ({
      finished_at: row.finished_at,
      pct: roundRatio(row.score, row.total)
    }))
  };
}

export function getWrongResponses(limit = 100) {
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 100;
  return wrongResponsesStmt.all(normalizedLimit).map((row) => {
    const options = parseOptions(row.options);
    return {
      question_id: row.question_id,
      topic: row.topic,
      lesson: row.lesson,
      type: row.type,
      stem: row.stem,
      options,
      chosen_index: row.chosen_index,
      chosen_text: options[row.chosen_index] ?? null,
      correct_index: row.correct_index,
      correct_text: options[row.correct_index] ?? null,
      explanation: row.explanation,
      attempt_id: row.attempt_id,
      answered_at: row.answered_at
    };
  });
}

export function getQuestionAnalytics(limit = 200) {
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 200;
  return buildQuestionAnalytics(getJoinedResponseRows())
    .sort((left, right) => left.accuracy - right.accuracy || right.times_seen - left.times_seen || left.question_id - right.question_id)
    .slice(0, normalizedLimit);
}

export function getAnalyticsSummary() {
  const attempts = overallAttemptsStmt.get().attempts;
  const joinedRows = getJoinedResponseRows();
  const responseCount = joinedRows.length;
  const questionAnalytics = buildQuestionAnalytics(joinedRows);
  const weakestTopics = buildAccuracyRows(byTopicStmt.all(), 'topic')
    .filter((row) => row.total >= 1 && row.accuracy < 0.8)
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total || left.topic.localeCompare(right.topic))
    .map((row) => ({ topic: row.topic, accuracy: row.accuracy, n: row.total }))
    .slice(0, 8);
  const weakestConcepts = buildConceptRows(joinedRows)
    .filter((row) => row.total >= 1 && row.accuracy < 0.8)
    .map((row) => ({ concept: row.concept, accuracy: row.accuracy, n: row.total }))
    .slice(0, 8);
  const repeatMisses = questionAnalytics
    .filter((row) => row.times_seen >= 2 && (row.times_correct / row.times_seen) < 0.5)
    .sort((left, right) => left.accuracy - right.accuracy || right.times_seen - left.times_seen || left.question_id - right.question_id)
    .map((row) => ({
      question_id: row.question_id,
      stem: row.stem,
      topic: row.topic,
      times_seen: row.times_seen,
      times_correct: row.times_correct
    }))
    .slice(0, 10);

  const timing = buildTiming(joinedRows);
  const medianMs = timing.median_ms;
  const slowButCorrect = medianMs == null
    ? []
    : questionAnalytics
        .filter((row) => row.avg_time_ms != null && row.times_correct > (row.times_seen / 2) && row.avg_time_ms > 1.5 * medianMs)
        .sort((left, right) => right.avg_time_ms - left.avg_time_ms || left.question_id - right.question_id)
        .map((row) => ({
          question_id: row.question_id,
          topic: row.topic,
          avg_time_ms: row.avg_time_ms
        }))
        .slice(0, 10);
  const fastButWrong = medianMs == null
    ? []
    : questionAnalytics
        .filter((row) => row.avg_time_ms != null && row.times_correct < (row.times_seen / 2) && row.avg_time_ms < 0.5 * medianMs)
        .sort((left, right) => left.avg_time_ms - right.avg_time_ms || left.question_id - right.question_id)
        .map((row) => ({
          question_id: row.question_id,
          topic: row.topic,
          avg_time_ms: row.avg_time_ms
        }))
        .slice(0, 10);

  let recommendedNextSet;
  if (attempts === 0) {
    const topics = distinctTopicsStmt.all().map((row) => row.topic);
    recommendedNextSet = {
      total_questions: 15,
      topic_weights: distributeEvenly(topics, 15),
      target_concepts: [],
      include_question_ids: [],
      notes: 'No attempts yet — broad diagnostic across all topics.'
    };
  } else {
    const fallbackTopics = distinctTopicsStmt.all().map((row) => row.topic);
    recommendedNextSet = {
      total_questions: 15,
      topic_weights: weakestTopics.length ? buildTopicWeights(weakestTopics, 15) : distributeEvenly(fallbackTopics, 15),
      target_concepts: weakestConcepts.slice(0, 5).map((row) => row.concept),
      include_question_ids: repeatMisses.slice(0, 5).map((row) => row.question_id),
      notes: 'Weighted toward lowest-accuracy topics; re-includes repeat-missed questions.'
    };
  }

  return {
    generated_from: {
      attempts,
      responses: responseCount
    },
    weakest_topics: weakestTopics,
    weakest_concepts: weakestConcepts,
    repeat_misses: repeatMisses,
    slow_but_correct: slowButCorrect,
    fast_but_wrong: fastButWrong,
    recommended_next_set: recommendedNextSet
  };
}

export function exportResponses(format = 'json') {
  const rows = getJoinedResponseRows().map((row) => ({
    response_id: row.response_id,
    attempt_id: row.attempt_id,
    attempt_started_at: row.attempt_started_at,
    attempt_finished_at: row.attempt_finished_at,
    quiz_set_id: row.quiz_set_id,
    quiz_set_name: row.quiz_set_name,
    question_id: row.question_id,
    topic: row.topic,
    lesson: row.lesson,
    type: row.type,
    difficulty: row.difficulty,
    bloom: row.bloom,
    concepts: row.concepts,
    stem: row.stem,
    chosen_index: row.chosen_index,
    chosen_text: row.chosen_text,
    correct_index: row.correct_index,
    correct_text: row.correct_text,
    is_correct: row.is_correct,
    time_ms: row.time_ms
  }));

  if (format === 'csv') {
    const headers = [
      'response_id',
      'attempt_id',
      'attempt_started_at',
      'attempt_finished_at',
      'quiz_set_id',
      'quiz_set_name',
      'question_id',
      'topic',
      'lesson',
      'type',
      'difficulty',
      'bloom',
      'concepts',
      'stem',
      'chosen_index',
      'chosen_text',
      'correct_index',
      'correct_text',
      'is_correct',
      'time_ms'
    ];
    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => {
        const value = header === 'concepts' ? row.concepts.join(';') : row[header];
        return escapeCsv(value);
      }).join(','))
    ];
    return {
      contentType: 'text/csv; charset=utf-8',
      body: lines.join('\n')
    };
  }

  return {
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(rows)
  };
}
