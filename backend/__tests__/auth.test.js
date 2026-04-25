'use strict';

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// ── Lazy-require so env vars are set before module load ────────────────────
let app;
let pool;
let redisClient;

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
});

afterAll(async () => {
  // Clean up test data
  await pool.query("DELETE FROM tasks WHERE title LIKE 'Test%'");
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.example'");
  await pool.end();
  await redisClient.quit();
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const email = `register-${Date.now()}@test.example`;

  it('creates a new user and returns a JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email });
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `short-pw-${Date.now()}@test.example`, password: '123' });

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  const email = `login-${Date.now()}@test.example`;
  const password = 'securePass99';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ email, password });
  });

  it('returns a JWT token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(email);
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects non-existent user with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.example', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/auth/profile
// ──────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/profile', () => {
  let token;
  const email = `profile-${Date.now()}@test.example`;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123' });
    token = res.body.token;
  });

  it('returns the user profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body).not.toHaveProperty('password');
  });

  it('rejects requests without a token with 401', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer this.is.invalid');
    expect(res.status).toBe(401);
  });
});
