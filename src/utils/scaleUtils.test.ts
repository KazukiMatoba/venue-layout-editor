import { describe, it, expect } from 'vitest';
import {
  mmToPx,
  pxToMm,
  getDisplayScale,
  getActualScale,
  scaleCoordinates,
  scaleDimensions,
  formatMeasurement,
  formatMeasurementAuto
} from './scaleUtils';

describe('スケール変換ユーティリティ', () => {
  describe('mmToPx', () => {
    it('ミリメートルをピクセルに正しく変換する', () => {
      expect(mmToPx(10)).toBe(10); // 1px = 1mm
      expect(mmToPx(25.5)).toBe(25.5);
      expect(mmToPx(0)).toBe(0);
      expect(mmToPx(100)).toBe(100);
    });
  });

  describe('pxToMm', () => {
    it('ピクセルをミリメートルに正しく変換する', () => {
      expect(pxToMm(10)).toBe(10); // 1px = 1mm
      expect(pxToMm(25.5)).toBe(25.5);
      expect(pxToMm(0)).toBe(0);
      expect(pxToMm(100)).toBe(100);
    });
  });

  describe('getDisplayScale', () => {
    it('ズームレベルを考慮した表示スケールを計算する', () => {
      expect(getDisplayScale(100, 1.0)).toBe(100);
      expect(getDisplayScale(100, 2.0)).toBe(200);
      expect(getDisplayScale(50, 0.5)).toBe(25);
      expect(getDisplayScale(75, 1.5)).toBe(112.5);
    });
  });

  describe('getActualScale', () => {
    it('表示値から実際の値を計算する', () => {
      expect(getActualScale(200, 2.0)).toBe(100);
      expect(getActualScale(25, 0.5)).toBe(50);
      expect(getActualScale(112.5, 1.5)).toBe(75);
      expect(getActualScale(100, 1.0)).toBe(100);
    });
  });

  describe('scaleCoordinates', () => {
    it('座標を正しくスケール変換する', () => {
      const result = scaleCoordinates(10, 20, 2.0);
      expect(result).toEqual({ x: 20, y: 40 });
    });

    it('負の座標も正しく変換する', () => {
      const result = scaleCoordinates(-5, -10, 1.5);
      expect(result).toEqual({ x: -7.5, y: -15 });
    });

    it('ゼロスケールを処理する', () => {
      const result = scaleCoordinates(10, 20, 0);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('小数点スケールを処理する', () => {
      const result = scaleCoordinates(100, 200, 0.25);
      expect(result).toEqual({ x: 25, y: 50 });
    });
  });

  describe('scaleDimensions', () => {
    it('寸法を正しくスケール変換する', () => {
      const result = scaleDimensions(100, 50, 2.0);
      expect(result).toEqual({ width: 200, height: 100 });
    });

    it('小数点寸法を処理する', () => {
      const result = scaleDimensions(33.33, 66.67, 1.5);
      expect(result).toEqual({ width: 49.995, height: 100.005 });
    });

    it('ゼロ寸法を処理する', () => {
      const result = scaleDimensions(0, 0, 5.0);
      expect(result).toEqual({ width: 0, height: 0 });
    });
  });

  describe('formatMeasurement', () => {
    it('ミリメートル単位で正しくフォーマットする', () => {
      expect(formatMeasurement(25)).toBe('25 mm');
      expect(formatMeasurement(25, 'mm')).toBe('25 mm');
      expect(formatMeasurement(25.7)).toBe('26 mm'); // 四捨五入
      expect(formatMeasurement(0)).toBe('0 mm');
    });

    it('センチメートル単位で正しくフォーマットする', () => {
      expect(formatMeasurement(25, 'cm')).toBe('2.5 cm');
      expect(formatMeasurement(100, 'cm')).toBe('10.0 cm');
      expect(formatMeasurement(33, 'cm')).toBe('3.3 cm');
      expect(formatMeasurement(0, 'cm')).toBe('0.0 cm');
    });

    it('メートル単位で正しくフォーマットする', () => {
      expect(formatMeasurement(1000, 'm')).toBe('1.00 m');
      expect(formatMeasurement(2500, 'm')).toBe('2.50 m');
      expect(formatMeasurement(333, 'm')).toBe('0.33 m');
      expect(formatMeasurement(0, 'm')).toBe('0.00 m');
    });

    it('小数点値を正しく処理する', () => {
      expect(formatMeasurement(25.4, 'mm')).toBe('25 mm');
      expect(formatMeasurement(25.6, 'mm')).toBe('26 mm');
      expect(formatMeasurement(125.7, 'cm')).toBe('12.6 cm');
      expect(formatMeasurement(1234.5, 'm')).toBe('1.23 m');
    });
  });

  describe('formatMeasurementAuto', () => {
    it('小さな値にはミリメートルを使用する', () => {
      expect(formatMeasurementAuto(5)).toBe('5 mm');
      expect(formatMeasurementAuto(25)).toBe('25 mm');
      expect(formatMeasurementAuto(99)).toBe('99 mm');
    });

    it('中程度の値にはセンチメートルを使用する', () => {
      expect(formatMeasurementAuto(100)).toBe('10.0 cm');
      expect(formatMeasurementAuto(250)).toBe('25.0 cm');
      expect(formatMeasurementAuto(999)).toBe('99.9 cm');
    });

    it('大きな値にはメートルを使用する', () => {
      expect(formatMeasurementAuto(1000)).toBe('1.00 m');
      expect(formatMeasurementAuto(2500)).toBe('2.50 m');
      expect(formatMeasurementAuto(10000)).toBe('10.00 m');
    });

    it('境界値を正しく処理する', () => {
      expect(formatMeasurementAuto(99.9)).toBe('100 mm'); // 四捨五入でmm
      expect(formatMeasurementAuto(100.0)).toBe('10.0 cm'); // ちょうど100でcm
      expect(formatMeasurementAuto(999.9)).toBe('100.0 cm'); // 四捨五入でcm
      expect(formatMeasurementAuto(1000.0)).toBe('1.00 m'); // ちょうど1000でm
    });

    it('ゼロ値を処理する', () => {
      expect(formatMeasurementAuto(0)).toBe('0 mm');
    });

    it('負の値を処理する', () => {
      expect(formatMeasurementAuto(-50)).toBe('-50 mm');
      expect(formatMeasurementAuto(-150)).toBe('-15.0 cm');
      expect(formatMeasurementAuto(-1500)).toBe('-1.50 m');
    });

    it('小数点値を正しく処理する', () => {
      expect(formatMeasurementAuto(25.7)).toBe('26 mm');
      expect(formatMeasurementAuto(125.7)).toBe('12.6 cm');
      expect(formatMeasurementAuto(1234.5)).toBe('1.23 m');
    });
  });

  describe('スケール変換の一貫性', () => {
    it('mmToPxとpxToMmが逆変換として機能する', () => {
      const originalMm = 42.5;
      const px = mmToPx(originalMm);
      const backToMm = pxToMm(px);
      expect(backToMm).toBe(originalMm);
    });

    it('getDisplayScaleとgetActualScaleが逆変換として機能する', () => {
      const originalValue = 75;
      const zoomLevel = 1.8;
      const displayValue = getDisplayScale(originalValue, zoomLevel);
      const backToOriginal = getActualScale(displayValue, zoomLevel);
      expect(backToOriginal).toBeCloseTo(originalValue, 10);
    });

    it('scaleCoordinatesが一貫した結果を返す', () => {
      const originalX = 10;
      const originalY = 20;
      const scale = 2.5;
      
      const scaled = scaleCoordinates(originalX, originalY, scale);
      const backToOriginal = scaleCoordinates(scaled.x, scaled.y, 1/scale);
      
      expect(backToOriginal.x).toBeCloseTo(originalX, 10);
      expect(backToOriginal.y).toBeCloseTo(originalY, 10);
    });

    it('scaleDimensionsが一貫した結果を返す', () => {
      const originalWidth = 100;
      const originalHeight = 50;
      const scale = 1.7;
      
      const scaled = scaleDimensions(originalWidth, originalHeight, scale);
      const backToOriginal = scaleDimensions(scaled.width, scaled.height, 1/scale);
      
      expect(backToOriginal.width).toBeCloseTo(originalWidth, 10);
      expect(backToOriginal.height).toBeCloseTo(originalHeight, 10);
    });
  });

  describe('エッジケース', () => {
    it('非常に大きな値を処理する', () => {
      const largeValue = 1000000;
      expect(mmToPx(largeValue)).toBe(largeValue);
      expect(pxToMm(largeValue)).toBe(largeValue);
      expect(formatMeasurementAuto(largeValue)).toBe('1000.00 m');
    });

    it('非常に小さな値を処理する', () => {
      const smallValue = 0.001;
      expect(mmToPx(smallValue)).toBe(smallValue);
      expect(pxToMm(smallValue)).toBe(smallValue);
      expect(formatMeasurementAuto(smallValue)).toBe('0 mm');
    });

    it('Infinityを処理する', () => {
      expect(mmToPx(Infinity)).toBe(Infinity);
      expect(pxToMm(Infinity)).toBe(Infinity);
      expect(getDisplayScale(100, Infinity)).toBe(Infinity);
    });

    it('NaNを処理する', () => {
      expect(mmToPx(NaN)).toBeNaN();
      expect(pxToMm(NaN)).toBeNaN();
      expect(getDisplayScale(NaN, 2)).toBeNaN();
    });
  });
});