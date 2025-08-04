import {
  calculateTableBounds,
  calculateTableBoundsAtPosition,
  checkBoundaryConstraints,
  constrainPositionToBounds,
  checkDragBoundaries,
  checkBoundaryProximity,
  DEFAULT_BOUNDARY_CONSTRAINTS
} from './boundaryUtils';
import type { TableObject, BoundingBox, Position } from '../types';

// テスト用のモックデータ
const mockSVGBounds: BoundingBox = {
  minX: 0,
  minY: 0,
  maxX: 800,
  maxY: 600
};

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

describe('境界チェックシステム', () => {
  describe('calculateTableBounds', () => {
    test('長方形テーブルの境界を正しく計算する', () => {
      const bounds = calculateTableBounds(mockRectangleTable);
      
      expect(bounds).toEqual({
        minX: 60,  // 100 - 80/2
        minY: 70,  // 100 - 60/2
        maxX: 140, // 100 + 80/2
        maxY: 130, // 100 + 60/2
        centerX: 100,
        centerY: 100
      });
    });

    test('円形テーブルの境界を正しく計算する', () => {
      const bounds = calculateTableBounds(mockCircleTable);
      
      expect(bounds).toEqual({
        minX: 60,  // 100 - 40
        minY: 60,  // 100 - 40
        maxX: 140, // 100 + 40
        maxY: 140, // 100 + 40
        centerX: 100,
        centerY: 100
      });
    });
  });

  describe('calculateTableBoundsAtPosition', () => {
    test('指定位置での長方形テーブル境界を計算する', () => {
      const newPosition: Position = { x: 200, y: 150 };
      const bounds = calculateTableBoundsAtPosition(mockRectangleTable, newPosition);
      
      expect(bounds).toEqual({
        minX: 160, // 200 - 80/2
        minY: 120, // 150 - 60/2
        maxX: 240, // 200 + 80/2
        maxY: 180, // 150 + 60/2
        centerX: 200,
        centerY: 150
      });
    });
  });

  describe('checkBoundaryConstraints', () => {
    test('境界内のテーブルは有効と判定される', () => {
      const tableBounds = calculateTableBounds(mockRectangleTable);
      const result = checkBoundaryConstraints(tableBounds, mockSVGBounds);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('境界外のテーブルは無効と判定される', () => {
      const outOfBoundsTable: TableObject = {
        ...mockRectangleTable,
        position: { x: 30, y: 30 } // 左上境界を超える
      };
      
      const tableBounds = calculateTableBounds(outOfBoundsTable);
      const result = checkBoundaryConstraints(tableBounds, mockSVGBounds);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.side === 'left')).toBe(true);
      expect(result.violations.some(v => v.side === 'top')).toBe(true);
    });

    test('部分的に境界外のテーブルは警告として検出される', () => {
      const partiallyOutTable: TableObject = {
        ...mockRectangleTable,
        position: { x: 42, y: 32 } // わずかに境界外
      };
      
      const tableBounds = calculateTableBounds(partiallyOutTable);
      const result = checkBoundaryConstraints(tableBounds, mockSVGBounds);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.severity === 'warning')).toBe(true);
    });

    test('制約が無効な場合は常に有効と判定される', () => {
      const disabledConstraints = { ...DEFAULT_BOUNDARY_CONSTRAINTS, enabled: false };
      const outOfBoundsTable: TableObject = {
        ...mockRectangleTable,
        position: { x: -100, y: -100 }
      };
      
      const tableBounds = calculateTableBounds(outOfBoundsTable);
      const result = checkBoundaryConstraints(tableBounds, mockSVGBounds, disabledConstraints);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('constrainPositionToBounds', () => {
    test('境界内の位置はそのまま返される', () => {
      const validPosition: Position = { x: 100, y: 100 };
      const constrainedPosition = constrainPositionToBounds(
        mockRectangleTable,
        validPosition,
        mockSVGBounds
      );
      
      expect(constrainedPosition).toEqual(validPosition);
    });

    test('境界外の位置は境界内に制約される', () => {
      const invalidPosition: Position = { x: 30, y: 20 }; // 左上境界外
      const constrainedPosition = constrainPositionToBounds(
        mockRectangleTable,
        invalidPosition,
        mockSVGBounds
      );
      
      expect(constrainedPosition.x).toBeGreaterThanOrEqual(40); // width/2
      expect(constrainedPosition.y).toBeGreaterThanOrEqual(30); // height/2
    });

    test('右下境界外の位置も正しく制約される', () => {
      const invalidPosition: Position = { x: 780, y: 580 }; // 右下境界外
      const constrainedPosition = constrainPositionToBounds(
        mockRectangleTable,
        invalidPosition,
        mockSVGBounds
      );
      
      expect(constrainedPosition.x).toBeLessThanOrEqual(760); // maxX - width/2
      expect(constrainedPosition.y).toBeLessThanOrEqual(570); // maxY - height/2
    });

    test('円形テーブルの制約も正しく動作する', () => {
      const invalidPosition: Position = { x: 20, y: 20 }; // 境界外
      const constrainedPosition = constrainPositionToBounds(
        mockCircleTable,
        invalidPosition,
        mockSVGBounds
      );
      
      expect(constrainedPosition.x).toBeGreaterThanOrEqual(40); // radius
      expect(constrainedPosition.y).toBeGreaterThanOrEqual(40); // radius
    });
  });

  describe('checkDragBoundaries', () => {
    test('ドラッグ中の境界チェックが正しく動作する', () => {
      const dragPosition: Position = { x: 50, y: 50 };
      const result = checkDragBoundaries(
        mockRectangleTable,
        dragPosition,
        mockSVGBounds
      );
      
      expect(result.checkResult).toBeDefined();
      expect(result.constrainedPosition).toBeDefined();
      expect(result.checkResult.isValid).toBe(true);
      expect(result.constrainedPosition).toEqual(dragPosition);
    });

    test('境界外ドラッグ時は制約された位置が返される', () => {
      const invalidDragPosition: Position = { x: 10, y: 10 };
      const result = checkDragBoundaries(
        mockRectangleTable,
        invalidDragPosition,
        mockSVGBounds
      );
      
      expect(result.checkResult.isValid).toBe(false);
      expect(result.constrainedPosition.x).toBeGreaterThan(invalidDragPosition.x);
      expect(result.constrainedPosition.y).toBeGreaterThan(invalidDragPosition.y);
    });
  });

  describe('checkBoundaryProximity', () => {
    test('境界から離れた位置では近接フラグがfalse', () => {
      const farPosition: Position = { x: 400, y: 300 };
      const result = checkBoundaryProximity(
        mockRectangleTable,
        farPosition,
        mockSVGBounds,
        20
      );
      
      expect(result.isNearBoundary).toBe(false);
    });

    test('境界に近い位置では近接フラグがtrue', () => {
      const nearPosition: Position = { x: 50, y: 100 }; // 左境界に近い
      const result = checkBoundaryProximity(
        mockRectangleTable,
        nearPosition,
        mockSVGBounds,
        20
      );
      
      expect(result.isNearBoundary).toBe(true);
      expect(result.nearestSide).toBe('left');
      expect(result.distance).toBeLessThanOrEqual(20);
    });

    test('境界外の位置では近接フラグがfalse', () => {
      const outsidePosition: Position = { x: 20, y: 20 };
      const result = checkBoundaryProximity(
        mockRectangleTable,
        outsidePosition,
        mockSVGBounds,
        20
      );
      
      expect(result.isNearBoundary).toBe(false);
    });
  });

  describe('境界制約設定', () => {
    test('厳密モードでは部分的な境界外も無効とする', () => {
      const strictConstraints = { ...DEFAULT_BOUNDARY_CONSTRAINTS, strictMode: true };
      const partiallyOutTable: TableObject = {
        ...mockRectangleTable,
        position: { x: 42, y: 32 }
      };
      
      const tableBounds = calculateTableBounds(partiallyOutTable);
      const result = checkBoundaryConstraints(tableBounds, mockSVGBounds, strictConstraints);
      
      expect(result.isValid).toBe(false);
    });

    test('非厳密モードではエラーレベルの違反のみ無効とする', () => {
      const lenientConstraints = { ...DEFAULT_BOUNDARY_CONSTRAINTS, strictMode: false };
      const slightlyOutTable: TableObject = {
        ...mockRectangleTable,
        position: { x: 42, y: 32 } // わずかに境界外（警告レベル）
      };
      
      const tableBounds = calculateTableBounds(slightlyOutTable);
      const result = checkBoundaryConstraints(tableBounds, mockSVGBounds, lenientConstraints);
      
      // 警告レベルの違反のみの場合は有効とする
      const hasOnlyWarnings = result.violations.every(v => v.severity === 'warning');
      expect(result.isValid).toBe(hasOnlyWarnings);
    });
  });
});