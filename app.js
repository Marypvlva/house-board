// Minimal: fetch and display announcements.json
(() => {
  'use strict';

  const els = {
    posts: document.getElementById('posts'),
    empty: document.getElementById('emptyState'),
    lastUpdated: document.getElementById('lastUpdated')
  };

  const esc = (s = '') =>
    String(s).replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));

  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-').map(Number);
    const dt = new Date(y || 0, (m || 1) - 1, d || 1);
    return isNaN(dt) ? String(iso) :
      dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const render = (items) => {
    els.posts.innerHTML = '';

    if (!Array.isArray(items) || !items.length) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    // Simple ordering: pinned first, then by date desc if provided
    items
      .slice()
      .sort((a, b) =>
        (b.pinned === true) - (a.pinned === true) ||
        String(b.date || '').localeCompare(String(a.date || ''))
      )
      .forEach(p => {
        const article = document.createElement('article');
        article.className = 'post';
        article.innerHTML = `
          <div class="post-header">
            <h3 class="post-title">${esc(p.title || 'Untitled')}</h3>
            <div class="post-meta">
              <span>${p.date ? fmtDate(p.date) : ''}</span>
              ${p.pinned ? `<span class="badge pinned" title="Pinned">Pinned</span>` : ''}
              ${p.expires ? `<span class="badge" title="Expires">Expires ${esc(fmtDate(p.expires))}</span>` : ''}
            </div>
          </div>
          ${Array.isArray(p.tags) && p.tags.length
            ? `<div class="tags">${p.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join(' ')}</div>`
            : ''
          }
          <div class="post-body">${esc(p.body || '').replace(/\n/g, '<br>')}</div>
        `;
        els.posts.appendChild(article);
      });

    const now = new Date();
    els.lastUpdated.dateTime = now.toISOString();
    els.lastUpdated.textContent = now.toLocaleString();
  };

  const load = async () => {
    try {
      const res = await fetch('./announcements.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      render(data);
    } catch (err) {
      console.warn('Failed to load announcements.json', err);
      render([]); // show empty state
    }
  };

  document.addEventListener('DOMContentLoaded', load);
})();
