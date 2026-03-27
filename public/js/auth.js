// ─── Регистрация ──────────────────────────────────────────────────────────────
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        if (password !== confirmPassword) return showToast('Пароли не совпадают!', 'error');
        if (password.length < 8) return showToast('Пароль минимум 8 символов!', 'error');
        if (!terms) return showToast('Примите условия использования!', 'error');

        const btn = registerForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Регистрация...';

        const data = await API.post('/auth/register', { name, email, password });
        if (data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            showToast('Добро пожаловать в VLOGE!');
            setTimeout(() => window.location.href = '/', 1000);
        } else {
            showToast(data.message || 'Ошибка регистрации', 'error');
            btn.disabled = false;
            btn.textContent = 'Зарегистрироваться';
        }
    });
}

// ─── Вход ─────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Вход...';

        const data = await API.post('/auth/login', { email, password });
        if (data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            showToast('Вход выполнен!');
            setTimeout(() => window.location.href = '/', 1000);
        } else {
            showToast(data.message || 'Ошибка входа', 'error');
            btn.disabled = false;
            btn.textContent = 'Войти';
        }
    });
}