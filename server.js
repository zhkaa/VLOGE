require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ─── СОЗДАНИЕ ТАБЛИЦ ─────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      avatar TEXT,
      bio TEXT,
      phone TEXT,
      website TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      category TEXT,
      cover_image TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, article_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      UNIQUE(article_id, user_id)
    );
  `);
  console.log('✅ Таблицы готовы');
}

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

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.json({ success: false, message: 'Email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );
    const user = { id: result.rows[0].id, name, email, avatar: null };
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, user });
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: 'Ошибка сервера' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({ success: false, message: 'Заполните все поля' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.json({ success: false, message: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, message: 'Неверный email или пароль' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: 'Ошибка сервера' });
  }
});

// ─── USER ─────────────────────────────────────────────────────────────────────
app.get('/api/me', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, avatar, bio, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  const user = result.rows[0];
  if (!user) return res.json({ success: false, message: 'Не найден' });
  res.json({ success: true, user });
});

app.put('/api/me', auth, async (req, res) => {
  const { name, bio, avatar, phone, website } = req.body;
  await pool.query(
    'UPDATE users SET name=$1, bio=$2, avatar=$3, phone=$4, website=$5 WHERE id=$6',
    [name, bio, avatar, phone, website, req.user.id]
  );
  const result = await pool.query(
    'SELECT id, name, email, avatar, bio, phone, website FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json({ success: true, user: result.rows[0] });
});

app.put('/api/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  const user = result.rows[0];
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.json({ success: false, message: 'Неверный текущий пароль' });
  if (newPassword.length < 8) return res.json({ success: false, message: 'Пароль минимум 8 символов' });
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ success: true });
});

// ─── ARTICLES ─────────────────────────────────────────────────────────────────
app.get('/api/articles', async (req, res) => {
  const { page = 1, limit = 12, category } = req.query;
  const offset = (page - 1) * limit;
  let query = `SELECT a.*, u.name as author_name, u.avatar as author_avatar
               FROM articles a JOIN users u ON a.user_id = u.id
               WHERE a.status = 'published'`;
  const params = [];
  if (category) {
    params.push(category);
    query += ` AND a.category = $${params.length}`;
  }
  params.push(Number(limit), offset);
  query += ` ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  res.json({ success: true, articles: result.rows });
});

app.get('/api/articles/:id', async (req, res) => {
  const result = await pool.query(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar
    FROM articles a JOIN users u ON a.user_id = u.id WHERE a.id = $1
  `, [req.params.id]);
  const article = result.rows[0];
  if (!article) return res.json({ success: false, message: 'Статья не найдена' });
  await pool.query('UPDATE articles SET views = views + 1 WHERE id = $1', [req.params.id]);
  article.tags = JSON.parse(article.tags || '[]');
  res.json({ success: true, article });
});

app.get('/api/my-articles', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM articles WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ success: true, articles: result.rows });
});

app.post('/api/articles', auth, async (req, res) => {
  const { title, excerpt, content, category, cover_image, tags = [], status = 'draft' } = req.body;
  if (!title || !content) return res.json({ success: false, message: 'Заполните заголовок и текст' });
  const result = await pool.query(
    'INSERT INTO articles (user_id, title, excerpt, content, category, cover_image, tags, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
    [req.user.id, title, excerpt, content, category, cover_image, JSON.stringify(tags), status]
  );
  res.json({ success: true, id: result.rows[0].id });
});

app.put('/api/articles/:id', auth, async (req, res) => {
  const { title, excerpt, content, category, cover_image, tags = [], status } = req.body;
  const check = await pool.query('SELECT id FROM articles WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!check.rows.length) return res.json({ success: false, message: 'Нет доступа' });
  await pool.query(
    'UPDATE articles SET title=$1, excerpt=$2, content=$3, category=$4, cover_image=$5, tags=$6, status=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8',
    [title, excerpt, content, category, cover_image, JSON.stringify(tags), status, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/articles/:id', auth, async (req, res) => {
  const check = await pool.query('SELECT id FROM articles WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!check.rows.length) return res.json({ success: false, message: 'Нет доступа' });
  await pool.query('DELETE FROM articles WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── LIKES ────────────────────────────────────────────────────────────────────
app.post('/api/articles/:id/like', auth, async (req, res) => {
  try {
    await pool.query('INSERT INTO likes (article_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.id]);
    await pool.query('UPDATE articles SET likes = likes + 1 WHERE id = $1', [req.params.id]);
    const { rows } = await pool.query('SELECT likes FROM articles WHERE id=$1', [req.params.id]);
    res.json({ success: true, liked: true, likes: rows[0].likes });
  } catch {
    await pool.query('DELETE FROM likes WHERE article_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    await pool.query('UPDATE articles SET likes = GREATEST(0, likes - 1) WHERE id = $1', [req.params.id]);
    const { rows } = await pool.query('SELECT likes FROM articles WHERE id=$1', [req.params.id]);
    res.json({ success: true, liked: false, likes: rows[0].likes });
  }
});

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────
app.get('/api/bookmarks', auth, async (req, res) => {
  const result = await pool.query(`
    SELECT a.*, u.name as author_name, b.id as bookmark_id
    FROM bookmarks b JOIN articles a ON b.article_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE b.user_id = $1 ORDER BY b.created_at DESC
  `, [req.user.id]);
  res.json({ success: true, bookmarks: result.rows });
});

app.post('/api/bookmarks/:articleId', auth, async (req, res) => {
  try {
    await pool.query('INSERT INTO bookmarks (user_id, article_id) VALUES ($1, $2)', [req.user.id, req.params.articleId]);
    res.json({ success: true, bookmarked: true });
  } catch {
    res.json({ success: false, message: 'Уже в закладках' });
  }
});

app.delete('/api/bookmarks/:articleId', auth, async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE user_id=$1 AND article_id=$2', [req.user.id, req.params.articleId]);
  res.json({ success: true, bookmarked: false });
});

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
app.get('/api/articles/:id/comments', async (req, res) => {
  const result = await pool.query(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.article_id = $1 ORDER BY c.created_at ASC
  `, [req.params.id]);
  res.json({ success: true, comments: result.rows });
});

