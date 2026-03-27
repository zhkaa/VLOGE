document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();

    const articleId = window.location.pathname.split('/').pop();
    const root = document.getElementById('editRoot');

    // Загружаем статью
    let article;
    try {
        const data = await API.get(`/api/articles/${articleId}`);
        if (!data.success) throw new Error(data.message);
        article = data.article;
    } catch (err) {
        root.innerHTML = `<div class="edit-error">Ошибка загрузки: ${err.message}</div>`;
        return;
    }

    // Рендерим форму (та же разметка что в create-article)
    root.innerHTML = `
        <div class="create-article-layout">
            <div class="create-article-main">

                <div class="form-group">
                    <label class="form-label">Обложка статьи</label>
                    <label class="cover-upload" id="coverUpload" style="${article.cover_image ? 'display:none' : ''}">
                        <span class="cover-upload__icon">🖼️</span>
                        <span class="cover-upload__text">Нажмите для загрузки изображения</span>
                        <span class="cover-upload__hint">PNG, JPG, WEBP до 5 МБ</span>
                        <input type="file" accept="image/*" id="coverInput">
                    </label>
                    <img id="coverPreview" src="${article.cover_image || ''}"
                        style="display:${article.cover_image ? 'block' : 'none'};width:100%;height:240px;object-fit:cover;border-radius:10px;margin-top:10px;" alt="Обложка">
                    <button id="removeCoverBtn" style="display:${article.cover_image ? 'inline-block' : 'none'};margin-top:8px;padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;color:var(--gray);">
                        🗑️ Удалить обложку
                    </button>
                </div>

                <div class="form-group">
                    <label class="form-label" for="articleTitle">Заголовок <span>*</span></label>
                    <input type="text" id="articleTitle" class="form-input" maxlength="120" value="${escapeAttr(article.title)}">
                    <p class="char-counter"><span id="titleCount">${article.title.length}</span>/120</p>
                </div>

                <div class="form-group">
                    <label class="form-label" for="articleCategory">Категория <span>*</span></label>
                    <select id="articleCategory" class="form-select">
                        <option value="">Выберите категорию...</option>
                        <option value="programming" ${article.category === 'programming' ? 'selected' : ''}>💻 Программирование</option>
                        <option value="design"       ${article.category === 'design'       ? 'selected' : ''}>🎨 Дизайн</option>
                        <option value="marketing"    ${article.category === 'marketing'    ? 'selected' : ''}>📈 Маркетинг</option>
                        <option value="analytics"    ${article.category === 'analytics'    ? 'selected' : ''}>📊 Аналитика</option>
                        <option value="management"   ${article.category === 'management'   ? 'selected' : ''}>🗂️ Менеджмент</option>
                        <option value="ai"           ${article.category === 'ai'           ? 'selected' : ''}>🤖 Нейросети</option>
                        <option value="games"        ${article.category === 'games'        ? 'selected' : ''}>🎮 Игры</option>
                        <option value="other"        ${article.category === 'other'        ? 'selected' : ''}>💡 Другое</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label" for="articleExcerpt">Краткое описание <span>*</span></label>
                    <textarea id="articleExcerpt" class="form-textarea" style="min-height:90px" maxlength="300">${escapeHtml(article.excerpt || '')}</textarea>
                    <p class="char-counter"><span id="excerptCount">${(article.excerpt || '').length}</span>/300</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Текст статьи <span>*</span></label>
                    <div class="toolbar">
                        <button class="toolbar-btn" onclick="insertTag('**','**')"><b>B</b></button>
                        <button class="toolbar-btn" onclick="insertTag('*','*')"><i>I</i></button>
                        <button class="toolbar-btn" onclick="insertLine('## ')">H2</button>
                        <button class="toolbar-btn" onclick="insertLine('### ')">H3</button>
                        <button class="toolbar-btn" onclick="insertLine('> ')">❝</button>
                        <button class="toolbar-btn" onclick="insertTag('\`','\`')">{ }</button>
                        <button class="toolbar-btn" onclick="insertBlock('\`\`\`\n','\n\`\`\`')">⌨️</button>
                        <button class="toolbar-btn" onclick="insertLine('- ')">≡</button>
                        <button class="toolbar-btn" onclick="insertLine('1. ')">1.</button>
                        <button class="toolbar-btn" onclick="insertLink()">🔗</button>
                    </div>
                    <textarea id="articleContent" class="form-textarea">${escapeHtml(article.content || '')}</textarea>
                    <p class="char-counter">Символов: <span id="contentCount">${(article.content || '').length}</span> · Время чтения: ~<span id="readTime">0</span> мин</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Теги</label>
                    <div class="tags-input" id="tagsContainer">
                        <input type="text" class="tags-input__field" id="tagInput" placeholder="Введите тег и нажмите Enter...">
                    </div>
                    <p class="form-hint">До 5 тегов. Нажмите Enter для добавления.</p>
                </div>

            </div>

            <div class="create-article-sidebar">
                <div class="sidebar-card">
                    <h3 class="sidebar-card__title">📤 Сохранение</h3>
                    <button class="publish-btn" id="publishBtn">Сохранить и опубликовать</button>
                    <button class="draft-btn" id="draftBtn">Сохранить черновик</button>
                </div>
                <div class="sidebar-card">
                    <h3 class="sidebar-card__title">👁️ Предпросмотр</h3>
                    <div class="preview-area" id="previewArea">
                        <strong style="font-size:15px;color:var(--dark)">${escapeHtml(article.title)}</strong>
                    </div>
                </div>
            </div>
        </div>`;

    // ── Теги ────────────────────────────────────────────────────────────────
    const tags = Array.isArray(article.tags) ? [...article.tags] : [];
    const tagInput = document.getElementById('tagInput');
    const tagsContainer = document.getElementById('tagsContainer');
    renderTags();

    tagInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            e.preventDefault();
            const tag = this.value.trim();
            if (!tags.includes(tag) && tags.length < 5) { tags.push(tag); renderTags(); }
            this.value = '';
        }
    });

    function renderTags() {
        tagsContainer.querySelectorAll('.tag-item').forEach(t => t.remove());
        tags.forEach((tag, i) => {
            const el = document.createElement('span');
            el.className = 'tag-item';
            el.innerHTML = `${tag}<span class="tag-item__remove" data-i="${i}">×</span>`;
            tagsContainer.insertBefore(el, tagInput);
        });
        tagsContainer.querySelectorAll('.tag-item__remove').forEach(btn => {
            btn.addEventListener('click', function() { tags.splice(+this.dataset.i, 1); renderTags(); });
        });
    }

    // ── Счётчики ─────────────────────────────────────────────────────────────
    const titleInput    = document.getElementById('articleTitle');
    const excerptInput  = document.getElementById('articleExcerpt');
    const contentInput  = document.getElementById('articleContent');
    const previewArea   = document.getElementById('previewArea');

    titleInput.addEventListener('input', function() {
        document.getElementById('titleCount').textContent = this.value.length;
        previewArea.innerHTML = this.value
            ? `<strong style="font-size:15px;color:var(--dark)">${this.value}</strong>`
            : '<span style="color:#a0aec0">Предпросмотр...</span>';
    });

    excerptInput.addEventListener('input', function() {
        document.getElementById('excerptCount').textContent = this.value.length;
    });

    contentInput.addEventListener('input', function() {
        const words = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
        document.getElementById('contentCount').textContent = this.value.length;
        document.getElementById('readTime').textContent = Math.max(1, Math.ceil(words / 200));
    });

    // ── Обложка ──────────────────────────────────────────────────────────────
    document.getElementById('coverInput').addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('coverPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('coverUpload').style.display = 'none';
            document.getElementById('removeCoverBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('removeCoverBtn').addEventListener('click', () => {
        const preview = document.getElementById('coverPreview');
        preview.src = '';
        preview.style.display = 'none';
        document.getElementById('coverUpload').style.display = 'block';
        document.getElementById('removeCoverBtn').style.display = 'none';
        document.getElementById('coverInput').value = '';
    });

    // ── Тулбар ───────────────────────────────────────────────────────────────
    window.insertTag = function(before, after) {
        const el = contentInput;
        const s = el.selectionStart, e2 = el.selectionEnd;
        const sel = el.value.substring(s, e2) || 'текст';
        el.value = el.value.substring(0, s) + before + sel + after + el.value.substring(e2);
        el.focus();
    };
    window.insertLine = function(prefix) {
        const el = contentInput;
        const s = el.selectionStart;
        const lineStart = el.value.lastIndexOf('\n', s - 1) + 1;
        el.value = el.value.substring(0, lineStart) + prefix + el.value.substring(lineStart);
        el.focus();
    };
    window.insertBlock = function(before, after) {
        const el = contentInput;
        const s = el.selectionStart;
        el.value = el.value.substring(0, s) + before + after + el.value.substring(s);
        el.focus();
    };
    window.insertLink = function() {
        const url = prompt('Введите URL:');
        if (!url) return;
        const el = contentInput;
        const s = el.selectionStart, e2 = el.selectionEnd;
        const text = el.value.substring(s, e2) || 'текст ссылки';
        el.value = el.value.substring(0, s) + `[${text}](${url})` + el.value.substring(e2);
        el.focus();
    };

    // ── Сохранение ───────────────────────────────────────────────────────────
    async function save(status) {
        const title       = titleInput.value.trim();
        const category    = document.getElementById('articleCategory').value;
        const excerpt     = excerptInput.value.trim();
        const content     = contentInput.value.trim();
        const coverPreview = document.getElementById('coverPreview');
        const cover_image = coverPreview.style.display !== 'none' && coverPreview.src ? coverPreview.src : null;

        if (!title)   { showToast('Введите заголовок', 'error'); return; }
        if (!category){ showToast('Выберите категорию', 'error'); return; }
        if (!content) { showToast('Напишите текст статьи', 'error'); return; }

        const res = await API.put(`/api/articles/${articleId}`, { title, excerpt, content, category, cover_image, tags, status });
        if (res.success) {
            showToast(status === 'published' ? 'Статья опубликована!' : 'Черновик сохранён!');
            setTimeout(() => window.location.href = '/my-articles', 1000);
        } else {
            showToast(res.message || 'Ошибка', 'error');
        }
    }

    document.getElementById('publishBtn').addEventListener('click', () => save('published'));
    document.getElementById('draftBtn').addEventListener('click',   () => save('draft'));

    // ── Утилиты ──────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function escapeAttr(str) {
        return String(str || '').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
});