/**
 * テーブルオブジェクト関連の型定義
 */

export interface Position {
  x: number;  // ピクセル単位
  y: number;  // ピクセル単位
}

export interface RectangleProps {
  width: number;   // mm単位
  height: number;  // mm単位
}

export interface CircleProps {
  radius: number;  // mm単位
}

export interface TableStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface TableObject {
  id: string;
  type: 'rectangle' | 'circle';
  position: Position;
  properties: RectangleProps | CircleProps;
  style: TableStyle;
}

export type TableType = 'rectangle' | 'circle';
export type TableProps = RectangleProps | CircleProps;