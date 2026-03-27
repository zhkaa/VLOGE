require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('blog.db');

// ─── СОЗДАНИЕ ТАБЛИЦ ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    avatar TEXT,
    bio TEXT,
    phone TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT,
    cover_image TEXT,
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    UNIQUE(article_id, user_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

function auth(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Нет токена' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Токен недействителен' });
  }
}

// ─── СТРАНИЦЫ ─────────────────────────────────────────────────────────────────
const pages = {
  '/': 'index', '/register': 'register', '/login': 'login',
  '/profile': 'profile', '/my-articles': 'my-articles',
  '/bookmarks': 'bookmarks', '/settings': 'settings',
  '/about': 'about', '/useful-links': 'useful-links',
  '/resources': 'resources', '/create-article': 'create-article'
};
Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, 'views', `${file}.html`)));
});
app.get('/article/:id', (req, res) => res.sendFile(path.join(__dirname, 'views', 'article.html')));
app.get('/edit-article/:id', (req, res) => res.sendFile(path.join(__dirname, 'views', 'edit-article.html')));

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.json({ success: false, message: 'Заполните все поля' });
    if (password.length < 8)
      return res.json({ success: false, message: 'Пароль минимум 8 символов' });

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.json({ success: false, message: 'Email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
    const user = { id: result.lastInsertRowid, name, email, avatar: null };
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, user });
  } catch (e) {
    res.json({ success: false, message: 'Ошибка сервера' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({ success: false, message: 'Заполните все поля' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ success: false, message: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: 'Неверный email или пароль' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (e) {
    res.json({ success: false, message: 'Ошибка сервера' });
  }
});

// ─── USER ─────────────────────────────────────────────────────────────────────
app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar, bio, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.json({ success: false, message: 'Не найден' });
  res.json({ success: true, user });
});

app.put('/api/me', auth, (req, res) => {
  const { name, bio, avatar, phone, website } = req.body;
  db.prepare('UPDATE users SET name=?, bio=?, avatar=?, phone=?, website=? WHERE id=?')
    .run(name, bio, avatar, phone, website, req.user.id);
  const user = db.prepare('SELECT id, name, email, avatar, bio, phone, website FROM users WHERE id=?').get(req.user.id);
  res.json({ success: true, user });
});

app.put('/api/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.json({ success: false, message: 'Неверный текущий пароль' });
  if (newPassword.length < 8) return res.json({ success: false, message: 'Пароль минимум 8 символов' });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.user.id);
  res.json({ success: true });
});

// ─── ARTICLES ─────────────────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
  const { page = 1, limit = 12, category } = req.query;
  const offset = (page - 1) * limit;
  let query = `SELECT a.*, u.name as author_name, u.avatar as author_avatar
               FROM articles a JOIN users u ON a.user_id = u.id
               WHERE a.status = 'published'`;
  const params = [];
  if (category) { query += ' AND a.category = ?'; params.push(category); }
  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);
  const articles = db.prepare(query).all(...params);
  res.json({ success: true, articles });
});

