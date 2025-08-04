import { describe, it, expect } from 'vitest';
import {
  enforceRealTimeBoundaryLimits,
  preventOutOfBoundsPlacement,
  checkDragBoundaries,
  DEFAULT_BOUNDARY_CONSTRAINTS
} from './boundaryUtils';
import type { TableObject, BoundingBox } from '../types';

// テスト用のモックデータ
const mockSvgBounds: BoundingBox = {
  minX: 0,
  minY: 0,
  maxX: 800,
  maxY: 600
};

const mockRectangleTable: TableObject = {
  id: 'test-rect',
  type: 'rectangle',
  position: { x: 400, y: 300 },
  properties: { width: 100, height: 60 },
  style: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 }
};

const mockCircleTable: TableObject = {
  id: 'test-circle',
  type: 'circle',
  position: { x: 400, y: 300 },
  properties: { radius: 50 },
  style: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 }
};

describe('境界制約機能のテスト', () => {
  describe('enforceRealTimeBoundaryLimits', () => {
    it('境界内の位置では制限を適用しない', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: 400, y: 300 },
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(false);
      expect(result.limitedPosition).toEqual({ x: 400, y: 300 });
      expect(result.limitedAxes).toHaveLength(0);
    });

    it('左境界を超える場合にX軸を制限する', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: -10, y: 300 }, // 左境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(true);
      expect(result.limitedPosition.x).toBe(50); // width/2 = 50
      expect(result.limitedPosition.y).toBe(300);
      expect(result.limitedAxes).toContain('x');
    });

    it('上境界を超える場合にY軸を制限する', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: 400, y: -10 }, // 上境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(true);
      expect(result.limitedPosition.x).toBe(400);
      expect(result.limitedPosition.y).toBe(30); // height/2 = 30
      expect(result.limitedAxes).toContain('y');
    });

    it('右境界を超える場合にX軸を制限する', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: 850, y: 300 }, // 右境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(true);
      expect(result.limitedPosition.x).toBe(750); // maxX - width/2 = 800 - 50
      expect(result.limitedPosition.y).toBe(300);
      expect(result.limitedAxes).toContain('x');
    });

    it('下境界を超える場合にY軸を制限する', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: 400, y: 650 }, // 下境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(true);
      expect(result.limitedPosition.x).toBe(400);
      expect(result.limitedPosition.y).toBe(570); // maxY - height/2 = 600 - 30
      expect(result.limitedAxes).toContain('y');
    });

    it('円形テーブルの境界制限が正しく動作する', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockCircleTable,
        { x: -10, y: 300 }, // 左境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(true);
      expect(result.limitedPosition.x).toBe(50); // radius = 50
      expect(result.limitedPosition.y).toBe(300);
      expect(result.limitedAxes).toContain('x');
    });

    it('複数の境界を同時に超える場合に両軸を制限する', () => {
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: -10, y: -10 }, // 左上境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.wasLimited).toBe(true);
      expect(result.limitedPosition.x).toBe(50);
      expect(result.limitedPosition.y).toBe(30);
      expect(result.limitedAxes).toContain('x');
      expect(result.limitedAxes).toContain('y');
    });

    it('境界制約が無効な場合は制限を適用しない', () => {
      const disabledConstraints = { ...DEFAULT_BOUNDARY_CONSTRAINTS, enabled: false };
      const result = enforceRealTimeBoundaryLimits(
        mockRectangleTable,
        { x: -100, y: -100 }, // 大幅に境界を超える位置
        mockSvgBounds,
        disabledConstraints
      );

      expect(result.wasLimited).toBe(false);
      expect(result.limitedPosition).toEqual({ x: -100, y: -100 });
      expect(result.limitedAxes).toHaveLength(0);
    });
  });

  describe('preventOutOfBoundsPlacement', () => {
    it('境界内の配置を許可する', () => {
      const result = preventOutOfBoundsPlacement(
        mockRectangleTable,
        { x: 400, y: 300 },
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('境界外の配置を防止する', () => {
      const result = preventOutOfBoundsPlacement(
        mockRectangleTable,
        { x: 10, y: 10 }, // 左上境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.suggestedPosition).toBeDefined();
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('境界ギリギリの配置を許可する', () => {
      const result = preventOutOfBoundsPlacement(
        mockRectangleTable,
        { x: 50, y: 30 }, // 境界ギリギリの位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('提案位置が正しく計算される', () => {
      const result = preventOutOfBoundsPlacement(
        mockRectangleTable,
        { x: -50, y: -50 }, // 大幅に境界を超える位置
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.isAllowed).toBe(false);
      expect(result.suggestedPosition).toBeDefined();
      expect(result.suggestedPosition!.x).toBe(50);
      expect(result.suggestedPosition!.y).toBe(30);
    });

    it('境界制約が無効な場合は全ての配置を許可する', () => {
      const disabledConstraints = { ...DEFAULT_BOUNDARY_CONSTRAINTS, enabled: false };
      const result = preventOutOfBoundsPlacement(
        mockRectangleTable,
        { x: -100, y: -100 }, // 大幅に境界を超える位置
        mockSvgBounds,
        disabledConstraints
      );

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('checkDragBoundaries', () => {
    it('境界内のドラッグでは制約を適用しない', () => {
      const result = checkDragBoundaries(
        mockRectangleTable,
        { x: 400, y: 300 },
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.checkResult.isValid).toBe(true);
      expect(result.constrainedPosition).toEqual({ x: 400, y: 300 });
    });

    it('境界外のドラッグで制約を適用する', () => {
      const result = checkDragBoundaries(
        mockRectangleTable,
        { x: -10, y: 300 },
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.checkResult.isValid).toBe(false);
      expect(result.constrainedPosition.x).toBe(50);
      expect(result.constrainedPosition.y).toBe(300);
    });

    it('境界違反の詳細情報が正しく返される', () => {
      const result = checkDragBoundaries(
        mockRectangleTable,
        { x: -10, y: -10 },
        mockSvgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.checkResult.isValid).toBe(false);
      expect(result.checkResult.violations.length).toBeGreaterThan(0);
      expect(result.checkResult.violations.some(v => v.side === 'left')).toBe(true);
      expect(result.checkResult.violations.some(v => v.side === 'top')).toBe(true);
    });
  });
});