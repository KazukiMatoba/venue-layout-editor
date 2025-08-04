/**
 * スケール管理システム
 * 1px = 1mmの関係を維持するための包括的なスケール変換ユーティリティ
 * 要件5.1, 5.2, 5.3, 5.4に対応
 */

// スケール定数
export const SCALE_RATIO = 1; // 1px = 1mm（要件5.1対応）
export const MIN_SCALE = 0.05; // 5%まで縮小可能
export const MAX_SCALE = 20.0; // 2000%まで拡大可能
export const DEFAULT_SCALE = 1.0;
export const SCALE_STEP = 0.1;

// ズーム操作の定数
export const ZOOM_FACTOR_NORMAL = 1.2; // 通常のズーム倍率
export const ZOOM_FACTOR_FINE = 1.1; // 細かいズーム倍率
export const ZOOM_FACTOR_COARSE = 1.5; // 粗いズーム倍率

// 測定値表示の設定
export const MEASUREMENT_PRECISION = {
  mm: 1, // ミリメートルの小数点以下桁数
  cm: 1, // センチメートルの小数点以下桁数
  m: 2,  // メートルの小数点以下桁数
  px: 0  // ピクセルの小数点以下桁数（整数）
};

/**
 * mm → px変換
 * 1px=1mmスケールを維持（要件5.1, 5.2対応）
 * @param mm ミリメートル値
 * @returns ピクセル値
 */
export const mmToPx = (mm: number): number => mm * SCALE_RATIO;

/**
 * px → mm変換
 * 1px=1mmスケールを維持（要件5.1, 5.2対応）
 * @param px ピクセル値
 * @returns ミリメートル値
 */
export const pxToMm = (px: number): number => px / SCALE_RATIO;

/**
 * 表示用のスケール変換（ズーム考慮）
 * 要件5.1, 5.4対応
 * @param zoomLevel ズームレベル
 * @returns 表示スケール
 */
export const getDisplayScale = (zoomLevel: number): number => zoomLevel;

/**
 * スケール値を制限内にクランプ
 * @param scale スケール値
 * @returns クランプされたスケール値
 */
export const clampScale = (scale: number): number => {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
};

/**
 * ズームイン処理
 * @param currentScale 現在のスケール
 * @param factor ズーム倍率（デフォルト: 1.2）
 * @returns 新しいスケール値
 */
export const zoomIn = (currentScale: number, factor: number = 1.2): number => {
  return clampScale(currentScale * factor);
};

/**
 * ズームアウト処理
 * @param currentScale 現在のスケール
 * @param factor ズーム倍率（デフォルト: 1.2）
 * @returns 新しいスケール値
 */
export const zoomOut = (currentScale: number, factor: number = 1.2): number => {
  return clampScale(currentScale / factor);
};

/**
 * スケールをパーセンテージで取得
 * 要件5.3対応
 * @param scale スケール値
 * @returns パーセンテージ文字列
 */
export const getScalePercentage = (scale: number): string => {
  return `${Math.round(scale * 100)}%`;
};

/**
 * 測定値をフォーマット（mm単位）
 * 要件5.3対応
 * @param value 値（ピクセル単位）
 * @param unit 単位（デフォルト: 'mm'）
 * @returns フォーマットされた測定値文字列
 */
export const formatMeasurement = (value: number, unit: string = 'mm'): string => {
  const mmValue = pxToMm(value);
  return `${mmValue.toFixed(1)}${unit}`;
};

/**
 * 座標をスケールに応じて変換
 * 要件5.4対応
 * @param coordinate 座標値
 * @param scale スケール値
 * @returns 変換された座標値
 */
export const scaleCoordinate = (coordinate: number, scale: number): number => {
  return coordinate * scale;
};

/**
 * 座標をスケールから逆変換
 * 要件5.4対応
 * @param scaledCoordinate スケールされた座標値
 * @param scale スケール値
 * @returns 元の座標値
 */