app.get('/api/articles/:id', (req, res) => {
  const article = db.prepare(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar
    FROM articles a JOIN users u ON a.user_id = u.id WHERE a.id = ?
  `).get(req.params.id);
  if (!article) return res.json({ success: false, message: 'Статья не найдена' });
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(req.params.id);
  article.tags = JSON.parse(article.tags || '[]');
  res.json({ success: true, article });
});

app.get('/api/my-articles', auth, (req, res) => {
  const articles = db.prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ success: true, articles });
});

app.post('/api/articles', auth, (req, res) => {
  const { title, excerpt, content, category, cover_image, tags = [], status = 'draft' } = req.body;
  if (!title || !content) return res.json({ success: false, message: 'Заполните заголовок и текст' });
  const result = db.prepare(
    'INSERT INTO articles (user_id, title, excerpt, content, category, cover_image, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, title, excerpt, content, category, cover_image, JSON.stringify(tags), status);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.put('/api/articles/:id', auth, (req, res) => {
  const { title, excerpt, content, category, cover_image, tags = [], status } = req.body;
  const article = db.prepare('SELECT id FROM articles WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!article) return res.json({ success: false, message: 'Нет доступа' });
  db.prepare(
    'UPDATE articles SET title=?, excerpt=?, content=?, category=?, cover_image=?, tags=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(title, excerpt, content, category, cover_image, JSON.stringify(tags), status, req.params.id);
  res.json({ success: true });
});

app.delete('/api/articles/:id', auth, (req, res) => {
  const article = db.prepare('SELECT id FROM articles WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!article) return res.json({ success: false, message: 'Нет доступа' });
  db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── LIKES ────────────────────────────────────────────────────────────────────
app.post('/api/articles/:id/like', auth, (req, res) => {
  try {
    db.prepare('INSERT INTO likes (article_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
    db.prepare('UPDATE articles SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    const { likes } = db.prepare('SELECT likes FROM articles WHERE id=?').get(req.params.id);
    res.json({ success: true, liked: true, likes });
  } catch {
    db.prepare('DELETE FROM likes WHERE article_id=? AND user_id=?').run(req.params.id, req.user.id);
    db.prepare('UPDATE articles SET likes = MAX(0, likes - 1) WHERE id = ?').run(req.params.id);
    const { likes } = db.prepare('SELECT likes FROM articles WHERE id=?').get(req.params.id);
    res.json({ success: true, liked: false, likes });
  }
});

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────
app.get('/api/bookmarks', auth, (req, res) => {
  const bookmarks = db.prepare(`
    SELECT a.*, u.name as author_name, b.id as bookmark_id
    FROM bookmarks b JOIN articles a ON b.article_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE b.user_id = ? ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json({ success: true, bookmarks });
});

app.post('/api/bookmarks/:articleId', auth, (req, res) => {
  try {
    db.prepare('INSERT INTO bookmarks (user_id, article_id) VALUES (?, ?)').run(req.user.id, req.params.articleId);
    res.json({ success: true, bookmarked: true });
  } catch {
    res.json({ success: false, message: 'Уже в закладках' });
  }
});

app.delete('/api/bookmarks/:articleId', auth, (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE user_id=? AND article_id=?').run(req.user.id, req.params.articleId);
  res.json({ success: true, bookmarked: false });
});

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
app.get('/api/articles/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.article_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json({ success: true, comments });
});

app.post('/api/articles/:id/comments', auth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.json({ success: false, message: 'Текст не может быть пустым' });
  const result = db.prepare('INSERT INTO comments (article_id, user_id, text) VALUES (?, ?, ?)').run(req.params.id, req.user.id, text.trim());
  const comment = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id=?
  `).get(result.lastInsertRowid);
  res.json({ success: true, comment });
});

app.delete('/api/comments/:id', auth, (req, res) => {
  const comment = db.prepare('SELECT id FROM comments WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!comment) return res.json({ success: false, message: 'Нет доступа' });
  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── PROFILE STATS ────────────────────────────────────────────────────────────
app.get('/api/me/stats', auth, (req, res) => {
  const articles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE user_id=? AND status='published'").get(req.user.id);
  const views = db.prepare("SELECT COALESCE(SUM(views),0) as total FROM articles WHERE user_id=?").get(req.user.id);
  const likes = db.prepare("SELECT COALESCE(SUM(likes),0) as total FROM articles WHERE user_id=?").get(req.user.id);
  const bookmarks = db.prepare("SELECT COUNT(*) as count FROM bookmarks WHERE user_id=?").get(req.user.id);
  res.json({ success: true, stats: {
    articles: articles.count,
    views: views.total,
    likes: likes.total,
    bookmarks: bookmarks.count
  }});
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
app.delete('/api/me', auth, (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE user_id=?').run(req.user.id);
  db.prepare('DELETE FROM comments WHERE user_id=?').run(req.user.id);
  db.prepare('DELETE FROM likes WHERE user_id=?').run(req.user.id);
  db.prepare('DELETE FROM articles WHERE user_id=?').run(req.user.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.user.id);
  res.json({ success: true });
});

// ─── ЗАПУСК ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Сервер запущен: http://localhost:${PORT}`));