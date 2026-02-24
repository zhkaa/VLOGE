const API = {
    token: () => localStorage.getItem('authToken'),

    headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
        return h;
    },

    async get(url) {
        const res = await fetch(url, { headers: this.headers() });
        return res.json();
    },

    async post(url, data) {
        const res = await fetch(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(data) });
        return res.json();
    },

    async put(url, data) {
        const res = await fetch(url, { method: 'PUT', headers: this.headers(), body: JSON.stringify(data) });
        return res.json();
    },

    async delete(url) {
        const res = await fetch(url, { method: 'DELETE', headers: this.headers() });
        return res.json();
    }
};

function requireAuth() {
    if (!localStorage.getItem('authToken')) {
        window.location.href = '/login';
    }
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:10px;color:#fff;font-weight:600;z-index:9999;font-family:Montserrat,sans-serif;background:${type === 'success' ? '#00D856' : '#e53e3e'}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}