'use strict';

// ── Constants ────────────────────────────────────────────────
const STORAGE_KEY = 'tastingnote:notes';
const TAGS_KEY    = 'tastingnote:tags';
const MAX_PHOTO_PX = 800;

const ROAST_LABELS = ['', '浅煎り', '中浅煎り', '中煎り', '中深煎り', '深煎り'];
const PRESET_TAGS  = [
  'フルーティー', 'ベリー系', 'シトラス', 'フローラル',
  'チョコレート', 'キャラメル', 'ナッティ', 'バニラ',
  'スパイシー', 'ハーブ', 'アーシー', 'ウッディ',
];

// ── State ────────────────────────────────────────────────────
let notes = [];
let masterTags   = [...PRESET_TAGS]; // all known tags
let selectedTags = [];               // tags for current form
let currentRating = 0;
let currentPhotos = []; // array of base64 strings
let pendingDeleteId = null;
let editingId = null;    // id of note being edited, or null

// ── Storage ──────────────────────────────────────────────────
function loadNotes() {
  try {
    notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    notes = [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    showToast('保存に失敗しました（容量不足の可能性があります）');
  }
}

// ── Tag storage ───────────────────────────────────────────────
function loadMasterTags() {
  try {
    const saved = JSON.parse(localStorage.getItem(TAGS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length > 0) masterTags = saved;
  } catch { /* use preset */ }
}

function saveMasterTags() {
  localStorage.setItem(TAGS_KEY, JSON.stringify(masterTags));
}

function addToMaster(tag) {
  if (!masterTags.includes(tag)) {
    masterTags.push(tag);
    saveMasterTags();
  }
}

// ── Tag UI ────────────────────────────────────────────────────
function renderSelectedTags() {
  const container = document.getElementById('selected-tags');
  container.innerHTML = '';
  selectedTags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'flavor-chip';
    chip.innerHTML = `${escHtml(tag)}<button type="button" aria-label="${escHtml(tag)}を削除">×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      selectedTags = selectedTags.filter(t => t !== tag);
      renderSelectedTags();
    });
    container.appendChild(chip);
  });
}

function selectTag(tag) {
  selectedTags.push(tag);
  addToMaster(tag);
  renderSelectedTags();
  closePicker();
}

function openPicker() {
  const picker = document.getElementById('tag-picker');
  picker.hidden = false;
  const input = document.getElementById('tag-input');
  input.value = '';
  renderSuggestions('');
  input.focus();
}

function closePicker() {
  document.getElementById('tag-picker').hidden = true;
  document.getElementById('tag-input').value = '';
}

function renderSuggestions(query) {
  const box = document.getElementById('tag-suggestions');
  box.innerHTML = '';
  const q = query.trim().toLowerCase();

  const candidates = masterTags.filter(t =>
    q === '' || t.toLowerCase().includes(q)
  );

  candidates.forEach(tag => {
    const item = document.createElement('div');
    item.className = 'tag-suggestion-item';
    item.textContent = tag;
    item.addEventListener('mousedown', e => { e.preventDefault(); selectTag(tag); });
    box.appendChild(item);
  });

  // "新しく追加" option when query doesn't exactly match any master tag
  const exactExists = masterTags.some(t => t.toLowerCase() === q);
  if (q && !exactExists) {
    const item = document.createElement('div');
    item.className = 'tag-suggestion-item create';
    item.textContent = `「${query.trim()}」を追加`;
    item.addEventListener('mousedown', e => { e.preventDefault(); selectTag(query.trim()); });
    box.appendChild(item);
  }

  if (box.children.length === 0) {
    const item = document.createElement('div');
    item.className = 'tag-suggestion-item no-result';
    item.textContent = '候補がありません';
    box.appendChild(item);
  }
}

// ── UUID ─────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Radar Chart (SVG) ─────────────────────────────────────────
function buildRadar(svgEl, { bitterness, acidity, sweetness, body }, size = 220) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  const ns = 'http://www.w3.org/2000/svg';

  svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svgEl.setAttribute('width', size);
  svgEl.setAttribute('height', size);
  svgEl.innerHTML = '';

  // Grid polygons (5 levels)
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', diamond(cx, cy, r * t));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#d4c5a9');
    poly.setAttribute('stroke-width', '1');
    svgEl.appendChild(poly);
  }

  // Axis lines
  [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]].forEach(([x, y]) => {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', x);  line.setAttribute('y2', y);
    line.setAttribute('stroke', '#d4c5a9');
    line.setAttribute('stroke-width', '1');
    svgEl.appendChild(line);
  });

  // Data polygon
  const b  = clamp(bitterness, 1, 5) / 5;
  const a  = clamp(acidity,    1, 5) / 5;
  const s  = clamp(sweetness,  1, 5) / 5;
  const bo = clamp(body,       1, 5) / 5;

  const dataPoly = document.createElementNS(ns, 'polygon');
  dataPoly.setAttribute('points', [
    `${cx},${cy - r * b}`,
    `${cx + r * a},${cy}`,
    `${cx},${cy + r * s}`,
    `${cx - r * bo},${cy}`,
  ].join(' '));
  dataPoly.setAttribute('fill', 'rgba(200,151,58,0.28)');
  dataPoly.setAttribute('stroke', '#c8973a');
  dataPoly.setAttribute('stroke-width', '2');
  dataPoly.setAttribute('stroke-linejoin', 'round');
  svgEl.appendChild(dataPoly);

  // Labels
  const pad = size * 0.088;
  [
    { text: '苦味', x: cx,       y: cy - r - pad * 0.6, anchor: 'middle' },
    { text: '酸味', x: cx + r + pad * 0.55, y: cy + 5,  anchor: 'start'  },
    { text: '甘味', x: cx,       y: cy + r + pad,        anchor: 'middle' },
    { text: 'コク', x: cx - r - pad * 0.55, y: cy + 5,  anchor: 'end'    },
  ].forEach(({ text, x, y, anchor }) => {
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', anchor);
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-size', size * 0.062);
    t.setAttribute('fill', '#5c3d1e');
    t.setAttribute('font-family', '-apple-system, sans-serif');
    t.textContent = text;
    svgEl.appendChild(t);
  });
}

function diamond(cx, cy, r) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, Number(v) || min)); }

function todayStr() {
  return new Date().toLocaleDateString('sv'); // YYYY-MM-DD
}


// ── Photo helpers ─────────────────────────────────────────────
function compressImage(file, maxPx, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoThumbnails() {
  const container = document.getElementById('photo-thumbnails');
  container.innerHTML = '';
  currentPhotos.forEach((src, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-thumb';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `photo ${idx + 1}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove-photo';
    btn.innerHTML = '×';
    btn.setAttribute('aria-label', '写真を削除');
    btn.addEventListener('click', () => {
      currentPhotos.splice(idx, 1);
      renderPhotoThumbnails();
    });
    wrap.append(img, btn);
    container.appendChild(wrap);
  });
}

