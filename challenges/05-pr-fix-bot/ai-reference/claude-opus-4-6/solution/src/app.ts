import express, { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// Initialize SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    labels TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL,
    issue_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id)
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    issue_id TEXT UNIQUE NOT NULL,
    root_cause TEXT,
    suggested_fix TEXT,
    affected_files TEXT,
    confidence REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id)
  );

  CREATE TABLE IF NOT EXISTS fixes (
    id TEXT PRIMARY KEY,
    issue_id TEXT UNIQUE NOT NULL,
    file_path TEXT,
    original_content TEXT,
    fixed_content TEXT,
    diff TEXT,
    applied INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id)
  );

  CREATE TABLE IF NOT EXISTS prs (
    id TEXT PRIMARY KEY,
    issue_id TEXT UNIQUE NOT NULL,
    title TEXT,
    body TEXT,
    head_branch TEXT,
    base_branch TEXT,
    files TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id)
  );
`);

// Helper to parse JSON fields safely
function parseJsonSafe(value: string | null, defaultValue: any = null) {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

// ============ Issues API ============

// POST /api/issues - Create issue
app.post('/api/issues', (req: Request, res: Response) => {
  const { title, description, severity = 'medium', labels = [] } = req.body;
  const id = uuidv4();
  const status = 'open';

  const stmt = db.prepare(
    'INSERT INTO issues (id, title, description, severity, labels, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, title, description, severity, JSON.stringify(labels), status);

  const result = {
    id,
    title,
    description,
    severity,
    labels,
    status
  };

  res.status(201).json(result);
});

// GET /api/issues - List issues with filters
app.get('/api/issues', (req: Request, res: Response) => {
  const { severity, status, label } = req.query;

  let sql = 'SELECT * FROM issues WHERE 1=1';
  const params: any[] = [];

  if (severity) {
    sql += ' AND severity = ?';
    params.push(severity);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  let issues = rows.map(row => ({
    ...row,
    labels: parseJsonSafe(row.labels, [])
  }));

  if (label) {
    issues = issues.filter(issue =>
      issue.labels.includes(label)
    );
  }

  res.json({ issues });
});

// GET /api/issues/:id - Get issue details
app.get('/api/issues/:id', (req: Request, res: Response) => {
  const stmt = db.prepare('SELECT * FROM issues WHERE id = ?');
  const row = stmt.get(req.params.id) as any;

  if (!row) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  res.json({
    ...row,
    labels: parseJsonSafe(row.labels, [])
  });
});

// POST /api/issues/:id/close - Close issue
app.post('/api/issues/:id/close', (req: Request, res: Response) => {
  const stmt = db.prepare('UPDATE issues SET status = ? WHERE id = ?');
  stmt.run('closed', req.params.id);

  res.json({ status: 'closed' });
});

// ============ Snippets API ============

// POST /api/snippets - Create snippet
app.post('/api/snippets', (req: Request, res: Response) => {
  const { language, filePath, content, issueId } = req.body;
  const id = uuidv4();

  const stmt = db.prepare(
    'INSERT INTO snippets (id, language, file_path, content, issue_id) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, language, filePath, content, issueId || null);

  res.status(201).json({
    id,
    language,
    filePath,
    content,
    issueId
  });
});

// GET /api/snippets/:id - Get snippet
app.get('/api/snippets/:id', (req: Request, res: Response) => {
  const stmt = db.prepare('SELECT * FROM snippets WHERE id = ?');
  const row = stmt.get(req.params.id) as any;

  if (!row) {
    return res.status(404).json({ error: 'Snippet not found' });
  }

  res.json({
    id: row.id,
    language: row.language,
    filePath: row.file_path,
    content: row.content,
    issueId: row.issue_id
  });
});

// GET /api/issues/:id/snippets - Get snippets for issue
app.get('/api/issues/:id/snippets', (req: Request, res: Response) => {
  const stmt = db.prepare('SELECT * FROM snippets WHERE issue_id = ?');
  const rows = stmt.all(req.params.id) as any[];

  const snippets = rows.map(row => ({
    id: row.id,
    language: row.language,
    filePath: row.file_path,
    content: row.content,
    issueId: row.issue_id
  }));

  res.json({ snippets });
});

// ============ Analysis API ============

// POST /api/issues/:id/analyze - Analyze issue
app.post('/api/issues/:id/analyze', (req: Request, res: Response) => {
  const issueId = req.params.id;

  // Get issue
  const issueStmt = db.prepare('SELECT * FROM issues WHERE id = ?');
  const issue = issueStmt.get(issueId) as any;

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Get related snippets
  const snippetsStmt = db.prepare('SELECT * FROM snippets WHERE issue_id = ?');
  const snippets = snippetsStmt.all(issueId) as any[];

  // Calculate confidence based on snippets
  let confidence: number;
  if (snippets.length > 0) {
    confidence = 0.7 + (snippets.length * 0.05); // 0.7 to 0.9
    if (confidence > 0.9) confidence = 0.9;
  } else {
    confidence = 0.3 + (issue.description && issue.description.length > 50 ? 0.2 : 0); // 0.3 to 0.5
  }

  // Generate analysis
  const rootCause = `Root cause identified for "${issue.title}": ${issue.description || 'No description provided'}`;
  const suggestedFix = snippets.length > 0
    ? `Fix suggested based on code analysis: Review the ${snippets.map(s => s.file_path).join(', ')} file(s) for potential issues.`
    : 'No code snippets available. Please provide code for better analysis.';
  const affectedFiles = snippets.map(s => s.file_path);

  // Save analysis
  const analysisId = uuidv4();
  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO analyses (id, issue_id, root_cause, suggested_fix, affected_files, confidence) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStmt.run(analysisId, issueId, rootCause, suggestedFix, JSON.stringify(affectedFiles), confidence);

  res.json({
    rootCause,
    suggestedFix,
    affectedFiles,
    confidence
  });
});

// ============ Fix Generation API ============

// POST /api/issues/:id/fix - Generate fix
app.post('/api/issues/:id/fix', (req: Request, res: Response) => {
  const issueId = req.params.id;

  // Get issue
  const issueStmt = db.prepare('SELECT * FROM issues WHERE id = ?');
  const issue = issueStmt.get(issueId) as any;

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Get analysis
  const analysisStmt = db.prepare('SELECT * FROM analyses WHERE issue_id = ?');
  const analysis = analysisStmt.get(issueId) as any;

  // Get snippets
  const snippetsStmt = db.prepare('SELECT * FROM snippets WHERE issue_id = ?');
  const snippets = snippetsStmt.all(issueId) as any[];

  // Generate fix
  let filePath = 'unknown';
  let originalContent = '';
  let fixedContent = '';

  if (snippets.length > 0) {
    filePath = snippets[0].file_path;
    originalContent = snippets[0].content;
    // Generate a simple "fix" - this is simulated
    fixedContent = originalContent.replace(/undefined/g, 'null')
      .replace(/onClick={undefined}/g, 'onClick={() => handleClick()}')
      .replace(/return undefined;/g, 'return [];');
  } else {
    filePath = `fix-${issueId}.js`;
    originalContent = '// No original code provided';
    fixedContent = `// Fix for: ${issue.title}\n// Apply appropriate fix based on: ${analysis?.root_cause || 'analysis'}`;
  }

  // Generate simple diff
  const diff = generateDiff(originalContent, fixedContent, filePath);

  // Save fix
  const fixId = uuidv4();
  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO fixes (id, issue_id, file_path, original_content, fixed_content, diff) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStmt.run(fixId, issueId, filePath, originalContent, fixedContent, diff);

  // Update issue status
  const updateStmt = db.prepare('UPDATE issues SET status = ? WHERE id = ?');
  updateStmt.run('fix_generated', issueId);

  res.json({
    patch: {
      filePath,
      originalContent,
      fixedContent,
      diff
    },
    issueId
  });
});

