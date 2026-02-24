// Управление профилем пользователя
class UserProfile {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        // Проверяем авторизацию при загрузке страницы
        this.checkAuth();

        // Обработчик клика по кнопке профиля
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Закрытие dropdown при клике вне его
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('userDropdown');
            const profileBtn = document.getElementById('profileBtn');
            
            if (dropdown && !dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Обработчик выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    // Проверка авторизации
    checkAuth() {
        // Проверяем наличие токена в localStorage
        const token = localStorage.getItem('authToken');
        const userDataStr = localStorage.getItem('userData');

        if (token && userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                this.setUser(userData);
                this.showProfile();
            } catch (error) {
                console.error('Ошибка парсинга данных пользователя:', error);
                this.clearAuth();
            }
        } else {
            this.showAuthButtons();
        }
    }

    // Установка данных пользователя
    setUser(userData) {
        this.user = userData;
        this.updateProfileUI();
    }

    // Обновление UI профиля
    updateProfileUI() {
        if (!this.user) return;

        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const dropdownName = document.getElementById('dropdownName');
        const dropdownEmail = document.getElementById('dropdownEmail');

        // Устанавливаем имя
        if (userName) {
            userName.textContent = this.user.name || 'Пользователь';
        }

        // Устанавливаем аватар или инициалы
        if (userAvatar) {
            if (this.user.avatar) {
                userAvatar.innerHTML = `<img src="${this.user.avatar}" alt="${this.user.name}">`;
            } else {
                const initials = this.getInitials(this.user.name);
                userAvatar.textContent = initials;
            }
        }

        // Обновляем данные в dropdown
        if (dropdownName) {
            dropdownName.textContent = this.user.name || 'Пользователь';
        }
        if (dropdownEmail) {
            dropdownEmail.textContent = this.user.email || '';
        }
    }

    // Получение инициалов из имени
    getInitials(name) {
        if (!name) return 'U';
        
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    }

    // Показать профиль
    showProfile() {
        const userProfile = document.getElementById('userProfile');
        const headerActions = document.getElementById('headerActions');
        const navButtons = document.getElementById('navButtons');

        if (userProfile) {
            userProfile.classList.add('active');
        }
        if (headerActions) {
            headerActions.classList.add('hidden');
        }
        if (navButtons) {
            navButtons.classList.add('hidden');
        }
    }

    // Показать кнопки входа/регистрации
    showAuthButtons() {
        const userProfile = document.getElementById('userProfile');
        const headerActions = document.getElementById('headerActions');
        const navButtons = document.getElementById('navButtons');

        if (userProfile) {
            userProfile.classList.remove('active');
        }
        if (headerActions) {
            headerActions.classList.remove('hidden');
        }
        if (navButtons) {
            navButtons.classList.remove('hidden');
        }
    }

    // Переключение dropdown меню
    toggleDropdown() {
        const dropdown = document.getElementById('userDropdown');
        const profileBtn = document.getElementById('profileBtn');

        if (dropdown && profileBtn) {
            const isOpen = dropdown.classList.contains('open');
            
            if (isOpen) {
                this.closeDropdown();
            } else {
                dropdown.classList.add('open');
                profileBtn.classList.add('open');
            }
        }
    }

    // Закрытие dropdown
    closeDropdown() {
        const dropdown = document.getElementById('userDropdown');
        const profileBtn = document.getElementById('profileBtn');

        if (dropdown) {
            dropdown.classList.remove('open');
        }
        if (profileBtn) {
            profileBtn.classList.remove('open');
        }
    }

    // Выход из аккаунта
    logout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            this.clearAuth();
            // Перенаправляем на главную
            window.location.href = '/';
        }
    }

    // Очистка данных авторизации
    clearAuth() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.user = null;
        this.showAuthButtons();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.userProfile = new UserProfile();
});

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserProfile;
}