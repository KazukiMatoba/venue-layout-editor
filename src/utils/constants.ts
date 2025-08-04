// スケール定数（1px = 1mm）
export const SCALE_RATIO = 1; // 1px = 1mm

// デフォルトテーブルスタイル
export const DEFAULT_TABLE_STYLE = {
  fill: '#f0f0f0',
  stroke: '#333333',
  strokeWidth: 2,
  opacity: 0.8,
};

// 選択されたテーブルのスタイル
export const SELECTED_TABLE_STYLE = {
  fill: '#e3f2fd',
  stroke: '#1976d2',
  strokeWidth: 3,
  opacity: 0.9,
};

// ドラッグ中のテーブルスタイル
export const DRAGGING_TABLE_STYLE = {
  fill: '#fff3e0',
  stroke: '#f57c00',
  strokeWidth: 2,
  opacity: 0.7,
};

// 無効な位置のテーブルスタイル
export const INVALID_POSITION_STYLE = {
  fill: '#ffebee',
  stroke: '#d32f2f',
  strokeWidth: 3,
  opacity: 0.6,
};

// デフォルトテーブルサイズ（mm単位）
export const DEFAULT_RECTANGLE_SIZE = {
  width: 1200,  // 120cm
  height: 800,  // 80cm
};

export const DEFAULT_CIRCLE_SIZE = {
  radius: 600,  // 60cm半径
};

// キャンバス設定
export const CANVAS_CONFIG = {
  minZoom: 0.1,
  maxZoom: 5.0,
  defaultZoom: 1.0,
};

// エラーメッセージ
export const ERROR_MESSAGES = {
  INVALID_SVG: 'SVGファイルが無効です。正しいSVGファイルを選択してください。',
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます。',
  BOUNDARY_VIOLATION: 'テーブルを会場境界外に配置することはできません。',
  LOAD_FAILED: 'ファイルの読み込みに失敗しました。',
};