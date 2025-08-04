/**
 * 境界制約フィードバック機能
 * 要件6.3, 6.4, 6.5に対応
 */

import type { 
  Position, 
  TableObject, 
  BoundingBox, 
  BoundaryViolation,
  BoundaryConstraints 
} from '../types';
import { 
  checkBoundaryConstraints,
  calculateTableBoundsAtPosition,
  constrainPositionToBounds,
  DEFAULT_BOUNDARY_CONSTRAINTS
} from './boundaryUtils';

/**
 * 視覚的フィードバックの種類
 */
export type VisualFeedbackType = 
  | 'boundary-warning'    // 境界近接警告
  | 'boundary-error'      // 境界違反エラー
  | 'snap-back'          // スナップバック
  | 'constraint-applied' // 制約適用
  | 'drag-restricted';   // ドラッグ制限

/**
 * 視覚的フィードバック情報
 */
export interface VisualFeedback {
  type: VisualFeedbackType;
  message: string;
  position: Position;
  severity: 'info' | 'warning' | 'error';
  duration: number; // 表示時間（ミリ秒）
  violations?: BoundaryViolation[];
  suggestedPosition?: Position;
  restrictedDirections?: string[];
}

/**
 * スナップバック操作の結果
 */
export interface SnapBackResult {
  shouldSnapBack: boolean;
  snapBackPosition: Position;
  reason: string;
  feedback: VisualFeedback;
}

/**
 * 境界制約時の視覚的フィードバック機能
 * @param table テーブルオブジェクト
 * @param attemptedPosition 試行された位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns 視覚的フィードバック情報
 */
export const createBoundaryConstraintFeedback = (
  table: TableObject,
  attemptedPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): VisualFeedback => {
  const tableBounds = calculateTableBoundsAtPosition(table, attemptedPosition);
  const checkResult = checkBoundaryConstraints(tableBounds, svgBounds, constraints);

  if (checkResult.isValid) {
    return {
      type: 'constraint-applied',
      message: 'テーブルが正常に配置されました',
      position: attemptedPosition,
      severity: 'info',
      duration: 2000
    };
  }

  // 違反の詳細を分析
  const errorViolations = checkResult.violations.filter(v => v.severity === 'error');
  const warningViolations = checkResult.violations.filter(v => v.severity === 'warning');

  if (errorViolations.length > 0) {
    const sides = errorViolations.map(v => {
      switch (v.side) {
        case 'top': return '上';
        case 'right': return '右';
        case 'bottom': return '下';
        case 'left': return '左';
        default: return v.side;
      }
    }).join('、');

    return {
      type: 'boundary-error',
      message: `テーブルが境界の${sides}側を超えています`,
      position: attemptedPosition,
      severity: 'error',
      duration: 4000,
      violations: errorViolations
    };
  }

  if (warningViolations.length > 0) {
    return {
      type: 'boundary-warning',
      message: '境界に近すぎる位置です',
      position: attemptedPosition,
      severity: 'warning',
      duration: 3000,
      violations: warningViolations
    };
  }

  return {
    type: 'constraint-applied',
    message: 'テーブルが配置されました',
    position: attemptedPosition,
    severity: 'info',
    duration: 2000
  };
};

/**
 * 無効位置でのスナップバック機能
 * @param table テーブルオブジェクト
 * @param invalidPosition 無効な位置
 * @param originalPosition 元の位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns スナップバック結果
 */
export const performSnapBack = (
  table: TableObject,
  invalidPosition: Position,
  originalPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): SnapBackResult => {
  // 制約された位置を計算
  const constrainedPosition = constrainPositionToBounds(
    table,
    invalidPosition,
    svgBounds,
    constraints
  );

  // 制約された位置と元の位置の距離を計算
  const constrainedDistance = Math.sqrt(
    Math.pow(constrainedPosition.x - originalPosition.x, 2) +
    Math.pow(constrainedPosition.y - originalPosition.y, 2)
  );

  // 無効位置と元の位置の距離を計算
  const invalidDistance = Math.sqrt(
    Math.pow(invalidPosition.x - originalPosition.x, 2) +
    Math.pow(invalidPosition.y - originalPosition.y, 2)
  );

  // スナップバック判定のしきい値
  const SNAP_BACK_THRESHOLD = 100; // 100px以上移動する場合はスナップバック

  let shouldSnapBack = false;
  let snapBackPosition = constrainedPosition;
  let reason = '';

  if (constrainedDistance > SNAP_BACK_THRESHOLD) {
    // 制約により大幅に位置が変更される場合は元の位置に戻す
    shouldSnapBack = true;
    snapBackPosition = originalPosition;
    reason = '境界制約により大幅に位置が変更されるため、元の位置に戻しました';
  } else if (invalidDistance < 10) {
    // 意図的でない小さな移動の場合は元の位置に戻す
    shouldSnapBack = true;
    snapBackPosition = originalPosition;
    reason = '意図的でない移動のため、元の位置に戻しました';
  } else {
    // 制約された位置を使用
    reason = '境界制約により位置が調整されました';
  }

  const feedback: VisualFeedback = {
    type: 'snap-back',
    message: reason,
    position: shouldSnapBack ? originalPosition : constrainedPosition,
    severity: shouldSnapBack ? 'warning' : 'info',
    duration: shouldSnapBack ? 3000 : 2000,
    suggestedPosition: constrainedPosition
  };

  return {
    shouldSnapBack,
    snapBackPosition,
    reason,
    feedback
  };
};

