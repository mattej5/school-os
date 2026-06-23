import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import {
  createAttempt,
  createQuizSet,
  exportResponses,
  finishAttempt,
  getAnalytics,
  getAnalyticsSummary,
  getQuestionAnalytics,
  getQuizSet,
  getWrongResponses,
  listQuizSets,
  recordResponses
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const defaultPort = 4321;
const port = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10) || defaultPort;
const host = '127.0.0.1';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, contentType, body) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendError(res, error) {
  const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
  sendJson(res, statusCode, { error: error.message || 'Internal server error' });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) {
    return {};
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error('Invalid JSON body');
    error.statusCode = 400;
    throw error;
  }
}

function getStaticFilePath(pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(publicDir, requested));
  if (!resolved.startsWith(publicDir)) {
    return null;
  }
  return resolved;
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.js')) {
    return 'text/javascript; charset=utf-8';
  }
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  return 'application/octet-stream';
}

async function handleApi(req, res, url) {
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/quiz-sets') {
    sendJson(res, 200, listQuizSets());
    return;
  }

  if (req.method === 'POST' && pathname === '/api/quiz-sets') {
    const body = await readJsonBody(req);
    sendJson(res, 201, createQuizSet(body));
    return;
  }

  const quizSetMatch = pathname.match(/^\/api\/quiz-sets\/(\d+)$/);
  if (req.method === 'GET' && quizSetMatch) {
    sendJson(res, 200, getQuizSet(Number(quizSetMatch[1])));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/attempts') {
    const body = await readJsonBody(req);
    sendJson(res, 201, createAttempt(body));
    return;
  }

  const responsesMatch = pathname.match(/^\/api\/attempts\/(\d+)\/responses$/);
  if (req.method === 'POST' && responsesMatch) {
    const body = await readJsonBody(req);
    sendJson(res, 201, recordResponses(Number(responsesMatch[1]), body));
    return;
  }

  const finishMatch = pathname.match(/^\/api\/attempts\/(\d+)\/finish$/);
  if (req.method === 'POST' && finishMatch) {
    sendJson(res, 200, finishAttempt(Number(finishMatch[1])));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/analytics') {
    sendJson(res, 200, getAnalytics());
    return;
  }

  if (req.method === 'GET' && pathname === '/api/analytics/wrong') {
    const limit = url.searchParams.has('limit') ? Number.parseInt(url.searchParams.get('limit'), 10) : 100;
    sendJson(res, 200, getWrongResponses(limit));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/analytics/questions') {
    const limit = url.searchParams.has('limit') ? Number.parseInt(url.searchParams.get('limit'), 10) : 200;
    sendJson(res, 200, getQuestionAnalytics(limit));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/analytics/summary') {
    sendJson(res, 200, getAnalyticsSummary());
    return;
  }

  if (req.method === 'GET' && pathname === '/api/export') {
    const format = url.searchParams.get('format') || 'json';
    if (format !== 'json' && format !== 'csv') {
      const error = new Error('format must be json or csv');
      error.statusCode = 400;
      throw error;
    }
    const exported = exportResponses(format);
    sendText(res, 200, exported.contentType, exported.body);
    return;
  }

  const error = new Error('Not found');
  error.statusCode = 404;
  throw error;
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method !== 'GET') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const filePath = getStaticFilePath(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    sendText(res, 200, getContentType(filePath), fs.readFileSync(filePath));
  } catch (error) {
    sendError(res, error);
  }
}

export const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  server.listen(port, host, () => {
    console.log(`http://localhost:${port}`);
  });
}

export { handleRequest };