export const unscaleCoordinate = (scaledCoordinate: number, scale: number): number => {
  return scaledCoordinate / scale;
};

/**
 * 寸法情報を含むオブジェクト
 */
export interface Dimensions {
  width: number;
  height: number;
  unit: string;
}

/**
 * 寸法をフォーマット
 * 要件5.3対応
 * @param width 幅（ピクセル）
 * @param height 高さ（ピクセル）
 * @returns フォーマットされた寸法オブジェクト
 */
export const formatDimensions = (width: number, height: number): Dimensions => {
  return {
    width: pxToMm(width),
    height: pxToMm(height),
    unit: 'mm'
  };
};

/**
 * 距離を計算（2点間）
 * @param x1 点1のX座標
 * @param y1 点1のY座標
 * @param x2 点2のX座標
 * @param y2 点2のY座標
 * @returns 距離（mm単位）
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  return pxToMm(distancePx);
};

/**
 * 高度なズーム機能
 */

/**
 * 特定の領域にフィットするスケールを計算
 * 要件5.4対応
 * @param targetWidth 対象の幅（px）
 * @param targetHeight 対象の高さ（px）
 * @param containerWidth コンテナの幅（px）
 * @param containerHeight コンテナの高さ（px）
 * @param padding パディング（px、デフォルト: 20）
 * @returns フィットスケール
 */
export const calculateFitScale = (
  targetWidth: number,
  targetHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 20
): number => {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;
  
  const scaleX = availableWidth / targetWidth;
  const scaleY = availableHeight / targetHeight;
  
  const fitScale = Math.min(scaleX, scaleY);
  return clampScale(fitScale);
};

/**
 * 段階的ズーム（プリセットレベル）
 * 要件5.4対応
 */
export const ZOOM_PRESETS = [
  0.1,   // 10%
  0.25,  // 25%
  0.5,   // 50%
  0.75,  // 75%
  1.0,   // 100%
  1.25,  // 125%
  1.5,   // 150%
  2.0,   // 200%
  3.0,   // 300%
  5.0,   // 500%
  10.0   // 1000%
];

/**
 * 最も近いズームプリセットを取得
 * @param currentScale 現在のスケール
 * @returns 最も近いプリセットスケール
 */
export const getNearestZoomPreset = (currentScale: number): number => {
  return ZOOM_PRESETS.reduce((prev, curr) => 
    Math.abs(curr - currentScale) < Math.abs(prev - currentScale) ? curr : prev
  );
};

/**
 * 次のズームプリセットを取得
 * @param currentScale 現在のスケール
 * @param direction 方向（'in' | 'out'）
 * @returns 次のプリセットスケール
 */
export const getNextZoomPreset = (currentScale: number, direction: 'in' | 'out'): number => {
  const sortedPresets = [...ZOOM_PRESETS].sort((a, b) => a - b);
  
  if (direction === 'in') {
    const nextPreset = sortedPresets.find(preset => preset > currentScale);
    return nextPreset ? clampScale(nextPreset) : clampScale(currentScale * ZOOM_FACTOR_NORMAL);
  } else {
    const prevPreset = sortedPresets.reverse().find(preset => preset < currentScale);
    return prevPreset ? clampScale(prevPreset) : clampScale(currentScale / ZOOM_FACTOR_NORMAL);
  }
};

/**
 * 測定値の高度なフォーマット機能
 */

/**
 * 測定値の単位を自動選択
 * 要件5.3対応
 * @param mmValue ミリメートル値
 * @returns 適切な単位
 */
export const getOptimalUnit = (mmValue: number): 'mm' | 'cm' | 'm' => {
  const absValue = Math.abs(mmValue);
  if (absValue >= 1000) return 'm';
  if (absValue >= 100) return 'cm';
  return 'mm';
};

/**
 * 測定値を最適な単位でフォーマット
 * 要件5.3対応
 * @param value 値（ピクセル単位）
 * @param forceUnit 強制する単位（オプション）
 * @returns フォーマットされた測定値文字列
 */
