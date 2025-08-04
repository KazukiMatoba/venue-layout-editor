/**
 * SVG関連の型定義
 */

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
}

/**
 * SVG読み込みエラーの型定義
 */
export interface SVGLoadError {
  type: 'validation' | 'file' | 'size' | 'parse' | 'format' | 'network';
  message: string;
  details?: string;
  code?: string;
}

/**
 * SVG処理結果の型定義
 */
export interface SVGProcessingResult {
  success: boolean;
  data?: SVGData;
  error?: SVGLoadError;
  warnings?: string[];
}