// Helper to generate simple diff
function generateDiff(original: string, fixed: string, filePath: string): string {
  const originalLines = original.split('\n');
  const fixedLines = fixed.split('\n');

  let diff = `--- a/${filePath}\n+++ b/${filePath}\n`;

  for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
    const origLine = originalLines[i];
    const fixedLine = fixedLines[i];

    if (origLine !== fixedLine) {
      if (origLine !== undefined) {
        diff += `-${origLine}\n`;
      }
      if (fixedLine !== undefined) {
        diff += `+${fixedLine}\n`;
      }
    } else if (origLine !== undefined) {
      diff += ` ${origLine}\n`;
    }
  }

  return diff;
}

// ============ Fix Application API ============

// POST /api/issues/:id/apply-fix - Apply fix
app.post('/api/issues/:id/apply-fix', (req: Request, res: Response) => {
  const issueId = req.params.id;

  // Get fix
  const fixStmt = db.prepare('SELECT * FROM fixes WHERE issue_id = ?');
  const fix = fixStmt.get(issueId) as any;

  if (!fix) {
    return res.status(400).json({ error: 'No fix generated for this issue' });
  }

  // Update fix as applied
  const updateFixStmt = db.prepare('UPDATE fixes SET applied = 1 WHERE id = ?');
  updateFixStmt.run(fix.id);

  // Update snippet content if exists
  const updateSnippetStmt = db.prepare('UPDATE snippets SET content = ? WHERE issue_id = ? AND file_path = ?');
  updateSnippetStmt.run(fix.fixed_content, issueId, fix.file_path);

  // Update issue status
  const updateIssueStmt = db.prepare('UPDATE issues SET status = ? WHERE id = ?');
  updateIssueStmt.run('fix_applied', issueId);

  res.json({ status: 'applied', fixId: fix.id });
});