export const formatMeasurementOptimal = (value: number, forceUnit?: 'mm' | 'cm' | 'm'): string => {
  const mmValue = pxToMm(value);
  const unit = forceUnit || getOptimalUnit(mmValue);
  
  switch (unit) {
    case 'm':
      return `${(mmValue / 1000).toFixed(MEASUREMENT_PRECISION.m)}m`;
    case 'cm':
      return `${(mmValue / 10).toFixed(MEASUREMENT_PRECISION.cm)}cm`;
    case 'mm':
    default:
      return `${mmValue.toFixed(MEASUREMENT_PRECISION.mm)}mm`;
  }
};

/**
 * 面積を計算してフォーマット
 * 要件5.3対応
 * @param width 幅（ピクセル）
 * @param height 高さ（ピクセル）
 * @returns フォーマットされた面積文字列
 */
export const formatArea = (width: number, height: number): string => {
  const widthMm = pxToMm(width);
  const heightMm = pxToMm(height);
  const areaMm2 = widthMm * heightMm;
  
  if (areaMm2 >= 1000000) { // 1m²以上
    return `${(areaMm2 / 1000000).toFixed(2)}m²`;
  } else if (areaMm2 >= 100) { // 1cm²以上
    return `${(areaMm2 / 100).toFixed(1)}cm²`;
  } else {
    return `${areaMm2.toFixed(0)}mm²`;
  }
};

/**
 * 円の面積を計算してフォーマット
 * 要件5.3対応
 * @param radius 半径（ピクセル）
 * @returns フォーマットされた面積文字列
 */
export const formatCircleArea = (radius: number): string => {
  const radiusMm = pxToMm(radius);
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  
  if (areaMm2 >= 1000000) { // 1m²以上
    return `${(areaMm2 / 1000000).toFixed(2)}m²`;
  } else if (areaMm2 >= 100) { // 1cm²以上
    return `${(areaMm2 / 100).toFixed(1)}cm²`;
  } else {
    return `${areaMm2.toFixed(0)}mm²`;
  }
};

/**
 * スケール情報オブジェクト
 */
export interface ScaleInfo {
  scale: number;
  percentage: string;
  pixelToMmRatio: number;
  mmToPixelRatio: number;
  isMinScale: boolean;
  isMaxScale: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * 現在のスケール情報を取得
 * 要件5.3, 5.4対応
 * @param scale 現在のスケール
 * @returns スケール情報オブジェクト
 */
export const getScaleInfo = (scale: number): ScaleInfo => {
  return {
    scale,
    percentage: getScalePercentage(scale),
    pixelToMmRatio: 1 / scale, // 1ピクセルが何mmか
    mmToPixelRatio: scale,     // 1mmが何ピクセルか
    isMinScale: scale <= MIN_SCALE,
    isMaxScale: scale >= MAX_SCALE,
    canZoomIn: scale < MAX_SCALE,
    canZoomOut: scale > MIN_SCALE
  };
};

/**
 * ビューポート情報
 */
export interface ViewportInfo {
  width: number;
  height: number;
  widthMm: string;
  heightMm: string;
  area: string;
  scale: number;
}

/**
 * ビューポート情報を取得
 * 要件5.3対応
 * @param width ビューポート幅（ピクセル）
 * @param height ビューポート高さ（ピクセル）
 * @param scale 現在のスケール
 * @returns ビューポート情報
 */
export const getViewportInfo = (width: number, height: number, scale: number): ViewportInfo => {
  const actualWidth = width / scale;
  const actualHeight = height / scale;
  
  return {
    width: actualWidth,
    height: actualHeight,
    widthMm: formatMeasurementOptimal(actualWidth),
    heightMm: formatMeasurementOptimal(actualHeight),
    area: formatArea(actualWidth, actualHeight),
    scale
  };
};