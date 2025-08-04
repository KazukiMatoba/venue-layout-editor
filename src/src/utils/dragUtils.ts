import type { Position, TableObject } from '../types';

/**
 * ドラッグ操作に関するユーティリティ関数
 * 要件4.3, 4.4対応
 */

/**
 * ドラッグ操作の結果を表すインターフェース
 */
export interface DragResult {
  success: boolean;
  finalPosition: Position;
  originalPosition: Position;
  reason?: string;
  distance?: number;
}

/**
 * ドラッグ距離を計算する
 * @param startPosition 開始位置
 * @param endPosition 終了位置
 * @returns ドラッグ距離（ピクセル）
 */
export const calculateDragDistance = (
  startPosition: Position,
  endPosition: Position
): number => {
  const deltaX = endPosition.x - startPosition.x;
  const deltaY = endPosition.y - startPosition.y;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
};

/**
 * ドラッグ操作が有効かどうかを判定する
 * @param table テーブルオブジェクト
 * @param newPosition 新しい位置
 * @param bounds 境界情報
 * @returns 有効性の判定結果
 */
export const validateDragOperation = (
  table: TableObject,
  newPosition: Position,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): { isValid: boolean; reason?: string } => {
  // テーブルサイズを考慮した境界チェック
  const tableHalfWidth = table.type === 'rectangle' 
    ? (table.properties as any).width / 2 
    : (table.properties as any).radius;
  const tableHalfHeight = table.type === 'rectangle' 
    ? (table.properties as any).height / 2 
    : (table.properties as any).radius;

  // 境界チェック
  if (newPosition.x - tableHalfWidth < bounds.minX) {
    return { isValid: false, reason: 'テーブルが左境界を超えています' };
  }
  if (newPosition.x + tableHalfWidth > bounds.maxX) {
    return { isValid: false, reason: 'テーブルが右境界を超えています' };
  }
  if (newPosition.y - tableHalfHeight < bounds.minY) {
    return { isValid: false, reason: 'テーブルが上境界を超えています' };
  }
  if (newPosition.y + tableHalfHeight > bounds.maxY) {
    return { isValid: false, reason: 'テーブルが下境界を超えています' };
  }

  return { isValid: true };
};

/**
 * ドラッグ操作を処理し、結果を返す
 * @param table テーブルオブジェクト
 * @param startPosition 開始位置
 * @param endPosition 終了位置
 * @param bounds 境界情報
 * @returns ドラッグ操作の結果
 */
export const processDragOperation = (
  table: TableObject,
  startPosition: Position,
  endPosition: Position,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): DragResult => {
  const distance = calculateDragDistance(startPosition, endPosition);
  const validation = validateDragOperation(table, endPosition, bounds);

  if (validation.isValid) {
    // ドラッグ操作のコミット処理（要件4.3対応）
    return {
      success: true,
      finalPosition: endPosition,
      originalPosition: startPosition,
      distance,
    };
  } else {
    // ドラッグ操作のロールバック処理（要件4.4対応）
    return {
      success: false,
      finalPosition: startPosition, // 元の位置に戻す
      originalPosition: startPosition,
      reason: validation.reason,
      distance,
    };
  }
};

/**
 * 最小ドラッグ距離の閾値（ピクセル）
 * この距離以下の場合は移動とみなさない
 */
export const MIN_DRAG_DISTANCE = 3;

/**
 * ドラッグ操作が意図的な移動かどうかを判定する
 * @param startPosition 開始位置
 * @param endPosition 終了位置
 * @returns 意図的な移動かどうか
 */
export const isIntentionalDrag = (
  startPosition: Position,
  endPosition: Position
): boolean => {
  const distance = calculateDragDistance(startPosition, endPosition);
  return distance >= MIN_DRAG_DISTANCE;
};

/**
 * ドラッグ操作のログ情報を生成する
 * @param result ドラッグ操作の結果
 * @param tableId テーブルID
 * @returns ログ情報
 */
export const generateDragLog = (
  result: DragResult,
  tableId: string
): string => {
  const status = result.success ? '成功' : '失敗';
  const distance = result.distance ? `${result.distance.toFixed(1)}px` : '不明';
  const reason = result.reason ? ` (${result.reason})` : '';
  
  return `ドラッグ操作${status}: ${tableId}, 距離: ${distance}${reason}`;
};

/**
 * 位置を0.1mm精度に丸める（要件5.1対応）
 * @param position 位置
 * @returns 丸められた位置
 */
export const roundPositionToPrecision = (position: Position): Position => {
  return {
    x: Math.round(position.x * 10) / 10,
    y: Math.round(position.y * 10) / 10,
  };
};