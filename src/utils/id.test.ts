import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTableId, generateShortId } from './id';

describe('ID生成ユーティリティ', () => {
  beforeEach(() => {
    // 時間を固定してテストの一貫性を保つ
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateTableId', () => {
    it('一意のテーブルIDを生成する', () => {
      const id1 = generateTableId();
      const id2 = generateTableId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^table_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^table_\d+_[a-z0-9]{9}$/);
    });

    it('タイムスタンプを含むIDを生成する', () => {
      const id = generateTableId();
      const timestamp = Date.now();
      
      expect(id).toContain(`table_${timestamp}_`);
    });

    it('複数回呼び出しても異なるIDを生成する', () => {
      const ids = new Set();
      
      // 100回生成してすべて異なることを確認
      for (let i = 0; i < 100; i++) {
        const id = generateTableId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100);
    });

    it('正しい形式のIDを生成する', () => {
      const id = generateTableId();
      const parts = id.split('_');
      
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('table');
      expect(parts[1]).toMatch(/^\d+$/); // タイムスタンプ
      expect(parts[2]).toMatch(/^[a-z0-9]{9}$/); // ランダム文字列
    });
  });

  describe('generateShortId', () => {
    it('短縮IDを生成する', () => {
      const id = generateShortId();
      
      expect(id).toMatch(/^[A-Z0-9]{6}$/);
      expect(id).toHaveLength(6);
    });

    it('大文字のIDを生成する', () => {
      const id = generateShortId();
      
      expect(id).toBe(id.toUpperCase());
    });

    it('複数回呼び出しても異なるIDを生成する', () => {
      const ids = new Set();
      
      // 100回生成してすべて異なることを確認
      for (let i = 0; i < 100; i++) {
        const id = generateShortId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100);
    });

    it('英数字のみを含む', () => {
      const id = generateShortId();
      
      expect(id).toMatch(/^[A-Z0-9]+$/);
    });

    it('固定長のIDを生成する', () => {
      for (let i = 0; i < 10; i++) {
        const id = generateShortId();
        expect(id).toHaveLength(6);
      }
    });
  });

  describe('ID生成の一意性', () => {
    it('generateTableIdとgenerateShortIdは異なる形式を生成する', () => {
      const tableId = generateTableId();
      const shortId = generateShortId();
      
      expect(tableId).not.toBe(shortId);
      expect(tableId.includes('table_')).toBe(true);
      expect(shortId.includes('table_')).toBe(false);
    });

    it('高頻度での生成でも一意性を保つ', () => {
      const allIds = new Set();
      
      // 短時間で大量のIDを生成
      for (let i = 0; i < 1000; i++) {
        const tableId = generateTableId();
        const shortId = generateShortId();
        
        expect(allIds.has(tableId)).toBe(false);
        expect(allIds.has(shortId)).toBe(false);
        
        allIds.add(tableId);
        allIds.add(shortId);
      }
      
      expect(allIds.size).toBe(2000);
    });
  });

  describe('エッジケース', () => {
    it('Math.randomが0を返す場合も処理する', () => {
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0);
      
      try {
        const tableId = generateTableId();
        const shortId = generateShortId();
        
        expect(tableId).toMatch(/^table_\d+_[a-z0-9]{9}$/);
        expect(shortId).toMatch(/^[A-Z0-9]{6}$/);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('Math.randomが1に近い値を返す場合も処理する', () => {
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.9999999);
      
      try {
        const tableId = generateTableId();
        const shortId = generateShortId();
        
        expect(tableId).toMatch(/^table_\d+_[a-z0-9]{9}$/);
        expect(shortId).toMatch(/^[A-Z0-9]{6}$/);
      } finally {
        Math.random = originalRandom;
      }
    });
  });
});