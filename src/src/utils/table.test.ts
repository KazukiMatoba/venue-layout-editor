import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateTableId,
  getDefaultTableStyle,
  createTableObject,
  createRectangleTable,
  createCircleTable
} from './table';
import type { Position, TableStyle } from '../types';

describe('テーブルユーティリティ', () => {
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

    it('正しい形式のIDを生成する', () => {
      const id = generateTableId();
      const parts = id.split('_');
      
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('table');
      expect(parts[1]).toMatch(/^\d+$/);
      expect(parts[2]).toMatch(/^[a-z0-9]{9}$/);
    });

    it('複数回呼び出しても異なるIDを生成する', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        const id = generateTableId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100);
    });
  });

  describe('getDefaultTableStyle', () => {
    it('デフォルトスタイルを返す', () => {
      const style = getDefaultTableStyle();
      
      expect(style).toEqual({
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      });
    });

    it('毎回同じスタイルオブジェクトを返す', () => {
      const style1 = getDefaultTableStyle();
      const style2 = getDefaultTableStyle();
      
      expect(style1).toEqual(style2);
      expect(style1).not.toBe(style2); // 異なるオブジェクトインスタンス
    });

    it('有効なCSSカラー値を含む', () => {
      const style = getDefaultTableStyle();
      
      expect(style.fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(style.stroke).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof style.strokeWidth).toBe('number');
      expect(typeof style.opacity).toBe('number');
      expect(style.opacity).toBeGreaterThanOrEqual(0);
      expect(style.opacity).toBeLessThanOrEqual(1);
    });
  });

  describe('createTableObject', () => {
    const mockPosition: Position = { x: 100, y: 150 };
    const mockRectangleProps = { width: 80, height: 60 };
    const mockCircleProps = { radius: 40 };

    it('長方形テーブルオブジェクトを作成する', () => {
      const table = createTableObject('rectangle', mockPosition, mockRectangleProps);
      
      expect(table.type).toBe('rectangle');
      expect(table.position).toEqual(mockPosition);
      expect(table.properties).toEqual(mockRectangleProps);
      expect(table.style).toEqual(getDefaultTableStyle());
      expect(table.id).toMatch(/^table_\d+_[a-z0-9]{9}$/);
    });

    it('円形テーブルオブジェクトを作成する', () => {
      const table = createTableObject('circle', mockPosition, mockCircleProps);
      
      expect(table.type).toBe('circle');
      expect(table.position).toEqual(mockPosition);
      expect(table.properties).toEqual(mockCircleProps);
      expect(table.style).toEqual(getDefaultTableStyle());
      expect(table.id).toMatch(/^table_\d+_[a-z0-9]{9}$/);
    });

    it('カスタムスタイルを適用する', () => {
      const customStyle: Partial<TableStyle> = {
        fill: '#ff0000',
        opacity: 0.5
      };
      
      const table = createTableObject('rectangle', mockPosition, mockRectangleProps, customStyle);
      
      expect(table.style.fill).toBe('#ff0000');
      expect(table.style.opacity).toBe(0.5);
      expect(table.style.stroke).toBe('#1976d2'); // デフォルト値が保持される
      expect(table.style.strokeWidth).toBe(2); // デフォルト値が保持される
    });

    it('空のカスタムスタイルでもデフォルトスタイルを適用する', () => {
      const table = createTableObject('rectangle', mockPosition, mockRectangleProps, {});
      
      expect(table.style).toEqual(getDefaultTableStyle());
    });

    it('一意のIDを持つテーブルを作成する', () => {
      const table1 = createTableObject('rectangle', mockPosition, mockRectangleProps);
      const table2 = createTableObject('rectangle', mockPosition, mockRectangleProps);
      
      expect(table1.id).not.toBe(table2.id);
    });

    it('位置とプロパティの参照を保持する', () => {
      const table = createTableObject('rectangle', mockPosition, mockRectangleProps);
      
      expect(table.position).toBe(mockPosition);
      expect(table.properties).toBe(mockRectangleProps);
    });
  });

  describe('createRectangleTable', () => {
    const mockPosition: Position = { x: 200, y: 250 };

    it('長方形テーブルを作成する', () => {
      const table = createRectangleTable(mockPosition, 100, 80);
      
      expect(table.type).toBe('rectangle');
      expect(table.position).toEqual(mockPosition);
      expect(table.properties).toEqual({ width: 100, height: 80 });
      expect(table.style).toEqual(getDefaultTableStyle());
      expect(table.id).toMatch(/^table_\d+_[a-z0-9]{9}$/);
    });

    it('カスタムスタイルで長方形テーブルを作成する', () => {
      const customStyle: Partial<TableStyle> = {
        fill: '#00ff00',
        strokeWidth: 3
      };
      
      const table = createRectangleTable(mockPosition, 120, 90, customStyle);
      
      expect(table.type).toBe('rectangle');
      expect(table.properties).toEqual({ width: 120, height: 90 });
      expect(table.style.fill).toBe('#00ff00');
      expect(table.style.strokeWidth).toBe(3);
      expect(table.style.stroke).toBe('#1976d2'); // デフォルト値
    });

    it('小数点の寸法でも正しく作成する', () => {
      const table = createRectangleTable(mockPosition, 85.5, 65.7);
      
      expect(table.properties).toEqual({ width: 85.5, height: 65.7 });
    });

    it('最小サイズのテーブルも作成する', () => {
      const table = createRectangleTable(mockPosition, 1, 1);
      
      expect(table.properties).toEqual({ width: 1, height: 1 });
    });

    it('大きなサイズのテーブルも作成する', () => {
      const table = createRectangleTable(mockPosition, 1000, 800);
      
      expect(table.properties).toEqual({ width: 1000, height: 800 });
    });
  });

  describe('createCircleTable', () => {
    const mockPosition: Position = { x: 300, y: 350 };

    it('円形テーブルを作成する', () => {
      const table = createCircleTable(mockPosition, 50);
      
      expect(table.type).toBe('circle');
      expect(table.position).toEqual(mockPosition);
      expect(table.properties).toEqual({ radius: 50 });
      expect(table.style).toEqual(getDefaultTableStyle());
      expect(table.id).toMatch(/^table_\d+_[a-z0-9]{9}$/);
    });

    it('カスタムスタイルで円形テーブルを作成する', () => {
      const customStyle: Partial<TableStyle> = {
        fill: '#0000ff',
        opacity: 0.6
      };
      
      const table = createCircleTable(mockPosition, 60, customStyle);
      
      expect(table.type).toBe('circle');
      expect(table.properties).toEqual({ radius: 60 });
      expect(table.style.fill).toBe('#0000ff');
      expect(table.style.opacity).toBe(0.6);
      expect(table.style.stroke).toBe('#1976d2'); // デフォルト値
    });

    it('小数点の半径でも正しく作成する', () => {
      const table = createCircleTable(mockPosition, 42.5);
      
      expect(table.properties).toEqual({ radius: 42.5 });
    });

    it('最小サイズの円形テーブルも作成する', () => {
      const table = createCircleTable(mockPosition, 0.5);
      
      expect(table.properties).toEqual({ radius: 0.5 });
    });

    it('大きなサイズの円形テーブルも作成する', () => {
      const table = createCircleTable(mockPosition, 500);
      
      expect(table.properties).toEqual({ radius: 500 });
    });
  });

  describe('統合テスト', () => {
    it('異なる方法で作成されたテーブルが一意のIDを持つ', () => {
      const position: Position = { x: 100, y: 100 };
      
      const rect1 = createRectangleTable(position, 80, 60);
      const rect2 = createRectangleTable(position, 80, 60);
      const circle1 = createCircleTable(position, 40);
      const circle2 = createCircleTable(position, 40);
      const generic1 = createTableObject('rectangle', position, { width: 80, height: 60 });
      const generic2 = createTableObject('circle', position, { radius: 40 });
      
      const ids = [rect1.id, rect2.id, circle1.id, circle2.id, generic1.id, generic2.id];
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(6);
    });

    it('同じパラメータで作成されたテーブルが同じプロパティを持つ', () => {
      const position: Position = { x: 150, y: 200 };
      const customStyle: Partial<TableStyle> = { fill: '#ff00ff' };
      
      const rect1 = createRectangleTable(position, 100, 75, customStyle);
      const rect2 = createTableObject('rectangle', position, { width: 100, height: 75 }, customStyle);
      
      expect(rect1.type).toBe(rect2.type);
      expect(rect1.position).toEqual(rect2.position);
      expect(rect1.properties).toEqual(rect2.properties);
      expect(rect1.style).toEqual(rect2.style);
      expect(rect1.id).not.toBe(rect2.id); // IDのみ異なる
    });

    it('テーブル作成関数の一貫性を確認する', () => {
      const position: Position = { x: 0, y: 0 };
      
      // 長方形テーブル
      const rectDirect = createRectangleTable(position, 80, 60);
      const rectGeneric = createTableObject('rectangle', position, { width: 80, height: 60 });
      
      expect(rectDirect.type).toBe(rectGeneric.type);
      expect(rectDirect.properties).toEqual(rectGeneric.properties);
      expect(rectDirect.style).toEqual(rectGeneric.style);
      
      // 円形テーブル
      const circleDirect = createCircleTable(position, 40);
      const circleGeneric = createTableObject('circle', position, { radius: 40 });
      
      expect(circleDirect.type).toBe(circleGeneric.type);
      expect(circleDirect.properties).toEqual(circleGeneric.properties);
      expect(circleDirect.style).toEqual(circleGeneric.style);
    });
  });

  describe('エッジケース', () => {
    it('ゼロサイズのテーブルも作成できる', () => {
      const position: Position = { x: 0, y: 0 };
      
      const rectTable = createRectangleTable(position, 0, 0);
      const circleTable = createCircleTable(position, 0);
      
      expect(rectTable.properties).toEqual({ width: 0, height: 0 });
      expect(circleTable.properties).toEqual({ radius: 0 });
    });

    it('負の座標でもテーブルを作成できる', () => {
      const position: Position = { x: -100, y: -200 };
      
      const table = createRectangleTable(position, 50, 30);
      
      expect(table.position).toEqual(position);
    });

    it('極端に大きな値でもテーブルを作成できる', () => {
      const position: Position = { x: 999999, y: 999999 };
      
      const rectTable = createRectangleTable(position, 999999, 999999);
      const circleTable = createCircleTable(position, 999999);
      
      expect(rectTable.properties).toEqual({ width: 999999, height: 999999 });
      expect(circleTable.properties).toEqual({ radius: 999999 });
    });

    it('すべてのスタイルプロパティをオーバーライドできる', () => {
      const position: Position = { x: 0, y: 0 };
      const fullCustomStyle: TableStyle = {
        fill: '#custom1',
        stroke: '#custom2',
        strokeWidth: 999,
        opacity: 0.123
      };
      
      const table = createRectangleTable(position, 50, 50, fullCustomStyle);
      
      expect(table.style).toEqual(fullCustomStyle);
    });
  });
});