document.addEventListener('DOMContentLoaded', () => {
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');
    const userProfile = document.getElementById('userProfile');

    // Кнопка закрытия внутри nav
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'nav-close-btn';
    nav.insertBefore(closeBtn, nav.firstChild);

    closeBtn.addEventListener('click', () => {
        burger.classList.remove('active');
        nav.classList.remove('active');
    });

    function moveUserProfile() {
        const isMobile = window.innerWidth <= 768;
        const headerContent = document.querySelector('.header__content');
        if (!userProfile) return;

        if (isMobile) {
            if (!nav.contains(userProfile)) nav.appendChild(userProfile);
        } else {
            if (!headerContent.contains(userProfile)) headerContent.appendChild(userProfile);
        }
    }

    moveUserProfile();
    window.addEventListener('resize', moveUserProfile);

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!burger.contains(e.target) && !nav.contains(e.target)) {
            burger.classList.remove('active');
            nav.classList.remove('active');
        }
    });
});