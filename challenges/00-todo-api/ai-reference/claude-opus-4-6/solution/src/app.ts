import express, { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, '..', 'data', 'todos.db');
const db = new Database(dbPath);

// Create todos table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    dueDate TEXT,
    completedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT
  )
`);

// Types
interface Todo {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CreateTodoBody {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

interface UpdateTodoBody {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  status?: 'active' | 'completed';
}

interface BatchBody {
  action: 'complete' | 'delete';
  ids: string[];
}

// Priority order for sorting
const priorityOrder: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3
};

// Validation helper
function validateTodo(body: CreateTodoBody, isUpdate = false): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isUpdate) {
    if (!body.title || typeof body.title !== 'string') {
      errors.push('title is required');
    } else if (body.title.length < 1 || body.title.length > 200) {
      errors.push('title must be between 1 and 200 characters');
    }
  } else {
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
        errors.push('title must be between 1 and 200 characters');
      }
    }
  }

  if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
    errors.push('priority must be one of: low, medium, high');
  }

  if (body.dueDate !== undefined && body.dueDate !== null) {
    const date = new Date(body.dueDate);
    if (isNaN(date.getTime())) {
      errors.push('dueDate must be a valid ISO 8601 date');
    }
    // Only validate dueDate is not in the past for create operations
    if (!isUpdate && date < new Date()) {
      errors.push('dueDate cannot be in the past');
    }
  }

  return { valid: errors.length === 0, errors };
}

// Test reset endpoint
app.delete('/api/todos/test-reset', (_req: Request, res: Response) => {
  db.exec('DELETE FROM todos');
  res.status(200).json({ message: 'Database reset' });
});

// 1. Create Todo
app.post('/api/todos', (req: Request, res: Response) => {
  const body = req.body as CreateTodoBody;

  const validation = validateTodo(body);
  if (!validation.valid) {
    return res.status(422).json({ error: 'Validation failed', details: validation.errors });
  }

  const now = new Date().toISOString();
  const todo: Todo = {
    id: uuidv4(),
    title: body.title,
    description: body.description || '',
    priority: body.priority || 'medium',
    status: 'active',
    dueDate: body.dueDate || null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  const stmt = db.prepare(`
    INSERT INTO todos (id, title, description, priority, status, dueDate, completedAt, createdAt, updatedAt, deletedAt)
    VALUES (@id, @title, @description, @priority, @status, @dueDate, @completedAt, @createdAt, @updatedAt, @deletedAt)
  `);

  stmt.run({
    id: todo.id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    status: todo.status,
    dueDate: todo.dueDate,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    deletedAt: todo.deletedAt
  });

  res.status(201).json(todo);
});

// 7. Statistics endpoint (before /:id to avoid route conflicts)
app.get('/api/todos/stats', (_req: Request, res: Response) => {
  const stats = {
    total: 0,
    active: 0,
    completed: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0
    }
  };

  // Get total count (excluding soft-deleted)
  const totalResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL').get() as { count: number };
  stats.total = totalResult.count;

  // Get active count
  const activeResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL AND status = ?').get('active') as { count: number };
  stats.active = activeResult.count;

  // Get completed count
  const completedResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL AND status = ?').get('completed') as { count: number };
  stats.completed = completedResult.count;

  // Get counts by priority
  const lowResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL AND priority = ?').get('low') as { count: number };
  stats.byPriority.low = lowResult.count;

  const mediumResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL AND priority = ?').get('medium') as { count: number };
  stats.byPriority.medium = mediumResult.count;

  const highResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL AND priority = ?').get('high') as { count: number };
  stats.byPriority.high = highResult.count;

  res.status(200).json(stats);
});

// 6. Batch operations (before /:id to avoid route conflicts)
app.post('/api/todos/batch', (req: Request, res: Response) => {
  const { action, ids } = req.body as BatchBody;

  if (!action || !['complete', 'delete'].includes(action)) {
    return res.status(422).json({ error: 'Invalid action. Must be "complete" or "delete"' });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(422).json({ error: 'ids must be a non-empty array' });
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ id: string; reason: string }>
  };

  const now = new Date().toISOString();

  // Use transaction for atomicity
  const transaction = db.transaction(() => {
    for (const id of ids) {
      // Check if todo exists and is not deleted
      const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND deletedAt IS NULL').get(id) as Todo | undefined;

      if (!todo) {
        results.failed++;
        results.errors.push({ id, reason: 'Todo not found or already deleted' });
        continue;
      }

      if (action === 'complete') {
        const result = db.prepare(`
          UPDATE todos SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL
        `).run('completed', now, now, id);

        if (result.changes > 0) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ id, reason: 'Failed to update' });
        }
      } else if (action === 'delete') {
        const result = db.prepare(`
          UPDATE todos SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL
        `).run(now, now, id);

        if (result.changes > 0) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ id, reason: 'Failed to delete' });
        }
      }
    }
  });

  transaction();

  res.status(200).json(results);
});

// 6b. Clear completed todos
app.delete('/api/todos', (req: Request, res: Response) => {
  const { status } = req.query;

  if (status === 'completed') {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE todos SET deletedAt = ?, updatedAt = ? WHERE status = ? AND deletedAt IS NULL
    `).run(now, now, 'completed');

    return res.status(200).json({ deleted: result.changes });
  }

  res.status(400).json({ error: 'Invalid operation. Use ?status=completed to clear completed todos.' });
});