// ============ PR Creation API ============

// POST /api/issues/:id/create-pr - Create PR
app.post('/api/issues/:id/create-pr', (req: Request, res: Response) => {
  const issueId = req.params.id;

  // Get issue
  const issueStmt = db.prepare('SELECT * FROM issues WHERE id = ?');
  const issue = issueStmt.get(issueId) as any;

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Get fix
  const fixStmt = db.prepare('SELECT * FROM fixes WHERE issue_id = ?');
  const fix = fixStmt.get(issueId) as any;

  // Get snippets for files
  const snippetsStmt = db.prepare('SELECT * FROM snippets WHERE issue_id = ?');
  const snippets = snippetsStmt.all(issueId) as any[];

  const files = snippets.length > 0
    ? snippets.map(s => s.file_path)
    : (fix ? [fix.file_path] : []);

  // Create PR
  const prId = uuidv4();
  const headBranch = `fix/issue-${issueId.substring(0, 8)}`;
  const baseBranch = 'main';
  const title = `Fix: ${issue.title}`;
  const body = `## Summary\nFixes #${issueId}\n\n${fix?.diff || 'Auto-generated fix'}`;

  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO prs (id, issue_id, title, body, head_branch, base_branch, files) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertStmt.run(prId, issueId, title, body, headBranch, baseBranch, JSON.stringify(files));

  // Update issue status
  const updateStmt = db.prepare('UPDATE issues SET status = ? WHERE id = ?');
  updateStmt.run('pr_created', issueId);

  res.json({
    pr: {
      id: prId,
      title,
      body,
      headBranch,
      baseBranch,
      files,
      issueId
    }
  });
});

// ============ Auto-Fix API ============

