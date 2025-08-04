/**
 * スケール変換ユーティリティ
 * 1px = 1mmの関係を維持するための変換関数群
 */

/**
 * ミリメートルをピクセルに変換する
 * @param mm ミリメートル値
 * @returns ピクセル値
 */
export const mmToPx = (mm: number): number => {
  return mm; // 1px = 1mmの関係
};

/**
 * ピクセルをミリメートルに変換する
 * @param px ピクセル値
 * @returns ミリメートル値
 */
export const pxToMm = (px: number): number => {
  return px; // 1px = 1mmの関係
};

/**
 * 表示用のスケール変換（ズーム考慮）
 * @param value 元の値
 * @param zoomLevel ズームレベル
 * @returns スケール変換された値
 */
export const getDisplayScale = (value: number, zoomLevel: number): number => {
  return value * zoomLevel;
};

/**
 * ズームレベルを考慮した逆スケール変換
 * @param displayValue 表示値
 * @param zoomLevel ズームレベル
 * @returns 実際の値
 */
export const getActualScale = (displayValue: number, zoomLevel: number): number => {
  return displayValue / zoomLevel;
};

/**
 * 座標をスケール変換する
 * @param x X座標
 * @param y Y座標
 * @param scale スケール値
 * @returns スケール変換された座標
 */
export const scaleCoordinates = (x: number, y: number, scale: number): { x: number; y: number } => {
  return {
    x: x * scale,
    y: y * scale
  };
};

/**
 * 寸法をスケール変換する
 * @param width 幅
 * @param height 高さ
 * @param scale スケール値
 * @returns スケール変換された寸法
 */
export const scaleDimensions = (width: number, height: number, scale: number): { width: number; height: number } => {
  return {
    width: width * scale,
    height: height * scale
  };
};

/**
 * 測定値を人間が読みやすい形式でフォーマットする
 * @param mm ミリメートル値
 * @param unit 表示単位 ('mm' | 'cm' | 'm')
 * @returns フォーマットされた文字列
 */
export const formatMeasurement = (mm: number, unit: 'mm' | 'cm' | 'm' = 'mm'): string => {
  switch (unit) {
    case 'cm':
      return `${(mm / 10).toFixed(1)} cm`;
    case 'm':
      return `${(mm / 1000).toFixed(2)} m`;
    case 'mm':
    default:
      return `${mm.toFixed(0)} mm`;
  }
};

/**
 * 適切な単位を自動選択して測定値をフォーマットする
 * @param mm ミリメートル値
 * @returns 適切な単位でフォーマットされた文字列
 */
export const formatMeasurementAuto = (mm: number): string => {
  const absValue = Math.abs(mm);
  if (absValue >= 1000) {
    return formatMeasurement(mm, 'm');
  } else if (absValue >= 100) {
    return formatMeasurement(mm, 'cm');
  } else {
    return formatMeasurement(mm, 'mm');
  }
};