// ── Star rating ───────────────────────────────────────────────
function renderStars(container, value) {
  container.querySelectorAll('.star').forEach(btn => {
    btn.textContent = Number(btn.dataset.value) <= value ? '★' : '☆';
    btn.classList.toggle('active', Number(btn.dataset.value) <= value);
  });
}

// ── Form flavors & radar ──────────────────────────────────────
function getFlavorValues() {
  return {
    bitterness: Number(document.getElementById('sl-bitterness').value),
    acidity:    Number(document.getElementById('sl-acidity').value),
    sweetness:  Number(document.getElementById('sl-sweetness').value),
    body:       Number(document.getElementById('sl-body').value),
  };
}

function refreshFormRadar() {
  buildRadar(document.getElementById('form-radar'), getFlavorValues(), 220);
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Render note list ──────────────────────────────────────────
function renderList() {
  const query    = document.getElementById('search-input').value.toLowerCase();
  const sort     = document.getElementById('sort-select').value;
  const dateFrom = document.getElementById('date-from').value;
  const dateTo   = document.getElementById('date-to').value;
  const listEl   = document.getElementById('notes-list');
  const emptyMsg = document.getElementById('empty-msg');

  let filtered = notes.filter(n => {
    if (query && ![n.beanName, n.roaster, n.origin, ...(n.tags || [])].some(
      v => v && v.toLowerCase().includes(query))) return false;
    if (dateFrom && n.drinkDate && n.drinkDate < dateFrom) return false;
    if (dateTo   && n.drinkDate && n.drinkDate > dateTo)   return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'oldest')      return a.createdAt - b.createdAt;
    if (sort === 'rating-desc') return b.rating - a.rating;
    return b.createdAt - a.createdAt; // newest
  });

  listEl.innerHTML = '';
  emptyMsg.hidden = filtered.length > 0;

  filtered.forEach(note => {
    listEl.appendChild(buildCard(note));
  });

  updateCount();
}

