/**
 * 会場レイアウト関連の型定義
 */

import type { SVGData } from './svg';
import type { TableObject, Position } from './table';

export interface DragState {
  tableId: string;
  startPosition: Position;
  currentPosition: Position;
  isValid: boolean;  // 境界内かどうか
}

export interface VenueState {
  svgData: SVGData | null;
  tables: TableObject[];
  selectedTableId: string | null;
  dragState: DragState | null;
  scale: number;  // ズームレベル
  offset: Position;  // パン位置
}

export interface VenueData {
  svgData: SVGData;
  tables: TableObject[];
}