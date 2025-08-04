import { describe, it, expect } from 'vitest';
import {
  calculateDragDistance,
  validateDragOperation,
  processDragOperation,
  isIntentionalDrag,
  generateDragLog,
  roundPositionToPrecision,
  MIN_DRAG_DISTANCE
} from './dragUtils';
import type { TableObject, Position } from '../types';

// テスト用のモックデータ
const mockRectangleTable: TableObject = {
  id: 'test-rect',
  type: 'rectangle',
  position: { x: 100, y: 100 },
  properties: { width: 80, height: 60 },
  style: { fill: '', stroke: '', strokeWidth: 0, opacity: 0 }
};

const mockCircleTable: TableObject = {
  id: 'test-circle',
  type: 'circle',
  position: { x: 100, y: 100 },
  properties: { radius: 40 },
  style: { fill: '', stroke: '', strokeWidth: 0, opacity: 0 }
};

const mockBounds = {
  minX: 0,
  minY: 0,
  maxX: 800,
  maxY: 600
};

describe('ドラッグユーティリティ', () => {
  describe('calculateDragDistance', () => {
    it('水平方向のドラッグ距離を正しく計算する', () => {
      const start: Position = { x: 0, y: 0 };
      const end: Position = { x: 30, y: 0 };
      
      const distance = calculateDragDistance(start, end);
      expect(distance).toBe(30);
    });

    it('垂直方向のドラッグ距離を正しく計算する', () => {
      const start: Position = { x: 0, y: 0 };
      const end: Position = { x: 0, y: 40 };
      
      const distance = calculateDragDistance(start, end);
      expect(distance).toBe(40);
    });

    it('斜め方向のドラッグ距離を正しく計算する', () => {
      const start: Position = { x: 0, y: 0 };
      const end: Position = { x: 3, y: 4 };
      
      const distance = calculateDragDistance(start, end);
      expect(distance).toBe(5); // 3-4-5の直角三角形
    });

    it('負の方向のドラッグ距離も正しく計算する', () => {
      const start: Position = { x: 10, y: 10 };
      const end: Position = { x: 4, y: 2 };
      
      const distance = calculateDragDistance(start, end);
      expect(distance).toBe(10); // √(6² + 8²) = 10
    });

    it('同じ位置の場合は距離0を返す', () => {
      const start: Position = { x: 50, y: 50 };
      const end: Position = { x: 50, y: 50 };
      
      const distance = calculateDragDistance(start, end);
      expect(distance).toBe(0);
    });

    it('小数点座標でも正しく計算する', () => {
      const start: Position = { x: 1.5, y: 2.5 };
      const end: Position = { x: 4.5, y: 6.5 };
      
      const distance = calculateDragDistance(start, end);
      expect(distance).toBe(5); // √(3² + 4²) = 5
    });
  });

  describe('validateDragOperation', () => {
    it('境界内の有効な位置を正しく検証する', () => {
      const newPosition: Position = { x: 100, y: 100 };
      const result = validateDragOperation(mockRectangleTable, newPosition, mockBounds);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('左境界を超える位置を無効と判定する', () => {
      const newPosition: Position = { x: 30, y: 100 }; // 40 - 30 = 10 < 0
      const result = validateDragOperation(mockRectangleTable, newPosition, mockBounds);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('テーブルが左境界を超えています');
    });

    it('右境界を超える位置を無効と判定する', () => {
      const newPosition: Position = { x: 770, y: 100 }; // 770 + 40 = 810 > 800
      const result = validateDragOperation(mockRectangleTable, newPosition, mockBounds);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('テーブルが右境界を超えています');
    });

    it('上境界を超える位置を無効と判定する', () => {
      const newPosition: Position = { x: 100, y: 20 }; // 20 - 30 = -10 < 0
      const result = validateDragOperation(mockRectangleTable, newPosition, mockBounds);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('テーブルが上境界を超えています');
    });

    it('下境界を超える位置を無効と判定する', () => {
      const newPosition: Position = { x: 100, y: 580 }; // 580 + 30 = 610 > 600
      const result = validateDragOperation(mockRectangleTable, newPosition, mockBounds);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('テーブルが下境界を超えています');
    });

    it('円形テーブルの境界チェックも正しく動作する', () => {
      const validPosition: Position = { x: 50, y: 50 };
      const invalidPosition: Position = { x: 30, y: 30 }; // 30 - 40 = -10 < 0
      
      const validResult = validateDragOperation(mockCircleTable, validPosition, mockBounds);
      const invalidResult = validateDragOperation(mockCircleTable, invalidPosition, mockBounds);
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('境界ぎりぎりの位置を正しく判定する', () => {
      // 長方形テーブル（幅80、高さ60）の境界ぎりぎり
      const edgePositions = [
        { x: 40, y: 30 },   // 左上角
        { x: 760, y: 30 },  // 右上角
        { x: 40, y: 570 },  // 左下角
        { x: 760, y: 570 }  // 右下角
      ];
      
      edgePositions.forEach(position => {
        const result = validateDragOperation(mockRectangleTable, position, mockBounds);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('processDragOperation', () => {
    it('有効なドラッグ操作を正しく処理する', () => {
      const start: Position = { x: 100, y: 100 };
      const end: Position = { x: 150, y: 120 };
      
      const result = processDragOperation(mockRectangleTable, start, end, mockBounds);
      
      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual(end);
      expect(result.originalPosition).toEqual(start);
      expect(result.distance).toBeCloseTo(53.85, 2); // √(50² + 20²)
      expect(result.reason).toBeUndefined();
    });

    it('無効なドラッグ操作をロールバックする', () => {
      const start: Position = { x: 100, y: 100 };
      const end: Position = { x: 30, y: 100 }; // 境界外
      
      const result = processDragOperation(mockRectangleTable, start, end, mockBounds);
      
      expect(result.success).toBe(false);
      expect(result.finalPosition).toEqual(start); // 元の位置に戻る
      expect(result.originalPosition).toEqual(start);
      expect(result.distance).toBe(70);
      expect(result.reason).toBe('テーブルが左境界を超えています');
    });

    it('距離0のドラッグ操作も正しく処理する', () => {
      const position: Position = { x: 100, y: 100 };
      
      const result = processDragOperation(mockRectangleTable, position, position, mockBounds);
      
      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual(position);
      expect(result.distance).toBe(0);
    });

    it('複数の境界違反がある場合も適切に処理する', () => {
      const start: Position = { x: 100, y: 100 };
      const end: Position = { x: 10, y: 10 }; // 左上境界外
      
      const result = processDragOperation(mockRectangleTable, start, end, mockBounds);
      
      expect(result.success).toBe(false);
      expect(result.finalPosition).toEqual(start);
      expect(result.reason).toContain('境界を超えています');
    });
  });

  describe('isIntentionalDrag', () => {
    it('最小距離以上のドラッグを意図的と判定する', () => {
      const start: Position = { x: 0, y: 0 };
      const end: Position = { x: MIN_DRAG_DISTANCE + 1, y: 0 };
      
      const result = isIntentionalDrag(start, end);
      expect(result).toBe(true);
    });

    it('最小距離未満のドラッグを非意図的と判定する', () => {
      const start: Position = { x: 0, y: 0 };
      const end: Position = { x: MIN_DRAG_DISTANCE - 0.1, y: 0 };
      
      const result = isIntentionalDrag(start, end);
      expect(result).toBe(false);
    });

    it('最小距離ちょうどのドラッグを意図的と判定する', () => {
      const start: Position = { x: 0, y: 0 };
      const end: Position = { x: MIN_DRAG_DISTANCE, y: 0 };
      
      const result = isIntentionalDrag(start, end);
      expect(result).toBe(true);
    });

    it('同じ位置のドラッグを非意図的と判定する', () => {
      const position: Position = { x: 50, y: 50 };
      
      const result = isIntentionalDrag(position, position);
      expect(result).toBe(false);
    });

    it('斜め方向のドラッグも正しく判定する', () => {
      const start: Position = { x: 0, y: 0 };
      const shortDiagonal: Position = { x: 2, y: 2 }; // 距離 ≈ 2.83 < 3
      const longDiagonal: Position = { x: 3, y: 3 }; // 距離 ≈ 4.24 > 3
      
      expect(isIntentionalDrag(start, shortDiagonal)).toBe(false);
      expect(isIntentionalDrag(start, longDiagonal)).toBe(true);
    });
  });

  describe('generateDragLog', () => {
    it('成功したドラッグ操作のログを生成する', () => {
      const result = {
        success: true,
        finalPosition: { x: 150, y: 120 },
        originalPosition: { x: 100, y: 100 },
        distance: 53.85
      };
      
      const log = generateDragLog(result, 'table-123');
      expect(log).toBe('ドラッグ操作成功: table-123, 距離: 53.9px');
    });

    it('失敗したドラッグ操作のログを生成する', () => {
      const result = {
        success: false,
        finalPosition: { x: 100, y: 100 },
        originalPosition: { x: 100, y: 100 },
        distance: 70,
        reason: 'テーブルが境界を超えています'
      };
      
      const log = generateDragLog(result, 'table-456');
      expect(log).toBe('ドラッグ操作失敗: table-456, 距離: 70.0px (テーブルが境界を超えています)');
    });

    it('距離が不明な場合のログを生成する', () => {
      const result = {
        success: true,
        finalPosition: { x: 100, y: 100 },
        originalPosition: { x: 100, y: 100 }
      };
      
      const log = generateDragLog(result, 'table-789');
      expect(log).toBe('ドラッグ操作成功: table-789, 距離: 不明');
    });

    it('理由がない成功ログを生成する', () => {
      const result = {
        success: true,
        finalPosition: { x: 100, y: 100 },
        originalPosition: { x: 100, y: 100 },
        distance: 0
      };
      
      const log = generateDragLog(result, 'table-000');
      expect(log).toBe('ドラッグ操作成功: table-000, 距離: 0.0px');
    });
  });

  describe('roundPositionToPrecision', () => {
    it('位置を0.1mm精度に丸める', () => {
      const position: Position = { x: 123.456, y: 789.123 };
      const rounded = roundPositionToPrecision(position);
      
      expect(rounded).toEqual({ x: 123.5, y: 789.1 });
    });

    it('既に精度内の位置はそのまま返す', () => {
      const position: Position = { x: 100.0, y: 200.5 };
      const rounded = roundPositionToPrecision(position);
      
      expect(rounded).toEqual(position);
    });

    it('負の座標も正しく丸める', () => {
      const position: Position = { x: -123.456, y: -789.123 };
      const rounded = roundPositionToPrecision(position);
      
      expect(rounded).toEqual({ x: -123.5, y: -789.1 });
    });

    it('0に近い値も正しく丸める', () => {
      const position: Position = { x: 0.04, y: 0.06 };
      const rounded = roundPositionToPrecision(position);
      
      expect(rounded).toEqual({ x: 0.0, y: 0.1 });
    });

    it('大きな値も正しく丸める', () => {
      const position: Position = { x: 9999.999, y: 10000.001 };
      const rounded = roundPositionToPrecision(position);
      
      expect(rounded).toEqual({ x: 10000.0, y: 10000.0 });
    });

    it('境界値を正しく処理する', () => {
      const positions = [
        { input: { x: 0.05, y: 0.05 }, expected: { x: 0.1, y: 0.1 } },
        { input: { x: 0.04, y: 0.04 }, expected: { x: 0.0, y: 0.0 } },
        { input: { x: -0.05, y: -0.05 }, expected: { x: -0.1, y: -0.1 } },
        { input: { x: -0.04, y: -0.04 }, expected: { x: -0.0, y: -0.0 } }
      ];
      
      positions.forEach(({ input, expected }) => {
        const rounded = roundPositionToPrecision(input);
        expect(rounded).toEqual(expected);
      });
    });
  });

  describe('統合テスト', () => {
    it('完全なドラッグフローが正しく動作する', () => {
      const start: Position = { x: 100.123, y: 100.456 };
      const end: Position = { x: 150.789, y: 120.321 };
      
      // 1. 意図的なドラッグかチェック
      const isIntentional = isIntentionalDrag(start, end);
      expect(isIntentional).toBe(true);
      
      // 2. ドラッグ操作を処理
      const result = processDragOperation(mockRectangleTable, start, end, mockBounds);
      expect(result.success).toBe(true);
      
      // 3. 最終位置を精度に丸める
      const finalPosition = roundPositionToPrecision(result.finalPosition);
      expect(finalPosition).toEqual({ x: 150.8, y: 120.3 });
      
      // 4. ログを生成
      const log = generateDragLog(result, mockRectangleTable.id);
      expect(log).toContain('ドラッグ操作成功');
      expect(log).toContain(mockRectangleTable.id);
    });

    it('境界外ドラッグの完全フローが正しく動作する', () => {
      const start: Position = { x: 100, y: 100 };
      const end: Position = { x: 20, y: 20 }; // 境界外
      
      // 1. 意図的なドラッグかチェック
      const isIntentional = isIntentionalDrag(start, end);
      expect(isIntentional).toBe(true);
      
      // 2. ドラッグ操作を処理（失敗してロールバック）
      const result = processDragOperation(mockRectangleTable, start, end, mockBounds);
      expect(result.success).toBe(false);
      expect(result.finalPosition).toEqual(start);
      
      // 3. ログを生成
      const log = generateDragLog(result, mockRectangleTable.id);
      expect(log).toContain('ドラッグ操作失敗');
      expect(log).toContain('境界を超えています');
    });
  });
});