function buildCard(note) {
  const card = document.createElement('article');
  card.className = 'note-card';
  card.dataset.id = note.id;

  const dateStr = note.drinkDate
    ? note.drinkDate.replace(/-/g, '/')
    : new Date(note.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');

  // Stars string
  const stars = note.rating
    ? '★'.repeat(note.rating) + '☆'.repeat(5 - note.rating)
    : '';

  // Tag HTML helpers
  function tag(iconSvg, text) {
    return `<span class="tag">${iconSvg}${escHtml(text)}</span>`;
  }
  const pinIcon     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const fireIcon    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
  const cupIcon     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>`;
  const dropletIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  const homeIcon    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

  const tags = [
    note.origin     ? tag(pinIcon,     note.origin)                    : '',
    note.producer   ? tag(homeIcon,    note.producer)                  : '',
    note.process    ? tag(dropletIcon, note.process)                   : '',
    note.roastLevel ? tag(fireIcon,    ROAST_LABELS[note.roastLevel])  : '',
    note.brewMethod ? tag(cupIcon,     note.brewMethod)                : '',
  ].filter(Boolean).join('');

  // support old single photo
  const photos = note.photos || (note.photo ? [note.photo] : []);
  const photoHtml = photos.length === 0 ? '' :
    `<div class="card-photos${photos.length === 1 ? ' single' : ''}">${
      photos.map((src, i) => `<img src="${src}" alt="photo ${i+1}">`).join('')
    }</div>`;

  card.innerHTML = `
    ${photoHtml}
    <div class="card-header">
      <span class="card-bean-name">${escHtml(note.beanName)}</span>
      <div style="display:flex;gap:4px">
        <button class="edit-btn" aria-label="編集">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="delete-btn" aria-label="削除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6m4-6v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-date">${dateStr}</div>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
    <div class="card-radar">
      <svg viewBox="0 0 160 160" width="160" height="160"></svg>
    </div>
    ${stars ? `<div class="card-stars">${stars}</div>` : ''}
    ${(note.tags || []).length ? `<div class="card-flavor-tags">${(note.tags).map(t => `<span class="card-flavor-chip">${escHtml(t)}</span>`).join('')}</div>` : ''}
    ${note.memo ? `<p class="card-memo">${escHtml(note.memo)}</p>` : ''}
  `;

  buildRadar(card.querySelector('.card-radar svg'), note, 160);

  card.querySelector('.edit-btn').addEventListener('click', () => {
    loadNoteIntoForm(note);
    switchTab('record');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  card.querySelector('.delete-btn').addEventListener('click', () => {
    pendingDeleteId = note.id;
    document.getElementById('confirm-dialog').showModal();
  });

  return card;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateCount() {
  const el = document.getElementById('list-count');
  el.textContent = notes.length > 0 ? notes.length : '';
}

// ── Load note into form (edit mode) ──────────────────────────
function loadNoteIntoForm(note) {
  resetForm();
  editingId = note.id;

  document.getElementById('bean-name').value  = note.beanName  || '';
  document.getElementById('roaster').value    = note.roaster   || '';
  document.getElementById('origin').value     = note.origin    || '';
  document.getElementById('producer').value   = note.producer  || '';
  document.getElementById('brew-method').value = note.brewMethod || '';

  const rl = note.roastLevel || 3;
  document.getElementById('roast-level').value = rl;
  document.getElementById('roast-label').textContent = ROAST_LABELS[rl];

  ['bitterness', 'acidity', 'sweetness', 'body'].forEach(k => {
    const val = note[k] || 3;
    document.getElementById(`sl-${k}`).value = val;
    document.getElementById(`val-${k}`).textContent = `${parseFloat(val).toFixed(1)}/5`;
  });
  refreshFormRadar();

  currentRating = note.rating || 0;
  renderStars(document.getElementById('star-rating'), currentRating);

  selectedTags = [...(note.tags || [])];
  renderSelectedTags();

  // support both old single photo and new array
  currentPhotos = note.photos
    ? [...note.photos]
    : note.photo ? [note.photo] : [];
  renderPhotoThumbnails();

  document.getElementById('memo').value = note.memo || '';
  document.getElementById('process').value = note.process || '';
  document.getElementById('drink-date').value = note.drinkDate || todayStr();
  document.getElementById('submit-label').textContent = '更新する';
}

// ── Reset form ────────────────────────────────────────────────
function resetForm() {
  document.getElementById('record-form').reset();
  currentRating = 0;
  currentPhoto  = null;
  selectedTags  = [];
  editingId     = null;
  currentPhotos = [];
  document.getElementById('drink-date').value = todayStr();
  renderPhotoThumbnails();
  document.getElementById('roast-label').textContent = ROAST_LABELS[3];
  document.getElementById('submit-label').textContent = '記録する';
  document.getElementById('process').value = '';
  renderStars(document.getElementById('star-rating'), 0);
  refreshFormRadar();
  renderSelectedTags();
  closePicker();
  ['bitterness', 'acidity', 'sweetness', 'body'].forEach(k => {
    document.getElementById(`val-${k}`).textContent = '3.0/5';
  });
}

// ── Switch tabs ───────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.classList.toggle('active', sec.id === `tab-${name}`);
  });
  if (name === 'list') renderList();
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  loadNotes();
  loadMasterTags();
  updateCount();
  refreshFormRadar();
  document.getElementById('drink-date').value = todayStr();

  // Tag picker
  document.getElementById('tag-add-btn').addEventListener('click', () => {
    const picker = document.getElementById('tag-picker');
    picker.hidden ? openPicker() : closePicker();
  });
  document.getElementById('tag-input').addEventListener('input', e => {
    renderSuggestions(e.target.value);
  });
  document.getElementById('tag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val) selectTag(val);
    }
    if (e.key === 'Escape') closePicker();
  });
  document.addEventListener('click', e => {
    const picker  = document.getElementById('tag-picker');
    const addBtn  = document.getElementById('tag-add-btn');
    const selTags = document.getElementById('selected-tags');
    if (!picker.hidden &&
        !picker.contains(e.target) &&
        e.target !== addBtn &&
        !selTags.contains(e.target)) {
      closePicker();
    }
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Photo upload
  const photoInput = document.getElementById('photo-input');
  document.getElementById('photo-add-btn').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async () => {
    const files = [...photoInput.files];
    if (!files.length) return;
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f, MAX_PHOTO_PX)));
      currentPhotos.push(...compressed);
      renderPhotoThumbnails();
    } catch {
      showToast('写真の読み込みに失敗しました');
    }
    photoInput.value = '';
  });

  // Roast level slider
  document.getElementById('roast-level').addEventListener('input', e => {
    document.getElementById('roast-label').textContent = ROAST_LABELS[e.target.value];
  });

  // Flavor sliders
  ['bitterness', 'acidity', 'sweetness', 'body'].forEach(key => {
    document.getElementById(`sl-${key}`).addEventListener('input', e => {
      document.getElementById(`val-${key}`).textContent = `${parseFloat(e.target.value).toFixed(1)}/5`;
      refreshFormRadar();
    });
  });

  // Star rating
  const starContainer = document.getElementById('star-rating');
  starContainer.querySelectorAll('.star').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.value);
      currentRating = currentRating === val ? 0 : val;
      renderStars(starContainer, currentRating);
    });
  });

  // Search, date range & sort
  document.getElementById('search-input').addEventListener('input', renderList);
  document.getElementById('date-from').addEventListener('change', renderList);
  document.getElementById('date-to').addEventListener('change', renderList);
  document.getElementById('sort-select').addEventListener('change', renderList);

  // Form submit
  document.getElementById('record-form').addEventListener('submit', e => {
    e.preventDefault();
    const beanName = document.getElementById('bean-name').value.trim();
    if (!beanName) return;

    const fields = {
      beanName,
      roaster:    document.getElementById('roaster').value.trim(),
      origin:     document.getElementById('origin').value.trim(),
      photos:     [...currentPhotos],
      drinkDate:  document.getElementById('drink-date').value,
      producer:   document.getElementById('producer').value.trim(),
      process:    document.getElementById('process').value.trim(),
      roastLevel: Number(document.getElementById('roast-level').value),
      brewMethod: document.getElementById('brew-method').value,
      bitterness: Number(document.getElementById('sl-bitterness').value),
      acidity:    Number(document.getElementById('sl-acidity').value),
      sweetness:  Number(document.getElementById('sl-sweetness').value),
      body:       Number(document.getElementById('sl-body').value),
      rating:     currentRating,
      tags:       [...selectedTags],
      memo:       document.getElementById('memo').value.trim(),
    };

    if (editingId) {
      const idx = notes.findIndex(n => n.id === editingId);
      if (idx !== -1) notes[idx] = { ...notes[idx], ...fields };
      showToast('更新しました');
    } else {
      notes.unshift({ id: uuid(), createdAt: Date.now(), ...fields });
      showToast('記録しました');
    }

    saveNotes();
    updateCount();
    resetForm();
    switchTab('list');
  });

  // Delete confirm
  const dialog = document.getElementById('confirm-dialog');
  document.getElementById('confirm-cancel').addEventListener('click', () => {
    dialog.close();
    pendingDeleteId = null;
  });
  document.getElementById('confirm-ok').addEventListener('click', () => {
    if (pendingDeleteId) {
      notes = notes.filter(n => n.id !== pendingDeleteId);
      saveNotes();
      renderList();
      showToast('削除しました');
    }
    pendingDeleteId = null;
    dialog.close();
  });
  dialog.addEventListener('click', e => {
    if (e.target === dialog) { dialog.close(); pendingDeleteId = null; }
  });
}

document.addEventListener('DOMContentLoaded', init);
