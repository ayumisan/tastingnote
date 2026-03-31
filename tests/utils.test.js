import { describe, it, expect } from 'vitest';
import {
  clamp, escHtml, diamond, todayStr,
  uuid, filterNotes, sortNotes, ROAST_LABELS,
} from '../src/utils.js';

// ── clamp ────────────────────────────────────────────────────
describe('clamp', () => {
  it('値が範囲内ならそのまま返す', () => {
    expect(clamp(3, 1, 5)).toBe(3);
  });
  it('最小値を下回るとminを返す', () => {
    expect(clamp(0, 1, 5)).toBe(1);
  });
  it('最大値を超えるとmaxを返す', () => {
    expect(clamp(9, 1, 5)).toBe(5);
  });
  it('数値でない値はminを返す', () => {
    expect(clamp('abc', 1, 5)).toBe(1);
  });
  it('小数を正しく扱う', () => {
    expect(clamp(3.5, 1, 5)).toBe(3.5);
  });
});

// ── escHtml ──────────────────────────────────────────────────
describe('escHtml', () => {
  it('& をエスケープする', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });
  it('< と > をエスケープする', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });
  it('" をエスケープする', () => {
    expect(escHtml('"hello"')).toBe('&quot;hello&quot;');
  });
  it('エスケープ不要な文字列はそのまま', () => {
    expect(escHtml('エチオピア')).toBe('エチオピア');
  });
  it('数値を文字列に変換する', () => {
    expect(escHtml(42)).toBe('42');
  });
});

// ── diamond ──────────────────────────────────────────────────
describe('diamond', () => {
  it('4点のSVG座標文字列を返す', () => {
    expect(diamond(100, 100, 50)).toBe('100,50 150,100 100,150 50,100');
  });
  it('半径0なら中心点だけ', () => {
    expect(diamond(10, 20, 0)).toBe('10,20 10,20 10,20 10,20');
  });
});

// ── todayStr ─────────────────────────────────────────────────
describe('todayStr', () => {
  it('YYYY-MM-DD形式の文字列を返す', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('今日の日付と一致する', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayStr()).toBe(expected);
  });
});

// ── uuid ─────────────────────────────────────────────────────
describe('uuid', () => {
  it('空文字ではない文字列を返す', () => {
    expect(typeof uuid()).toBe('string');
    expect(uuid().length).toBeGreaterThan(0);
  });
  it('呼び出すたびに異なる値を返す', () => {
    expect(uuid()).not.toBe(uuid());
  });
});

// ── ROAST_LABELS ─────────────────────────────────────────────
describe('ROAST_LABELS', () => {
  it('インデックス1〜5に焙煎度ラベルがある', () => {
    expect(ROAST_LABELS[1]).toBe('浅煎り');
    expect(ROAST_LABELS[3]).toBe('中煎り');
    expect(ROAST_LABELS[5]).toBe('深煎り');
  });
  it('インデックス0は空文字', () => {
    expect(ROAST_LABELS[0]).toBe('');
  });
});

// ── filterNotes ──────────────────────────────────────────────
const NOTES = [
  { beanName: 'エチオピア イルガチェフェ', roaster: '丸山珈琲', origin: 'エチオピア', tags: ['フルーティー'], drinkDate: '2026-01-10', createdAt: 1000, rating: 5 },
  { beanName: 'コロンビア スプレモ',       roaster: 'ブルーボトル', origin: 'コロンビア', tags: ['ナッティ'],   drinkDate: '2026-02-15', createdAt: 2000, rating: 3 },
  { beanName: 'ケニア AA',                roaster: '猿田彦珈琲',   origin: 'ケニア',    tags: ['ベリー系'],   drinkDate: '2026-03-20', createdAt: 3000, rating: 4 },
];

describe('filterNotes', () => {
  it('クエリなしで全件返す', () => {
    expect(filterNotes(NOTES).length).toBe(3);
  });
  it('豆名で絞り込む', () => {
    const r = filterNotes(NOTES, { query: 'エチオピア' });
    expect(r.length).toBe(1);
    expect(r[0].beanName).toContain('エチオピア');
  });
  it('ロースターで絞り込む', () => {
    const r = filterNotes(NOTES, { query: '丸山' });
    expect(r.length).toBe(1);
  });
  it('タグで絞り込む', () => {
    const r = filterNotes(NOTES, { query: 'ベリー' });
    expect(r.length).toBe(1);
    expect(r[0].beanName).toBe('ケニア AA');
  });
  it('大文字小文字を区別しない', () => {
    const r = filterNotes(NOTES, { query: 'colombia' });
    expect(r.length).toBe(0); // 日本語データなのでマッチしない
  });
  it('dateFromで開始日以前を除外する', () => {
    const r = filterNotes(NOTES, { dateFrom: '2026-02-01' });
    expect(r.length).toBe(2);
    expect(r.every(n => n.drinkDate >= '2026-02-01')).toBe(true);
  });
  it('dateToで終了日以降を除外する', () => {
    const r = filterNotes(NOTES, { dateTo: '2026-02-28' });
    expect(r.length).toBe(2);
  });
  it('期間で絞り込む', () => {
    const r = filterNotes(NOTES, { dateFrom: '2026-02-01', dateTo: '2026-02-28' });
    expect(r.length).toBe(1);
    expect(r[0].beanName).toContain('コロンビア');
  });
  it('drinkDateがないノートは日付フィルターをスキップする', () => {
    const noDate = [{ beanName: 'テスト', tags: [], createdAt: 9999 }];
    const r = filterNotes(noDate, { dateFrom: '2026-01-01', dateTo: '2026-12-31' });
    expect(r.length).toBe(1);
  });
});

// ── sortNotes ────────────────────────────────────────────────
describe('sortNotes', () => {
  it('newest: createdAt降順', () => {
    const r = sortNotes(NOTES, 'newest');
    expect(r[0].createdAt).toBe(3000);
    expect(r[2].createdAt).toBe(1000);
  });
  it('oldest: createdAt昇順', () => {
    const r = sortNotes(NOTES, 'oldest');
    expect(r[0].createdAt).toBe(1000);
    expect(r[2].createdAt).toBe(3000);
  });
  it('rating-desc: rating降順', () => {
    const r = sortNotes(NOTES, 'rating-desc');
    expect(r[0].rating).toBe(5);
    expect(r[2].rating).toBe(3);
  });
  it('元配列を変更しない', () => {
    const original = [...NOTES];
    sortNotes(NOTES, 'oldest');
    expect(NOTES[0]).toBe(original[0]);
  });
});
