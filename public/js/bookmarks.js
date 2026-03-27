document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();

    const grid = document.querySelector('.bookmarks-grid');
    const subtitle = document.querySelector('.profile-subtitle');
    if (!grid) return;

    grid.innerHTML = '<p style="color:#a0aec0;padding:20px">Загрузка...</p>';

    const data = await API.get('/api/bookmarks');
    if (!data.success) return;

    const bookmarks = data.bookmarks;

    if (subtitle) {
        const word = bookmarks.length === 1 ? 'статья' : bookmarks.length >= 2 && bookmarks.length <= 4 ? 'статьи' : 'статей';
        subtitle.textContent = `${bookmarks.length} ${word} в закладках`;
    }

    if (bookmarks.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#a0aec0;grid-column:1/-1">
                <div style="font-size:48px;margin-bottom:16px">🔖</div>
                <p style="font-size:18px;margin-bottom:8px">Закладок пока нет</p>
                <a href="/" style="color:#00D856">Читать статьи →</a>
            </div>`;
        return;
    }

    grid.innerHTML = bookmarks.map(b => `
        <div class="bookmark-card" data-article-id="${b.id}">
            <div class="bookmark-card__image">
                <img src="${b.cover_image || 'https://via.placeholder.com/400x250/e2e8f0/a0aec0?text=Статья'}" alt="${b.title}">
                <button class="bookmark-card__remove" title="Удалить из закладок">🔖</button>
            </div>
            <div class="bookmark-card__content">
                ${b.category ? `<span class="bookmark-card__category">${b.category}</span>` : ''}
                <h3 class="bookmark-card__title">${b.title}</h3>
                <p class="bookmark-card__author">Автор: ${b.author_name}</p>
                <div class="bookmark-card__meta">
                    <span>👁️ ${b.views}</span>
                    <span>📅 ${new Date(b.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Переход к статье
    grid.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.bookmark-card__remove');
        const card = e.target.closest('.bookmark-card');
        if (!card) return;
        const articleId = card.dataset.articleId;

        if (removeBtn) {
            e.stopPropagation();
            card.style.opacity = '0.5';
            const res = await API.delete(`/api/bookmarks/${articleId}`);
            if (res.success) {
                card.style.transition = 'opacity .3s, transform .3s';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    card.remove();
                    const remaining = grid.querySelectorAll('.bookmark-card').length;
                    if (subtitle) {
                        const word = remaining === 1 ? 'статья' : remaining >= 2 && remaining <= 4 ? 'статьи' : 'статей';
                        subtitle.textContent = `${remaining} ${word} в закладках`;
                    }
                    if (remaining === 0) grid.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#a0aec0;grid-column:1/-1"><div style="font-size:48px;margin-bottom:16px">🔖</div><p>Закладок пока нет</p><a href="/" style="color:#00D856">Читать статьи →</a></div>`;
                }, 300);
            } else {
                card.style.opacity = '1';
                showToast('Ошибка', 'error');
            }
        } else {
            window.location.href = `/article/${articleId}`;
        }
    });
});