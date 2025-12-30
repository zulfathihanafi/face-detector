const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('faces.db');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    embedding TEXT
  )
`).run();

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

app.post('/register', (req, res) => {
  const { name, embedding } = req.body;
  if (!name || !embedding) return res.status(400).json({ error: 'Invalid input' });

  db.prepare('INSERT INTO users (name, embedding) VALUES (?, ?)')
    .run(name, JSON.stringify(embedding));

  res.json({ status: 'registered' });
});

app.post('/recognize', (req, res) => {
  const { embedding } = req.body;
  const users = db.prepare('SELECT * FROM users').all();

  let minDist = Infinity;
  let match = null;

  users.forEach(u => {
    const stored = JSON.parse(u.embedding);
    const dist = euclideanDistance(embedding, stored);
    if (dist < minDist) {
      minDist = dist;
      match = u.name;
    }
  });

  if (minDist < 0.5) {
    res.json({ allowed: true, name: match, distance: minDist });
  } else {
    res.json({ allowed: false });
  }
});

app.get('/test', (req, res) => {

    res.json({ test:"Hello" });
  
});

// List all users (without embeddings for safety & payload size)
app.get('/users', (req, res) => {
  const users = db
    .prepare('SELECT id, name FROM users')
    .all();

  res.json(users);
});

// Delete user by ID
app.get('/users/delete/:id', (req, res) => {
  const { id } = req.params;

  const result = db
    .prepare('DELETE FROM users WHERE id = ?')
    .run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ status: 'deleted' });
});

app.listen(4000, () => console.log('Backend running on port 4000'));
