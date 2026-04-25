const express = require('express');
const Joi = require('joi');
const { pool } = require('../config/database');
const redisClient = require('../config/redis');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CACHE_KEY = 'tasks:all';
const CACHE_TTL = 300; // 5 minutes

const taskSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(1000).allow('', null),
  status: Joi.string().valid('todo', 'in-progress', 'done').default('todo'),
  assigned_to: Joi.number().integer().allow(null)
});

// Get all tasks (with Redis caching)
router.get('/', authenticate, async (req, res) => {
  try {
    // Try to get from cache
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await pool.query(`
      SELECT t.*, u.email as assigned_email 
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.created_at DESC
    `);

    // Cache the result
    await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(result.rows));

    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.email as assigned_email 
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticate, async (req, res) => {
  try {
    const { error } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, status, assigned_to } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, assigned_to, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [title, description, status, assigned_to, req.user.id]
    );

    // Invalidate cache
    await redisClient.del(CACHE_KEY);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { error } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, status, assigned_to } = req.body;

    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, status = $3, assigned_to = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, description, status, assigned_to, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Invalidate cache
    await redisClient.del(CACHE_KEY);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Invalidate cache
    await redisClient.del(CACHE_KEY);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
