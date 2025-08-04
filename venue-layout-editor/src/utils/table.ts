/**
 * テーブル関連ユーティリティ
 */

import type { TableObject, TableType, RectangleProps, CircleProps, Position, TableStyle } from '../types';

/**
 * 一意のIDを生成
 * @returns 一意のID文字列
 */
export const generateTableId = (): string => {
  return `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * デフォルトのテーブルスタイルを取得
 * @returns デフォルトスタイル
 */
export const getDefaultTableStyle = (): TableStyle => ({
  fill: '#e3f2fd',
  stroke: '#1976d2',
  strokeWidth: 2,
  opacity: 0.8
});

/**
 * テーブルオブジェクトを作成
 * @param type テーブルタイプ
 * @param position 位置
 * @param properties テーブルプロパティ
 * @param style スタイル（オプション）
 * @returns テーブルオブジェクト
 */
export const createTableObject = (
  type: TableType,
  position: Position,
  properties: RectangleProps | CircleProps,
  style?: Partial<TableStyle>
): TableObject => {
  return {
    id: generateTableId(),
    type,
    position,
    properties,
    style: { ...getDefaultTableStyle(), ...style }
  };
};

/**
 * 長方形テーブルを作成
 * @param position 位置
 * @param width 幅（mm）
 * @param height 高さ（mm）
 * @param style スタイル（オプション）
 * @returns 長方形テーブルオブジェクト
 */
export const createRectangleTable = (
  position: Position,
  width: number,
  height: number,
  style?: Partial<TableStyle>
): TableObject => {
  return createTableObject('rectangle', position, { width, height }, style);
};

/**
 * 円形テーブルを作成
 * @param position 位置
 * @param radius 半径（mm）
 * @param style スタイル（オプション）
 * @returns 円形テーブルオブジェクト
 */
export const createCircleTable = (
  position: Position,
  radius: number,
  style?: Partial<TableStyle>
): TableObject => {
  return createTableObject('circle', position, { radius }, style);
};