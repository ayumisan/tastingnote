export const ROAST_LABELS = ['', '浅煎り', '中浅煎り', '中煎り', '中深煎り', '深煎り'];

export function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || min));
}

export function todayStr() {
  return new Date().toLocaleDateString('sv'); // YYYY-MM-DD
}

export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function diamond(cx, cy, r) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

/**
 * Filter notes by text query and date range.
 * @param {Array} notes
 * @param {{ query?: string, dateFrom?: string, dateTo?: string }} opts
 */
export function filterNotes(notes, { query = '', dateFrom = '', dateTo = '' } = {}) {
  const q = query.toLowerCase();
  return notes.filter(n => {
    if (q && ![n.beanName, n.roaster, n.origin, ...(n.tags || [])].some(
      v => v && v.toLowerCase().includes(q))) return false;
    if (dateFrom && n.drinkDate && n.drinkDate < dateFrom) return false;
    if (dateTo   && n.drinkDate && n.drinkDate > dateTo)   return false;
    return true;
  });
}

/**
 * Sort a copy of notes by the given sort key.
 * @param {Array} notes
 * @param {'newest'|'oldest'|'rating-desc'} sort
 */
export function sortNotes(notes, sort) {
  return [...notes].sort((a, b) => {
    if (sort === 'oldest')      return a.createdAt - b.createdAt;
    if (sort === 'rating-desc') return b.rating - a.rating;
    return b.createdAt - a.createdAt;
  });
}
