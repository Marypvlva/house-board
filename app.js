// House Callboard — vanilla JS, no dependencies
(function(){
  'use strict';

  // Elements
  const els = {
    lastUpdated: document.getElementById('lastUpdated'),
    dataSourceNote: document.getElementById('dataSourceNote'),
    posts: document.getElementById('posts'),
    empty: document.getElementById('emptyState'),
    listCount: document.getElementById('listCount'),
    search: document.getElementById('search'),
    showExpired: document.getElementById('showExpired'),
    tagFilters: document.getElementById('tagFilters'),
    form: document.getElementById('postForm'),
    title: document.getElementById('title'),
    date: document.getElementById('date'),
    expires: document.getElementById('expires'),
    tags: document.getElementById('tags'),
    body: document.getElementById('body'),
    pinned: document.getElementById('pinned'),
    previewBtn: document.getElementById('previewBtn'),
    previewArea: document.getElementById('previewArea'),
    exportBtn: document.getElementById('exportBtn'),
    exportHint: document.getElementById('exportHint'),
    toasts: document.getElementById('toasts')
  };

  const STORAGE_KEY = 'callboard.localPosts.v1';
  const state = {
    local: [],
    repo: [],
    merged: [],
    filters: { q: '', tags: new Set(), showExpired: false },
    tagUniverse: new Set()
  };

  // Utilities
  const todayISO = () => {
    const d = new Date();
    const tz = new Date(d.getTime() - d.getTimezoneOffset()*60000);
    return tz.toISOString().slice(0,10);
  };

  const formatDate = (iso) => {
    if(!iso) return '';
    const [y,m,d]=iso.split('-').map(Number);
    const dt = new Date(y, (m||1)-1, d||1);
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const toast = (msg, type='info') => {
    const div = document.createElement('div');
    div.className = `toast ${type==='success'?'success':''} ${type==='error'?'error':''}`;
    div.textContent = msg;
    els.toasts.appendChild(div);
    setTimeout(() => { div.remove(); }, 4500);
  };

  const escapeHtml = (str='') => str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');

  const sanitizeUrl = (url='') => {
    const t = url.trim();
    if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
    return '#';
  };

  // Tiny markdown: **bold**, *italic*, [text](url), and newlines
  const renderMarkdown = (src='') => {
    let s = escapeHtml(src);

    // links: [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_,text,url) => {
      const href = sanitizeUrl(url);
      const t = escapeHtml(text);
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${t}</a>`;
    });

    // bold: **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // italic: *text* or _text_
    s = s.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');

    // newlines -> <br>
    s = s.replace(/\r?\n/g, '<br>');
    return s;
  };

  const readLocal = () => {
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(normalizePost).filter(Boolean) : [];
    }catch(e){
      console.warn('Local storage parse error', e);
      return [];
    }
  };
  const writeLocal = (arr) => {
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }catch(e){
      console.warn('Local storage write error', e);
      toast('Could not save to localStorage.', 'error');
    }
  };

  const normalizePost = (p) => {
    if (!p || typeof p !== 'object') return null;
    const id = String(p.id ?? '').trim();
    const title = String(p.title ?? '').trim();
    const body = String(p.body ?? '').trim();
    const date = String(p.date ?? '').trim();
    if (!id || !title || !body || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const expires = p.expires && /^\d{4}-\d{2}-\d{2}$/.test(String(p.expires)) ? String(p.expires) : undefined;
    const pinned = Boolean(p.pinned);
    const tags = Array.isArray(p.tags)
      ? p.tags.map(t=>String(t).trim()).filter(Boolean)
      : (typeof p.tags === 'string' ? String(p.tags).split(',').map(s=>s.trim()).filter(Boolean) : []);
    return { id, title, body, date, expires, tags, pinned };
  };

  const mergePosts = (local, repo) => {
    // repo overrides local when id collides
    const map = new Map();
    for (const p of local) map.set(p.id, p);
    for (const p of repo) map.set(p.id, p);
    return Array.from(map.values());
  };

  const isExpired = (p) => {
    if (!p.expires) return false;
    const today = todayISO();
    return today > p.expires; // expires is inclusive; visible through its day
  };

  const sortPosts = (arr) => arr.slice().sort((a,b)=>{
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return a.id.localeCompare(b.id);
  });

  const applyFilters = (arr) => {
    const q = state.filters.q.toLowerCase().trim();
    const needTags = state.filters.tags;
    const showExpired = state.filters.showExpired;

    return arr.filter(p=>{
      if (!showExpired && isExpired(p)) return false;

      if (needTags.size){
        const tset = new Set((p.tags||[]).map(t=>t.toLowerCase()));
        for (const t of needTags) if (!tset.has(t)) return false;
      }

      if (q){
        const hay = (p.title + ' ' + p.body + ' ' + (p.tags||[]).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  };

  const updateLastUpdated = () => {
    const now = new Date();
    els.lastUpdated.dateTime = now.toISOString();
    els.lastUpdated.textContent = now.toLocaleString();
  };

  const buildTagFilters = () => {
    const wasSelected = new Set(Array.from(state.filters.tags));
    state.tagUniverse = new Set();
    for (const p of state.merged) for (const t of (p.tags||[])) state.tagUniverse.add(t);

    els.tagFilters.innerHTML = '';
    if (!state.tagUniverse.size){
      const span = document.createElement('span');
      span.className = 'muted small';
      span.textContent = 'No tags yet';
      els.tagFilters.appendChild(span);
      return;
    }

    for (const tag of Array.from(state.tagUniverse).sort((a,b)=>a.localeCompare(b))){
      const id = `tag-${tag.toLowerCase().replace(/\s+/g,'-')}`;
      const label = document.createElement('label');
      label.className = 'tag-chip';
      label.setAttribute('for', id);
      label.innerHTML = `<input type="checkbox" id="${id}" value="${tag}"><span>#${tag}</span>`;
      const input = label.querySelector('input');
      if (wasSelected.has(tag.toLowerCase())) {
        input.checked = true;
        label.classList.add('active');
      }
      input.addEventListener('change', (e)=>{
        const t = String(tag).toLowerCase();
        if (e.target.checked) state.filters.tags.add(t);
        else state.filters.tags.delete(t);
        label.classList.toggle('active', e.target.checked);
        renderList();
      });
      els.tagFilters.appendChild(label);
    }
  };

  const permalink = (id) => `#${encodeURIComponent(id)}`;

  const renderList = () => {
    const filtered = sortPosts(applyFilters(state.merged));
    els.posts.innerHTML = '';
    els.listCount.textContent = `${filtered.length} ${filtered.length===1?'post':'posts'} shown`;

    if (!filtered.length){
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    for (const p of filtered){
      const article = document.createElement('article');
      article.className = 'post';
      article.id = p.id;

      const badges = [];
      if (p.pinned) badges.push(`<span class="badge pinned" title="Pinned">Pinned</span>`);
      if (p.expires) {
        const expired = isExpired(p);
        badges.push(`<span class="badge ${expired?'expired':''}" title="Expires">${expired?'Expired ':'Expires '}${formatDate(p.expires)}</span>`);
      }

      const tags = (p.tags||[]).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join(' ');

      article.innerHTML = `
        <div class="post-header">
          <h3 class="post-title">${escapeHtml(p.title)}</h3>
          <div class="post-meta">
            <span>${formatDate(p.date)}</span>
            <span class="badges">${badges.join(' ')}</span>
            <a class="post-anchor" href="${permalink(p.id)}" aria-label="Link to ${escapeHtml(p.title)}" title="Perma‑link">🔗</a>
          </div>
        </div>
        <div class="tags">${tags}</div>
        <div class="post-body">${renderMarkdown(p.body)}</div>
      `;
      els.posts.appendChild(article);
    }
    updateLastUpdated();
  };

  const setDataSourceNote = ({repoLoaded, repoError}) => {
    if (repoLoaded) {
      els.dataSourceNote.textContent = 'Repo mode + local';
    } else if (repoError) {
      els.dataSourceNote.textContent = 'Local mode (announcements.json not found)';
    } else {
      els.dataSourceNote.textContent = 'Local mode';
    }
  };

  const refreshAll = ({repoLoaded=false, repoError=false}={}) => {
    state.merged = mergePosts(state.local, state.repo);
    buildTagFilters();
    renderList();
    setDataSourceNote({repoLoaded, repoError});
  };

  const fetchRepo = async () => {
    try{
      const res = await fetch('./announcements.json', { cache: 'no-store' });
      if (!res.ok) {
        refreshAll({repoLoaded:false, repoError:true});
        return;
      }
      const data = await res.json().catch(()=>null);
      if (!Array.isArray(data)) {
        toast('announcements.json is not a valid array. Using local only.', 'error');
        refreshAll({repoLoaded:false, repoError:true});
        return;
      }
      state.repo = data.map(normalizePost).filter(Boolean);
      refreshAll({repoLoaded:true});
    }catch(err){
      console.warn('Fetch repo failed', err);
      toast('Could not load announcements.json. Using local only.', 'error');
      refreshAll({repoLoaded:false, repoError:true});
    }
  };

  // Form helpers
  const slugify = (str) => {
    return String(str || '')
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
  };

  const buildId = (date, title) => {
    return `${date}-${slugify(title) || 'post'}`;
  };

  const onPreview = () => {
    const title = els.title.value.trim();
    const body = els.body.value.trim();
    const date = els.date.value || todayISO();
    const expires = els.expires.value.trim();
    const pinned = els.pinned.checked;
    const tags = els.tags.value.split(',').map(s=>s.trim()).filter(Boolean);
    if (!title && !body){
      els.previewArea.hidden = true;
      return;
    }
    const id = buildId(date, title);
    const p = { id, title, body, date, expires: expires || undefined, tags, pinned };

    const badges = [];
    if (p.pinned) badges.push(`<span class="badge pinned">Pinned</span>`);
    if (p.expires) badges.push(`<span class="badge">Expires ${formatDate(p.expires)}</span>`);

    els.previewArea.innerHTML = `
      <div class="post">
        <div class="post-header">
          <h3 class="post-title">${escapeHtml(p.title || '(Untitled)')}</h3>
          <div class="post-meta">
            <span>${formatDate(p.date)}</span>
            <span class="badges">${badges.join(' ')}</span>
            <span class="post-anchor muted small">Preview</span>
          </div>
        </div>
        <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join(' ')}</div>
        <div class="post-body">${renderMarkdown(p.body || '')}</div>
      </div>
    `;
    els.previewArea.hidden = false;
  };

  const onAddLocal = (e) => {
    e.preventDefault();
    const title = els.title.value.trim();
    const body = els.body.value.trim();
    const date = els.date.value || todayISO();
    const expires = els.expires.value.trim();
    const pinned = els.pinned.checked;
    const tags = els.tags.value.split(',').map(s=>s.trim()).filter(Boolean);

    if (!title || !body){
      toast('Please fill in Title and Details.', 'error');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      toast('Please provide a valid Date (YYYY-MM-DD).', 'error');
      return;
    }
    const id = buildId(date, title);
    const post = normalizePost({ id, title, body, date, expires: expires || undefined, tags, pinned });
    if (!post){
      toast('Could not create the post. Check your inputs.', 'error');
      return;
    }

    // Save to local
    state.local = readLocal();
    state.local.push(post);
    // de-dup any accidental same id local entries (keep last)
    const map = new Map();
    for (const p of state.local) map.set(p.id, p);
    state.local = Array.from(map.values());
    writeLocal(state.local);

    toast('Saved locally. Use Export to share.', 'success');
    // Clear form but keep date
    els.title.value = '';
    els.body.value = '';
    els.tags.value = '';
    els.expires.value = '';
    els.pinned.checked = false;
    els.previewArea.hidden = true;

    refreshAll();
  };

  const exportAll = async () => {
    const all = sortPosts(state.merged);
    const compact = all.map(p=>{
      // Keep schema minimal and stable
      const obj = { id: p.id, title: p.title, body: p.body, date: p.date };
      if (p.expires) obj.expires = p.expires;
      if (p.tags && p.tags.length) obj.tags = p.tags;
      if (p.pinned) obj.pinned = true;
      return obj;
    });
    const json = JSON.stringify(compact, null, 2);

    // Download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcements.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Clipboard
    try{
      await navigator.clipboard.writeText(json);
      els.exportHint.textContent = 'Downloaded and copied JSON to clipboard.';
      toast('Copied JSON to clipboard.', 'success');
    }catch(e){
      els.exportHint.textContent = 'Downloaded. Clipboard copy not permitted by browser.';
      toast('Downloaded JSON. Clipboard copy not permitted.', 'error');
    }
  };

  // Events
  document.addEventListener('DOMContentLoaded', ()=>{
    els.date.value = todayISO();

    state.local = readLocal();
    refreshAll(); // render immediately with local
    fetchRepo();  // then try to load repo JSON

    els.search.addEventListener('input', (e)=>{
      state.filters.q = e.target.value || '';
      renderList();
    });
    els.showExpired.addEventListener('change', (e)=>{
      state.filters.showExpired = !!e.target.checked;
      renderList();
    });
    els.previewBtn.addEventListener('click', onPreview);
    els.form.addEventListener('submit', onAddLocal);
    els.exportBtn.addEventListener('click', exportAll);
  });

})();