// POST /api/issues/:id/auto-fix - Full workflow
app.post('/api/issues/:id/auto-fix', async (req: Request, res: Response) => {
  const issueId = req.params.id;

  // Create mock response objects to capture results
  let analysisResult: any = null;
  let fixResult: any = null;
  let prResult: any = null;

  // Get issue
  const issueStmt = db.prepare('SELECT * FROM issues WHERE id = ?');
  const issue = issueStmt.get(issueId) as any;

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Get snippets
  const snippetsStmt = db.prepare('SELECT * FROM snippets WHERE issue_id = ?');
  const snippets = snippetsStmt.all(issueId) as any[];

  // Step 1: Analyze
  let confidence: number;
  if (snippets.length > 0) {
    confidence = 0.7 + (snippets.length * 0.05);
    if (confidence > 0.9) confidence = 0.9;
  } else {
    confidence = 0.3 + (issue.description && issue.description.length > 50 ? 0.2 : 0);
  }

  const rootCause = `Root cause identified for "${issue.title}": ${issue.description || 'No description provided'}`;
  const suggestedFix = snippets.length > 0
    ? `Fix suggested based on code analysis: Review the ${snippets.map(s => s.file_path).join(', ')} file(s).`
    : 'No code snippets available.';
  const affectedFiles = snippets.map(s => s.file_path);

  const analysisId = uuidv4();
  const insertAnalysisStmt = db.prepare(
    'INSERT OR REPLACE INTO analyses (id, issue_id, root_cause, suggested_fix, affected_files, confidence) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertAnalysisStmt.run(analysisId, issueId, rootCause, suggestedFix, JSON.stringify(affectedFiles), confidence);

  analysisResult = {
    rootCause,
    suggestedFix,
    affectedFiles,
    confidence
  };

  // Step 2: Generate Fix
  let filePath = 'unknown';
  let originalContent = '';
  let fixedContent = '';

  if (snippets.length > 0) {
    filePath = snippets[0].file_path;
    originalContent = snippets[0].content;
    fixedContent = originalContent.replace(/undefined/g, 'null')
      .replace(/onClick={undefined}/g, 'onClick={() => handleClick()}')
      .replace(/return undefined;/g, 'return [];');
  } else {
    filePath = `fix-${issueId}.js`;
    originalContent = '// No original code';
    fixedContent = `// Fix for: ${issue.title}`;
  }

  const diff = generateDiff(originalContent, fixedContent, filePath);

  const fixId = uuidv4();
  const insertFixStmt = db.prepare(
    'INSERT OR REPLACE INTO fixes (id, issue_id, file_path, original_content, fixed_content, diff) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertFixStmt.run(fixId, issueId, filePath, originalContent, fixedContent, diff);

  fixResult = {
    patch: {
      filePath,
      originalContent,
      fixedContent,
      diff
    },
    issueId
  };

  // Step 3: Apply Fix
  const updateFixStmt = db.prepare('UPDATE fixes SET applied = 1 WHERE id = ?');
  updateFixStmt.run(fixId);

  const updateSnippetStmt = db.prepare('UPDATE snippets SET content = ? WHERE issue_id = ? AND file_path = ?');
  updateSnippetStmt.run(fixedContent, issueId, filePath);

  // Step 4: Create PR
  const prId = uuidv4();
  const headBranch = `fix/issue-${issueId.substring(0, 8)}`;
  const baseBranch = 'main';
  const prTitle = `Fix: ${issue.title}`;
  const prBody = `## Summary\nFixes #${issueId}\n\n${diff}`;

  const files = snippets.length > 0 ? snippets.map(s => s.file_path) : [filePath];

  const insertPrStmt = db.prepare(
    'INSERT OR REPLACE INTO prs (id, issue_id, title, body, head_branch, base_branch, files) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertPrStmt.run(prId, issueId, prTitle, prBody, headBranch, baseBranch, JSON.stringify(files));

  prResult = {
    pr: {
      id: prId,
      title: prTitle,
      body: prBody,
      headBranch,
      baseBranch,
      files,
      issueId
    }
  };

  // Update issue status
  const updateIssueStmt = db.prepare('UPDATE issues SET status = ? WHERE id = ?');
  updateIssueStmt.run('pr_created', issueId);

  res.json({
    analysis: analysisResult,
    fix: fixResult,
    pr: prResult
  });
});

// ============ Stats API ============

// GET /api/stats - Get statistics
app.get('/api/stats', (req: Request, res: Response) => {
  const totalIssues = db.prepare('SELECT COUNT(*) as count FROM issues').get() as any;
  const openIssues = db.prepare("SELECT COUNT(*) as count FROM issues WHERE status = 'open'").get() as any;
  const closedIssues = db.prepare("SELECT COUNT(*) as count FROM issues WHERE status = 'closed'").get() as any;
  const fixApplied = db.prepare('SELECT COUNT(*) as count FROM fixes WHERE applied = 1').get() as any;
  const prCreated = db.prepare('SELECT COUNT(*) as count FROM prs').get() as any;

  // Calculate average confidence
  const avgConfidenceStmt = db.prepare('SELECT AVG(confidence) as avg FROM analyses').get() as any;
  const avgConfidence = avgConfidenceStmt.avg || 0;

  res.json({
    totalIssues: totalIssues.count,
    open: openIssues.count,
    closed: closedIssues.count,
    fixApplied: fixApplied.count,
    prCreated: prCreated.count,
    avgConfidence: avgConfidence
  });
});

// ============ Test Reset API ============

// POST /api/test-reset - Clear all data
app.post('/api/test-reset', (req: Request, res: Response) => {
  db.exec('DELETE FROM prs');
  db.exec('DELETE FROM fixes');
  db.exec('DELETE FROM analyses');
  db.exec('DELETE FROM snippets');
  db.exec('DELETE FROM issues');

  res.json({ status: 'reset' });
});

// Export for testing
module.exports = { app };

export default app;
