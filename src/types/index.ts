// SVGデータの型定義
export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SVGData {
  content: string;           // SVG文字列
  width: number;            // SVG幅（px）
  height: number;           // SVG高さ（px）
  viewBox: ViewBox;         // SVGビューボックス
  bounds: BoundingBox;      // 境界情報
  fileName: string;
}

// 位置情報の型定義
export interface Position {
  x: number;  // ピクセル単位
  y: number;  // ピクセル単位
}

// テーブルオブジェクトの型定義
export interface RectangleProps {
  width: number;   // mm単位
  height: number;  // mm単位
  fillColor: string; // 塗潰色
  strokeColor: string; // 枠線色
  rotationAngle: number; //回転角度
}

export interface CircleProps {
  radius: number;  // mm単位
  fillColor: string; // 塗潰色
  strokeColor: string; // 枠線色
}

export interface SVGTableProps {
  svgContent: string;
  width: number;   // mm単位
  height: number;  // mm単位
  originalWidth: number;  // SVGの元サイズ
  originalHeight: number; // SVGの元サイズ
  filename: string;
  rotationAngle: number; //回転角度
}

export interface TextBoxProps {
  text: string;
  fontSize: number;  // px単位
  fontFamily: string;
  width: number;     // mm単位（自動調整）
  height: number;    // mm単位（自動調整）
  textColor: string;
  rotationAngle: number; //回転角度
}

export interface ScaleProps {
  firstTableId: string;
  secondTableId: string;
}

export interface TableStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface TableObject {
  id: string;
  type: 'rectangle' | 'circle' | 'svg' | 'textbox' | 'scale';
  position: Position;
  properties: RectangleProps | CircleProps | SVGTableProps | TextBoxProps | ScaleProps;
}

// エラー情報の型定義
export interface SVGLoadError {
  type: 'file' | 'parse' | 'validation' | 'size';
  message: string;
  details?: string;
}

// ドラッグ状態の型定義（要件4.1, 4.2対応）
export interface DragState {
  tableId: string;
  startPosition: Position;
  currentPosition: Position;
  isValid: boolean;
  isDragging: boolean;
  startTime: number;
  lastUpdateTime: number;
  dragDistance: number;
  isIntentional: boolean;
}

// ドラッグフィードバックの型定義
export interface DragFeedback {
  type: 'valid' | 'invalid' | 'boundary';
  message: string;
  position: Position;
  visible: boolean;
}

// テーブル状態管理の型定義（要件3.3対応）
export interface TableState {
  isHovered: boolean;
  isSelected: boolean;
  isDragging: boolean;
  lastInteraction: number;
  renderPriority: number;
  dragState?: DragState;
}

// SVG処理結果の型定義
export interface SVGProcessingResult {
  success: boolean;
  data?: SVGData;
  error?: SVGLoadError;
  warnings?: string[];
}

// 境界チェック関連の型定義（要件6.1, 6.2対応）
export interface BoundaryCheckResult {
  isValid: boolean;
  violations: BoundaryViolation[];
  constrainedPosition?: Position;
  message?: string;
}

export interface BoundaryViolation {
  type: 'outside' | 'partial' | 'edge';
  side: 'top' | 'right' | 'bottom' | 'left';
  distance: number;
  severity: 'warning' | 'error';
}

export interface TableBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

// 境界制約設定の型定義
export interface BoundaryConstraints {
  enabled: boolean;
  strictMode: boolean;  // 厳密モード（完全に境界内）
  tolerance: number;    // 許容範囲（px）
  snapDistance: number; // スナップ距離（px）
}

// 会場データの型定義
export interface VenueData {
  svgData: SVGData | null;
  tables: TableObject[];
  boundaryArea?: BoundaryArea;
}

// 境界エリアの型定義
export interface BoundaryArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// テーブルタイプとプロパティの型定義
export type TableType = 'rectangle' | 'circle' | 'svg' | 'textbox';
export type TableProps = RectangleProps | CircleProps | SVGTableProps | TextBoxProps;
export type DistanceType = 'horizontal' | 'vertical' | 'shortest';

// プロジェクトデータの型定義
export interface ProjectInfo {
  name: string;
  createdAt: string;
  lastModified: string;
  version: string;
}

export interface ProjectData {
  projectInfo: ProjectInfo;
  venue: {
    backgroundImage?: string;
    svgData?: SVGData;
    dimensions: {
      width: number;
      height: number;
    };
  };
  tables: TableObject[];
}

// 保存・読み込み関連の型定義
export interface LoadResult {
  success: boolean;
  data?: ProjectData;
  error?: string;
  warnings?: string[];
}

// 外接図形の四隅の座標を表す型定義
export interface CircumscriptionCorners {
  topLeft: Position;
  topRight: Position;
  bottomLeft: Position;
  bottomRight: Position;
}

// 外接図形のサイズと四隅の座標を取得する関数
export function circumscriptionSizeFull(tableObj: TableObject): {
  width: number;
  height: number;
  corners: CircumscriptionCorners;
} {
  const centerX = tableObj.position.x;
  const centerY = tableObj.position.y;

  if (tableObj.type === "circle") {
    const props = tableObj.properties as CircleProps;
    const diameter = props.radius * 2;

    return {
      width: diameter,
      height: diameter,
      corners: {
        topLeft: { x: centerX - props.radius, y: centerY - props.radius },
        topRight: { x: centerX + props.radius, y: centerY - props.radius },
        bottomLeft: { x: centerX - props.radius, y: centerY + props.radius },
        bottomRight: { x: centerX + props.radius, y: centerY + props.radius },
      }
    };
  } else {
    const props = tableObj.properties as RectangleProps | SVGTableProps | TextBoxProps;
    const theta = props.rotationAngle * Math.PI / 180;

    // 外接矩形のサイズ計算
    const circumscriptionWidth = Math.abs(props.width * Math.cos(theta)) + Math.abs(props.height * Math.sin(theta));
    const circumscriptionHeight = Math.abs(props.width * Math.sin(theta)) + Math.abs(props.height * Math.cos(theta));

    // 外接矩形の四隅の座標（中心を基準とした相対座標から絶対座標に変換）
    const halfWidth = circumscriptionWidth / 2;
    const halfHeight = circumscriptionHeight / 2;

    return {
      width: circumscriptionWidth,
      height: circumscriptionHeight,
      corners: {
        topLeft: { x: centerX - halfWidth, y: centerY - halfHeight },
        topRight: { x: centerX + halfWidth, y: centerY - halfHeight },
        bottomLeft: { x: centerX - halfWidth, y: centerY + halfHeight },
        bottomRight: { x: centerX + halfWidth, y: centerY + halfHeight },
      }
    };
  }
}

