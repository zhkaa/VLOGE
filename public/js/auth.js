// Google OAuth конфигурация
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // Замените на ваш Client ID

// Инициализация Google Sign-In
function initGoogleSignIn() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback
        });
    };
}

// Обработка ответа от Google
function handleGoogleCallback(response) {
    console.log('Google JWT Token:', response.credential);
    
    fetch('/auth/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token: response.credential
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Сохраняем токен и данные пользователя
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            alert('Успешный вход через Google!');
            // Перенаправляем на главную
            window.location.href = '/';
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при входе через Google');
    });
}

// Обработка кнопок Google
document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            google.accounts.id.prompt();
        });
    }

    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', () => {
            google.accounts.id.prompt();
        });
    }

    // Инициализация Google Sign-In
    initGoogleSignIn();
});

// Обработка формы регистрации
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        // Валидация
        if (password !== confirmPassword) {
            alert('Пароли не совпадают!');
            return;
        }

        if (password.length < 8) {
            alert('Пароль должен содержать минимум 8 символов!');
            return;
        }

        if (!terms) {
            alert('Необходимо принять условия использования!');
            return;
        }

        // Отправка данных на сервер
        fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Регистрация успешна! Теперь войдите в систему.');
                window.location.href = '/login';
            } else {
                alert(data.message || 'Ошибка регистрации');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при регистрации');
        });
    });
}

// Обработка формы входа
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        // Отправка данных на сервер
        fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                remember
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Сохраняем токен и данные пользователя
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                
                alert('Вход выполнен успешно!');
                // Перенаправляем на главную
                window.location.href = '/';
            } else {
                alert(data.message || 'Ошибка входа');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при входе');
        });
    });
}