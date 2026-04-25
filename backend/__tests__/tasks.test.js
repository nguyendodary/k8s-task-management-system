'use strict';

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

let app;
let pool;
let redisClient;
let authToken;
let testUserId;

// ── Bootstrap ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  const { pool: _pool, initDB } = require('../config/database');
  redisClient = require('../config/redis');

  pool = _pool;
  await initDB();
  await redisClient.connect();

  const authRoutes = require('../routes/auth');
  const taskRoutes = require('../routes/tasks');
  const userRoutes = require('../routes/users');

  app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/users', userRoutes);

  // Register a test user once and keep the token for all task tests
  const email = `tasks-user-${Date.now()}@test.example`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123' });

  authToken = res.body.token;
  testUserId = res.body.user.id;
});

afterAll(async () => {
  await pool.query("DELETE FROM tasks WHERE title LIKE 'Test%'");
  await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  await pool.end();
  await redisClient.quit();
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/tasks — Create
// ──────────────────────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test task one', description: 'Some description', status: 'todo' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test task one');
    expect(res.body.status).toBe('todo');
  });

  it('rejects a task without a title (400)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'No title here' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid status value (400)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test bad status', status: 'invalid-status' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test unauthenticated' });

    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/tasks — List (Redis cache)
// ──────────────────────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  it('returns an array of tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('serves subsequent requests from Redis cache (same payload)', async () => {
    const first = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);

    const second = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/tasks/:id — Single task
// ──────────────────────────────────────────────────────────────────────────
describe('GET /api/tasks/:id', () => {
  let taskId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test single-get task', status: 'todo' });
    taskId = res.body.id;
  });

  it('returns the task by id', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskId);
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .get('/api/tasks/999999')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PUT /api/tasks/:id — Update
// ──────────────────────────────────────────────────────────────────────────
describe('PUT /api/tasks/:id', () => {
  let taskId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test update task', status: 'todo' });
    taskId = res.body.id;
  });

  it('updates the task and returns the new data', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test update task', status: 'in-progress', description: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-progress');
    expect(res.body.description).toBe('Updated');
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/api/tasks/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test ghost task', status: 'todo' });

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id
// ──────────────────────────────────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  let taskId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test delete task', status: 'done' });
    taskId = res.body.id;
  });

  it('deletes the task and returns success message', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 after the task is deleted', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});