app.post('/api/articles/:id/comments', auth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.json({ success: false, message: 'Текст не может быть пустым' });
  const result = await pool.query(
    'INSERT INTO comments (article_id, user_id, text) VALUES ($1, $2, $3) RETURNING id',
    [req.params.id, req.user.id, text.trim()]
  );
  const comment = await pool.query(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id=$1
  `, [result.rows[0].id]);
  res.json({ success: true, comment: comment.rows[0] });
});

app.delete('/api/comments/:id', auth, async (req, res) => {
  const check = await pool.query('SELECT id FROM comments WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!check.rows.length) return res.json({ success: false, message: 'Нет доступа' });
  await pool.query('DELETE FROM comments WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── PROFILE STATS ────────────────────────────────────────────────────────────
app.get('/api/me/stats', auth, async (req, res) => {
  const articles = await pool.query("SELECT COUNT(*) as count FROM articles WHERE user_id=$1 AND status='published'", [req.user.id]);
  const views = await pool.query("SELECT COALESCE(SUM(views),0) as total FROM articles WHERE user_id=$1", [req.user.id]);
  const likes = await pool.query("SELECT COALESCE(SUM(likes),0) as total FROM articles WHERE user_id=$1", [req.user.id]);
  const bookmarks = await pool.query("SELECT COUNT(*) as count FROM bookmarks WHERE user_id=$1", [req.user.id]);
  res.json({ success: true, stats: {
    articles: parseInt(articles.rows[0].count),
    views: parseInt(views.rows[0].total),
    likes: parseInt(likes.rows[0].total),
    bookmarks: parseInt(bookmarks.rows[0].count)
  }});
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
app.delete('/api/me', auth, async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE user_id=$1', [req.user.id]);
  await pool.query('DELETE FROM comments WHERE user_id=$1', [req.user.id]);
  await pool.query('DELETE FROM likes WHERE user_id=$1', [req.user.id]);
  await pool.query('DELETE FROM articles WHERE user_id=$1', [req.user.id]);
  await pool.query('DELETE FROM users WHERE id=$1', [req.user.id]);
  res.json({ success: true });
});

// ─── ЗАПУСК ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB()
  .then(() => app.listen(PORT, () => console.log(`✅ Сервер запущен: http://localhost:${PORT}`)))
  .catch(err => { console.error('❌ Ошибка БД:', err); process.exit(1); });
