const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Страница регистрации
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Страница входа
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Профильные страницы
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/my-articles', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'my-articles.html'));
});

app.get('/bookmarks', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'bookmarks.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

app.get('/article/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'article.html'));
});

// API роуты
app.post('/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    console.log('Регистрация:', { name, email });
    res.json({ 
        success: true, 
        message: 'Регистрация успешна' 
    });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Вход:', { email });
    res.json({ 
        success: true,
        token: 'fake_jwt_token_' + Date.now(),
        user: {
            id: 1,
            name: 'Иван Иванов',
            email: email,
            avatar: null
        }
    });
});

app.post('/auth/google', (req, res) => {
    const { token } = req.body;
    console.log('Google Auth:', { token });
    res.json({ 
        success: true,
        token: 'fake_jwt_token_google_' + Date.now(),
        user: {
            id: 2,
            name: 'Google User',
            email: 'user@gmail.com',
            avatar: 'https://lh3.googleusercontent.com/a/default-user'
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
    ========================================
    🚀 Сервер запущен!
    ========================================
    📍 URL: http://localhost:${PORT}
    
    Доступные страницы:
    - Главная:       http://localhost:${PORT}/
    - Вход:          http://localhost:${PORT}/login
    - Регистрация:   http://localhost:${PORT}/register
    ========================================
    `);
});