/**
 * 境界近接時の警告表示システム
 * @param table テーブルオブジェクト
 * @param position 現在位置
 * @param svgBounds SVG境界
 * @param warningDistance 警告距離（px）
 * @returns 警告フィードバック情報（警告が必要な場合のみ）
 */
export const createProximityWarning = (
  table: TableObject,
  position: Position,
  svgBounds: BoundingBox,
  warningDistance: number = 30
): VisualFeedback | null => {
  const tableBounds = calculateTableBoundsAtPosition(table, position);

  const distances = {
    top: tableBounds.minY - svgBounds.minY,
    right: svgBounds.maxX - tableBounds.maxX,
    bottom: svgBounds.maxY - tableBounds.maxY,
    left: tableBounds.minX - svgBounds.minX
  };

  const minDistance = Math.min(...Object.values(distances));
  
  if (minDistance <= warningDistance && minDistance >= 0) {
    const nearestSide = Object.keys(distances).find(
      side => distances[side as keyof typeof distances] === minDistance
    );

    const sideText = {
      'top': '上',
      'right': '右',
      'bottom': '下',
      'left': '左'
    }[nearestSide as string] || nearestSide;

    return {
      type: 'boundary-warning',
      message: `境界まで${Math.round(minDistance)}px (${sideText}側)`,
      position,
      severity: 'warning',
      duration: 2000
    };
  }

  return null;
};

/**
 * ドラッグ制限時の視覚的フィードバック
 * @param table テーブルオブジェクト
 * @param dragPosition ドラッグ位置
 * @param svgBounds SVG境界
 * @param restrictedAxes 制限された軸
 * @param constraints 境界制約設定
 * @returns ドラッグ制限フィードバック
 */
export const createDragRestrictionFeedback = (
  table: TableObject,
  dragPosition: Position,
  svgBounds: BoundingBox,
  restrictedAxes: ('x' | 'y')[],
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): VisualFeedback => {
  const restrictedDirections: string[] = [];
  
  if (restrictedAxes.includes('x')) {
    // X軸の制限方向を判定
    const tableHalfWidth = table.type === 'rectangle' 
      ? (table.properties as any).width / 2 
      : (table.properties as any).radius;
    
    if (dragPosition.x <= svgBounds.minX + tableHalfWidth) {
      restrictedDirections.push('左');
    }
    if (dragPosition.x >= svgBounds.maxX - tableHalfWidth) {
      restrictedDirections.push('右');
    }
  }
  
  if (restrictedAxes.includes('y')) {
    // Y軸の制限方向を判定
    const tableHalfHeight = table.type === 'rectangle' 
      ? (table.properties as any).height / 2 
      : (table.properties as any).radius;
    
    if (dragPosition.y <= svgBounds.minY + tableHalfHeight) {
      restrictedDirections.push('上');
    }
    if (dragPosition.y >= svgBounds.maxY - tableHalfHeight) {
      restrictedDirections.push('下');
    }
  }

  const message = restrictedDirections.length > 0
    ? `${restrictedDirections.join('・')}方向への移動が制限されています`
    : 'ドラッグが制限されています';

  return {
    type: 'drag-restricted',
    message,
    position: dragPosition,
    severity: 'warning',
    duration: 2000,
    restrictedDirections
  };
};

/**
 * 境界制約フィードバックの統合管理
 */
export class BoundaryFeedbackManager {
  private activeFeedbacks: Map<string, VisualFeedback> = new Map();
  private feedbackCallbacks: ((feedback: VisualFeedback) => void)[] = [];

  /**
   * フィードバックコールバックを登録
   * @param callback フィードバック表示コールバック
   */
  public registerFeedbackCallback(callback: (feedback: VisualFeedback) => void): void {
    this.feedbackCallbacks.push(callback);
  }

  /**
   * フィードバックを表示
   * @param id フィードバックID
   * @param feedback フィードバック情報
   */
  public showFeedback(id: string, feedback: VisualFeedback): void {
    this.activeFeedbacks.set(id, feedback);
    
    // 登録されたコールバックを呼び出し
    this.feedbackCallbacks.forEach(callback => callback(feedback));

    // 自動非表示タイマーを設定
    setTimeout(() => {
      this.hideFeedback(id);
    }, feedback.duration);
  }

  /**
   * フィードバックを非表示
   * @param id フィードバックID
   */
  public hideFeedback(id: string): void {
    this.activeFeedbacks.delete(id);
  }

  /**
   * 全てのフィードバックをクリア
   */
  public clearAllFeedbacks(): void {
    this.activeFeedbacks.clear();
  }

  /**
   * アクティブなフィードバック一覧を取得
   * @returns アクティブなフィードバック
   */
  public getActiveFeedbacks(): VisualFeedback[] {
    return Array.from(this.activeFeedbacks.values());
  }
}

// グローバルフィードバックマネージャーのインスタンス
export const boundaryFeedbackManager = new BoundaryFeedbackManager();