// 2. Get single Todo
app.get('/api/todos/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND deletedAt IS NULL').get(id) as Todo | undefined;

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.status(200).json(todo);
});

// 3. Get Todo list with pagination, filtering, sorting, and search
app.get('/api/todos', (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    status = 'all',
    priority,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = req.query;

  // Parse pagination
  let pageNum = parseInt(page as string, 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;

  let limitNum = parseInt(limit as string, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 20;
  if (limitNum > 100) limitNum = 100;

  const offset = (pageNum - 1) * limitNum;

  // Build query
  let whereClause = 'WHERE deletedAt IS NULL';
  const params: (string | number)[] = [];

  // Status filter
  if (status === 'active') {
    whereClause += ' AND status = ?';
    params.push('active');
  } else if (status === 'completed') {
    whereClause += ' AND status = ?';
    params.push('completed');
  }

  // Priority filter
  if (priority && ['low', 'medium', 'high'].includes(priority as string)) {
    whereClause += ' AND priority = ?';
    params.push(priority as string);
  }

  // Search filter
  if (search && typeof search === 'string' && search.trim()) {
    whereClause += ' AND (title LIKE ? OR description LIKE ?)';
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern);
  }

  // Validate sortBy
  const validSortColumns = ['createdAt', 'dueDate', 'priority'];
  const sortColumn = validSortColumns.includes(sortBy as string) ? (sortBy as string) : 'createdAt';

  // Validate sortOrder
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Handle priority sorting (custom order)
  let orderByClause: string;
  if (sortColumn === 'priority') {
    if (order === 'ASC') {
      // High to low (high=1, medium=2, low=3)
      orderByClause = `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC`;
    } else {
      // Low to high (low=3, medium=2, high=1)
      orderByClause = `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END DESC`;
    }
  } else {
    orderByClause = `${sortColumn} ${order}`;
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM todos ${whereClause}`;
  const countResult = db.prepare(countQuery).get(...params) as { count: number };
  const total = countResult.count;
  const totalPages = Math.ceil(total / limitNum);

  // Get paginated results
  const dataQuery = `SELECT * FROM todos ${whereClause} ORDER BY ${orderByClause} LIMIT ? OFFSET ?`;
  const dataParams = [...params, limitNum, offset];
  const data = db.prepare(dataQuery).all(...dataParams) as Todo[];

  res.status(200).json({
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages
  });
});

// 4. Update Todo
app.put('/api/todos/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as UpdateTodoBody;

  // Check if todo exists and is not deleted
  const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ? AND deletedAt IS NULL').get(id) as Todo | undefined;

  if (!existingTodo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  // Validate updates
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
      return res.status(422).json({ error: 'title must be between 1 and 200 characters' });
    }
  }

  if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
    return res.status(422).json({ error: 'priority must be one of: low, medium, high' });
  }

  if (body.status && !['active', 'completed'].includes(body.status)) {
    return res.status(422).json({ error: 'status must be one of: active, completed' });
  }

  if (body.dueDate !== undefined && body.dueDate !== null) {
    const date = new Date(body.dueDate);
    if (isNaN(date.getTime())) {
      return res.status(422).json({ error: 'dueDate must be a valid ISO 8601 date' });
    }
  }

  const now = new Date().toISOString();

  // Build update
  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    params.push(body.title);
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    params.push(body.description);
  }

  if (body.priority !== undefined) {
    updates.push('priority = ?');
    params.push(body.priority);
  }

  if (body.dueDate !== undefined) {
    updates.push('dueDate = ?');
    params.push(body.dueDate || null);
  }

  if (body.status !== undefined) {
    updates.push('status = ?');
    params.push(body.status);

    if (body.status === 'completed' && !existingTodo.completedAt) {
      updates.push('completedAt = ?');
      params.push(now);
    } else if (body.status === 'active') {
      updates.push('completedAt = ?');
      params.push(null);
    }
  }

  if (updates.length === 0) {
    // No updates, return existing todo
    return res.status(200).json(existingTodo);
  }

  updates.push('updatedAt = ?');
  params.push(now);

  params.push(id);

  const updateQuery = `UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND deletedAt IS NULL`;
  db.prepare(updateQuery).run(...params);

  // Get updated todo
  const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo;

  res.status(200).json(updatedTodo);
});

// 5. Soft delete Todo
app.delete('/api/todos/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if todo exists and is not already deleted
  const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ? AND deletedAt IS NULL').get(id) as Todo | undefined;

  if (!existingTodo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  const now = new Date().toISOString();

  db.prepare('UPDATE todos SET deletedAt = ?, updatedAt = ? WHERE id = ?').run(now, now, id);

  res.status(200).json({ message: 'Todo deleted' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for CommonJS
module.exports = { app };
