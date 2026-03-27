document.addEventListener('DOMContentLoaded', async () => {

    if (!localStorage.getItem('authToken')) {
        window.location.href = '/login';
        return;
    }

    let allArticles = [];
    let currentFilter = 'all';
    const listEl = document.querySelector('.my-articles-list');

    async function loadArticles() {
        listEl.innerHTML = '<p style="color:#a0aec0;padding:20px 0;">Загрузка...</p>';
        try {
            const data = await API.get('/api/my-articles');
            if (!data.success) throw new Error(data.message);
            allArticles = data.articles || [];
            renderArticles();
        } catch (err) {
            listEl.innerHTML = `<p style="color:#e53e3e;padding:20px 0;">Ошибка: ${err.message}</p>`;
        }
    }

    function renderArticles() {
        const filtered = currentFilter === 'all'
            ? allArticles
            : allArticles.filter(a => a.status === currentFilter);

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:40px 0;color:#a0aec0;">
                    <p style="font-size:48px;">📝</p>
                    <p style="font-size:16px;font-weight:600;">Статей пока нет</p>
                </div>`;
            return;
        }

        listEl.innerHTML = filtered.map(a => {
            const isPublished = a.status === 'published';
            const date = new Date(a.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            const excerpt = (a.excerpt || (a.content || '').replace(/<[^>]*>/g, '').slice(0, 120));
            const img = a.cover_image
                ? `<img src="${a.cover_image}" alt="">`
                : `<div style="width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:40px;">📄</div>`;

            return `
            <div class="my-article-card" data-id="${a.id}" style="cursor:pointer;">
                <div class="my-article-card__image">
                    ${img}
                    <span class="my-article-card__status ${isPublished ? 'published' : 'draft'}">
                        ${isPublished ? 'Опубликовано' : 'Черновик'}
                    </span>
                </div>
                <div class="my-article-card__content">
                    ${a.category ? `<span class="my-article-card__category">${a.category}</span>` : ''}
                    <h3 class="my-article-card__title">${a.title}</h3>
                    ${excerpt ? `<p class="my-article-card__excerpt">${excerpt}${excerpt.length >= 120 ? '...' : ''}</p>` : ''}
                    <div class="my-article-card__meta">
                        <span>📅 ${date}</span>
                        <span>👁 ${a.views || 0} просмотров</span>
                        <span>❤️ ${a.likes || 0} лайков</span>
                    </div>
                    <div class="my-article-card__actions">
                        <button class="btn-icon js-edit" data-id="${a.id}" title="Редактировать">✏️</button>
                        <button class="btn-icon js-toggle" data-id="${a.id}" data-status="${a.status}" title="${isPublished ? 'Снять с публикации' : 'Опубликовать'}">
                            ${isPublished ? '📤' : '📢'}
                        </button>
                        <button class="btn-icon danger js-delete" data-id="${a.id}" data-title="${a.title}" title="Удалить">🗑️</button>
                    </div>
                </div>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.my-article-card').forEach(card => {
            card.addEventListener('click', e => {
                if (!e.target.closest('button')) window.location.href = `/article/${card.dataset.id}`;
            });
        });

        listEl.querySelectorAll('.js-edit').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                window.location.href = `/edit-article/${btn.dataset.id}`;
            });
        });

        listEl.querySelectorAll('.js-toggle').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                const article = allArticles.find(a => a.id == btn.dataset.id);
                const newStatus = btn.dataset.status === 'published' ? 'draft' : 'published';
                const tags = JSON.parse(article.tags || '[]');
                const res = await API.put(`/api/articles/${article.id}`, { ...article, tags, status: newStatus });
                if (res.success) {
                    article.status = newStatus;
                    renderArticles();
                    showToast(newStatus === 'published' ? 'Опубликовано!' : 'Снято с публикации');
                }
            });
        });

        listEl.querySelectorAll('.js-delete').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                if (!confirm(`Удалить статью "${btn.dataset.title}"?`)) return;
                const res = await API.delete(`/api/articles/${btn.dataset.id}`);
                if (res.success) {
                    allArticles = allArticles.filter(a => a.id != btn.dataset.id);
                    renderArticles();
                    showToast('Статья удалена');
                }
            });
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderArticles();
        });
    });

    await loadArticles();
});