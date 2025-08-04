/**
 * 境界制約フィードバック機能のテスト
 * 要件6.3, 6.4, 6.5に対応
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBoundaryConstraintFeedback,
  performSnapBack,
  createProximityWarning,
  createDragRestrictionFeedback,
  BoundaryFeedbackManager,
  type VisualFeedback
} from './boundaryFeedback';
import { DEFAULT_BOUNDARY_CONSTRAINTS } from './boundaryUtils';
import type { TableObject, BoundingBox, Position } from '../types';

// テスト用のSVG境界
const testSVGBounds: BoundingBox = {
  minX: 0,
  minY: 0,
  maxX: 800,
  maxY: 600
};

// テスト用の長方形テーブル
const testRectangleTable: TableObject = {
  id: 'test-rect',
  type: 'rectangle',
  position: { x: 100, y: 100 },
  properties: { width: 80, height: 60 },
  style: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 }
};

describe('境界制約フィードバック機能テスト', () => {
  describe('境界制約フィードバック作成 (createBoundaryConstraintFeedback)', () => {
    it('境界内位置での成功フィードバック', () => {
      const position: Position = { x: 400, y: 300 };
      const feedback = createBoundaryConstraintFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(feedback.type).toBe('constraint-applied');
      expect(feedback.severity).toBe('info');
      expect(feedback.message).toContain('正常に配置');
      expect(feedback.position).toEqual(position);
      expect(feedback.duration).toBe(2000);
    });

    it('境界外位置でのエラーフィードバック', () => {
      const position: Position = { x: 850, y: 300 }; // 右境界を超える
      const feedback = createBoundaryConstraintFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(feedback.type).toBe('boundary-error');
      expect(feedback.severity).toBe('error');
      expect(feedback.message).toContain('境界');
      expect(feedback.message).toContain('右');
      expect(feedback.violations).toBeDefined();
      expect(feedback.violations!.length).toBeGreaterThan(0);
      expect(feedback.duration).toBe(4000);
    });

    it('境界近接位置での警告フィードバック', () => {
      const tolerantConstraints = {
        ...DEFAULT_BOUNDARY_CONSTRAINTS,
        tolerance: 50,
        strictMode: false
      };
      
      const position: Position = { x: 770, y: 300 }; // 境界に近い
      const feedback = createBoundaryConstraintFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        tolerantConstraints
      );

      expect(feedback.type).toBe('boundary-warning');
      expect(feedback.severity).toBe('warning');
      expect(feedback.message).toContain('近すぎる');
      expect(feedback.duration).toBe(3000);
    });
  });

  describe('スナップバック機能 (performSnapBack)', () => {
    it('大幅な位置変更時のスナップバック', () => {
      const invalidPosition: Position = { x: 900, y: 300 }; // 大幅に境界外
      const originalPosition: Position = { x: 400, y: 300 };
      
      const result = performSnapBack(
        testRectangleTable,
        invalidPosition,
        originalPosition,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.shouldSnapBack).toBe(true);
      expect(result.snapBackPosition).toEqual(originalPosition);
      expect(result.reason).toContain('大幅に位置が変更');
      expect(result.feedback.type).toBe('snap-back');
      expect(result.feedback.severity).toBe('warning');
    });

    it('小さな移動での制約適用', () => {
      const invalidPosition: Position = { x: 810, y: 300 }; // 少し境界外
      const originalPosition: Position = { x: 400, y: 300 };
      
      const result = performSnapBack(
        testRectangleTable,
        invalidPosition,
        originalPosition,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.shouldSnapBack).toBe(false);
      expect(result.snapBackPosition.x).toBeLessThan(invalidPosition.x);
      expect(result.reason).toContain('境界制約により位置が調整');
      expect(result.feedback.severity).toBe('info');
    });

    it('意図的でない小さな移動でのスナップバック', () => {
      const invalidPosition: Position = { x: 405, y: 305 }; // 元位置から5px移動
      const originalPosition: Position = { x: 400, y: 300 };
      
      const result = performSnapBack(
        testRectangleTable,
        invalidPosition,
        originalPosition,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(result.shouldSnapBack).toBe(true);
      expect(result.snapBackPosition).toEqual(originalPosition);
      expect(result.reason).toContain('意図的でない移動');
    });
  });

  describe('境界近接警告 (createProximityWarning)', () => {
    it('境界から十分離れている場合は警告なし', () => {
      const position: Position = { x: 400, y: 300 };
      const warning = createProximityWarning(
        testRectangleTable,
        position,
        testSVGBounds,
        30
      );

      expect(warning).toBeNull();
    });

    it('境界に近い場合の警告生成', () => {
      const position: Position = { x: 60, y: 300 }; // 左境界に近い
      const warning = createProximityWarning(
        testRectangleTable,
        position,
        testSVGBounds,
        30
      );

      expect(warning).not.toBeNull();
      expect(warning!.type).toBe('boundary-warning');
      expect(warning!.severity).toBe('warning');
      expect(warning!.message).toContain('境界まで');
      expect(warning!.message).toContain('左');
      expect(warning!.duration).toBe(2000);
    });

    it('上境界近接時の警告', () => {
      const position: Position = { x: 400, y: 50 }; // 上境界に近い
      const warning = createProximityWarning(
        testRectangleTable,
        position,
        testSVGBounds,
        40
      );

      expect(warning).not.toBeNull();
      expect(warning!.message).toContain('上');
    });

    it('右境界近接時の警告', () => {
      const position: Position = { x: 750, y: 300 }; // 右境界に近い
      const warning = createProximityWarning(
        testRectangleTable,
        position,
        testSVGBounds,
        60
      );

      expect(warning).not.toBeNull();
      expect(warning!.message).toContain('右');
    });

    it('下境界近接時の警告', () => {
      const position: Position = { x: 400, y: 570 }; // 下境界に近い
      const warning = createProximityWarning(
        testRectangleTable,
        position,
        testSVGBounds,
        40
      );

      expect(warning).not.toBeNull();
      expect(warning!.message).toContain('下');
    });
  });

  describe('ドラッグ制限フィードバック (createDragRestrictionFeedback)', () => {
    it('X軸制限のフィードバック', () => {
      const position: Position = { x: 850, y: 300 };
      const restrictedAxes: ('x' | 'y')[] = ['x'];
      
      const feedback = createDragRestrictionFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        restrictedAxes,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(feedback.type).toBe('drag-restricted');
      expect(feedback.severity).toBe('warning');
      expect(feedback.message).toContain('右');
      expect(feedback.restrictedDirections).toContain('右');
      expect(feedback.duration).toBe(2000);
    });

    it('Y軸制限のフィードバック', () => {
      const position: Position = { x: 400, y: -50 };
      const restrictedAxes: ('x' | 'y')[] = ['y'];
      
      const feedback = createDragRestrictionFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        restrictedAxes,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(feedback.type).toBe('drag-restricted');
      expect(feedback.message).toContain('上');
      expect(feedback.restrictedDirections).toContain('上');
    });

    it('両軸制限のフィードバック', () => {
      const position: Position = { x: 850, y: 650 };
      const restrictedAxes: ('x' | 'y')[] = ['x', 'y'];
      
      const feedback = createDragRestrictionFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        restrictedAxes,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(feedback.restrictedDirections!.length).toBeGreaterThan(1);
      expect(feedback.message).toContain('・');
    });

    it('左上角での制限フィードバック', () => {
      const position: Position = { x: -50, y: -50 };
      const restrictedAxes: ('x' | 'y')[] = ['x', 'y'];
      
      const feedback = createDragRestrictionFeedback(
        testRectangleTable,
        position,
        testSVGBounds,
        restrictedAxes,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(feedback.restrictedDirections).toContain('左');
      expect(feedback.restrictedDirections).toContain('上');
    });
  });

  describe('境界フィードバックマネージャー (BoundaryFeedbackManager)', () => {
    let manager: BoundaryFeedbackManager;
    let receivedFeedbacks: VisualFeedback[];

    beforeEach(() => {
      manager = new BoundaryFeedbackManager();
      receivedFeedbacks = [];
      
      manager.registerFeedbackCallback((feedback) => {
        receivedFeedbacks.push(feedback);
      });
    });

    it('フィードバックの表示と管理', () => {
      const feedback: VisualFeedback = {
        type: 'boundary-warning',
        message: 'テスト警告',
        position: { x: 100, y: 100 },
        severity: 'warning',
        duration: 1000
      };

      manager.showFeedback('test-1', feedback);

      expect(receivedFeedbacks).toHaveLength(1);
      expect(receivedFeedbacks[0]).toEqual(feedback);
      expect(manager.getActiveFeedbacks()).toHaveLength(1);
    });

    it('複数フィードバックの管理', () => {
      const feedback1: VisualFeedback = {
        type: 'boundary-warning',
        message: '警告1',
        position: { x: 100, y: 100 },
        severity: 'warning',
        duration: 1000
      };

      const feedback2: VisualFeedback = {
        type: 'boundary-error',
        message: 'エラー1',
        position: { x: 200, y: 200 },
        severity: 'error',
        duration: 2000
      };

      manager.showFeedback('test-1', feedback1);
      manager.showFeedback('test-2', feedback2);

      expect(manager.getActiveFeedbacks()).toHaveLength(2);
      expect(receivedFeedbacks).toHaveLength(2);
    });

    it('フィードバックの個別非表示', () => {
      const feedback: VisualFeedback = {
        type: 'boundary-warning',
        message: 'テスト警告',
        position: { x: 100, y: 100 },
        severity: 'warning',
        duration: 1000
      };

      manager.showFeedback('test-1', feedback);
      expect(manager.getActiveFeedbacks()).toHaveLength(1);

      manager.hideFeedback('test-1');
      expect(manager.getActiveFeedbacks()).toHaveLength(0);
    });

    it('全フィードバックのクリア', () => {
      const feedback1: VisualFeedback = {
        type: 'boundary-warning',
        message: '警告1',
        position: { x: 100, y: 100 },
        severity: 'warning',
        duration: 1000
      };

      const feedback2: VisualFeedback = {
        type: 'boundary-error',
        message: 'エラー1',
        position: { x: 200, y: 200 },
        severity: 'error',
        duration: 2000
      };

      manager.showFeedback('test-1', feedback1);
      manager.showFeedback('test-2', feedback2);
      expect(manager.getActiveFeedbacks()).toHaveLength(2);

      manager.clearAllFeedbacks();
      expect(manager.getActiveFeedbacks()).toHaveLength(0);
    });

    it('複数コールバックの登録', () => {
      const receivedFeedbacks2: VisualFeedback[] = [];
      
      manager.registerFeedbackCallback((feedback) => {
        receivedFeedbacks2.push(feedback);
      });

      const feedback: VisualFeedback = {
        type: 'boundary-warning',
        message: 'テスト警告',
        position: { x: 100, y: 100 },
        severity: 'warning',
        duration: 1000
      };

      manager.showFeedback('test-1', feedback);

      expect(receivedFeedbacks).toHaveLength(1);
      expect(receivedFeedbacks2).toHaveLength(1);
    });
  });

  describe('フィードバック統合シナリオ', () => {
    it('境界違反から制約適用までの完全フロー', () => {
      // 1. 境界外位置での制約フィードバック
      const invalidPosition: Position = { x: 850, y: 300 };
      const constraintFeedback = createBoundaryConstraintFeedback(
        testRectangleTable,
        invalidPosition,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(constraintFeedback.type).toBe('boundary-error');
      expect(constraintFeedback.severity).toBe('error');

      // 2. スナップバック処理
      const originalPosition: Position = { x: 400, y: 300 };
      const snapBackResult = performSnapBack(
        testRectangleTable,
        invalidPosition,
        originalPosition,
        testSVGBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(snapBackResult.shouldSnapBack).toBe(true);
      expect(snapBackResult.feedback.type).toBe('snap-back');

      // 3. 最終的な近接警告チェック
      const proximityWarning = createProximityWarning(
        testRectangleTable,
        originalPosition,
        testSVGBounds,
        30
      );

      expect(proximityWarning).toBeNull(); // 元位置は境界から十分離れている
    });

    it('ドラッグ制限から近接警告への遷移', () => {
      // 1. 境界外でのドラッグ制限
      const dragPosition: Position = { x: 850, y: 300 };
      const dragFeedback = createDragRestrictionFeedback(
        testRectangleTable,
        dragPosition,
        testSVGBounds,
        ['x'],
        DEFAULT_BOUNDARY_CONSTRAINTS
      );

      expect(dragFeedback.type).toBe('drag-restricted');
      expect(dragFeedback.restrictedDirections).toContain('右');

      // 2. 制限後の位置での近接警告
      const constrainedPosition: Position = { x: 760, y: 300 }; // 境界内だが近い
      const proximityWarning = createProximityWarning(
        testRectangleTable,
        constrainedPosition,
        testSVGBounds,
        50
      );

      expect(proximityWarning).not.toBeNull();
      expect(proximityWarning!.type).toBe('boundary-warning');
    });
  });
});