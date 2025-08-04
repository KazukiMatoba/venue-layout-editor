/**
 * 入力バリデーション機能のテスト
 * 要件1.4, 2.2, 2.3に対応
 */

import {
  validateTableSize,
  validateTablePosition,
  validateSVGFile,
  validateSVGData,
  validateTableObject,
  sanitizeUserInput,
  sanitizeSVGContent,
  sanitizeFileName,
  sanitizeNumericInput,
  validateTableOverlap,
  validateNumericRange,
  validateCoordinatePrecision,
  validateVenueLayout,
  VALIDATION_CONSTRAINTS
} from './validation';
import type { TableObject, Position, RectangleProps, CircleProps, SVGData } from '../types';

describe('入力バリデーション', () => {
  describe('validateTableSize', () => {
    describe('長方形テーブル', () => {
      it('有効な長方形テーブルサイズを受け入れる', () => {
        const props: RectangleProps = { width: 800, height: 600 };
        const result = validateTableSize('rectangle', props);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('最小サイズ未満を拒否する', () => {
        const props: RectangleProps = { width: 200, height: 200 };
        const result = validateTableSize('rectangle', props);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].code).toBe('MIN_VALUE_VIOLATION');
        expect(result.errors[1].code).toBe('MIN_VALUE_VIOLATION');
      });

      it('最大サイズ超過を拒否する', () => {
        const props: RectangleProps = { width: 4000, height: 4000 };
        const result = validateTableSize('rectangle', props);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].code).toBe('MAX_VALUE_VIOLATION');
        expect(result.errors[1].code).toBe('MAX_VALUE_VIOLATION');
      });

      it('無効な数値を拒否する', () => {
        const props: RectangleProps = { width: NaN, height: -100 };
        const result = validateTableSize('rectangle', props);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('INVALID_TYPE');
      });

      it('大きなサイズに警告を出す', () => {
        const props: RectangleProps = { width: 2500, height: 2000 };
        const result = validateTableSize('rectangle', props);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].code).toBe('LARGE_SIZE_WARNING');
      });

      it('極端なアスペクト比に警告を出す', () => {
        const props: RectangleProps = { width: 3000, height: 300 };
        const result = validateTableSize('rectangle', props);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.code === 'EXTREME_ASPECT_RATIO')).toBe(true);
      });
    });

    describe('円形テーブル', () => {
      it('有効な円形テーブルサイズを受け入れる', () => {
        const props: CircleProps = { radius: 400 };
        const result = validateTableSize('circle', props);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('最小半径未満を拒否する', () => {
        const props: CircleProps = { radius: 100 };
        const result = validateTableSize('circle', props);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('MIN_VALUE_VIOLATION');
      });

      it('最大半径超過を拒否する', () => {
        const props: CircleProps = { radius: 2000 };
        const result = validateTableSize('circle', props);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('MAX_VALUE_VIOLATION');
      });

      it('大きな半径に警告を出す', () => {
        const props: CircleProps = { radius: 1200 };
        const result = validateTableSize('circle', props);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].code).toBe('LARGE_SIZE_WARNING');
      });
    });
  });

  describe('validateTablePosition', () => {
    it('有効な位置を受け入れる', () => {
      const position: Position = { x: 100, y: 200 };
      const result = validateTablePosition(position);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('負の座標を拒否する', () => {
      const position: Position = { x: -10, y: -20 };
      const result = validateTablePosition(position);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('MIN_VALUE_VIOLATION');
      expect(result.errors[1].code).toBe('MIN_VALUE_VIOLATION');
    });

    it('極端に大きな座標を拒否する', () => {
      const position: Position = { x: 60000, y: 60000 };
      const result = validateTablePosition(position);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('MAX_VALUE_VIOLATION');
      expect(result.errors[1].code).toBe('MAX_VALUE_VIOLATION');
    });

    it('SVG境界外の位置に警告を出す', () => {
      const position: Position = { x: 1500, y: 1200 };
      const svgBounds = { width: 1000, height: 800 };
      const result = validateTablePosition(position, svgBounds);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].code).toBe('BOUNDARY_EXCEEDED');
      expect(result.warnings[1].code).toBe('BOUNDARY_EXCEEDED');
    });

    it('無効な数値を拒否する', () => {
      const position: Position = { x: NaN, y: Infinity };
      const result = validateTablePosition(position);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });
  });

  describe('validateSVGFile', () => {
    it('有効なSVGファイルを受け入れる', () => {
      const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      const result = validateSVGFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('大きすぎるファイルを拒否する', () => {
      const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
      const file = new File([largeContent], 'large.svg', { type: 'image/svg+xml' });
      const result = validateSVGFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_SIZE_EXCEEDED');
    });

    it('無効なファイル形式を拒否する', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateSVGFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('UNSUPPORTED_MIME_TYPE');
    });

    it('無効な拡張子を拒否する', () => {
      const file = new File(['<svg></svg>'], 'test.txt', { type: '' });
      const result = validateSVGFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNSUPPORTED_EXTENSION')).toBe(true);
    });

    it('大きなファイルに警告を出す', () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.svg', { type: 'image/svg+xml' });
      const result = validateSVGFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LARGE_FILE_WARNING');
    });
  });

  describe('validateSVGData', () => {
    it('有効なSVGデータを受け入れる', () => {
      const svgData: SVGData = {
        content: '<svg width="1000" height="800"></svg>',
        width: 1000,
        height: 800,
        viewBox: { x: 0, y: 0, width: 1000, height: 800 },
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 800 }
      };
      const result = validateSVGData(svgData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空のコンテンツを拒否する', () => {
      const svgData: SVGData = {
        content: '',
        width: 1000,
        height: 800,
        viewBox: { x: 0, y: 0, width: 1000, height: 800 },
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 800 }
      };
      const result = validateSVGData(svgData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_CONTENT');
    });

    it('無効な寸法を拒否する', () => {
      const svgData: SVGData = {
        content: '<svg></svg>',
        width: 0,
        height: -100,
        viewBox: { x: 0, y: 0, width: 0, height: -100 },
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: -100 }
      };
      const result = validateSVGData(svgData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'INVALID_WIDTH')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_HEIGHT')).toBe(true);
    });

    it('小さすぎる寸法を拒否する', () => {
      const svgData: SVGData = {
        content: '<svg width="50" height="50"></svg>',
        width: 50,
        height: 50,
        viewBox: { x: 0, y: 0, width: 50, height: 50 },
        bounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 }
      };
      const result = validateSVGData(svgData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('WIDTH_TOO_SMALL');
      expect(result.errors[1].code).toBe('HEIGHT_TOO_SMALL');
    });

    it('大きすぎる寸法を拒否する', () => {
      const svgData: SVGData = {
        content: '<svg width="60000" height="60000"></svg>',
        width: 60000,
        height: 60000,
        viewBox: { x: 0, y: 0, width: 60000, height: 60000 },
        bounds: { minX: 0, minY: 0, maxX: 60000, maxY: 60000 }
      };
      const result = validateSVGData(svgData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('WIDTH_TOO_LARGE');
      expect(result.errors[1].code).toBe('HEIGHT_TOO_LARGE');
    });

    it('大きなSVGに警告を出す', () => {
      const svgData: SVGData = {
        content: '<svg width="15000" height="15000"></svg>',
        width: 15000,
        height: 15000,
        viewBox: { x: 0, y: 0, width: 15000, height: 15000 },
        bounds: { minX: 0, minY: 0, maxX: 15000, maxY: 15000 }
      };
      const result = validateSVGData(svgData);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LARGE_SVG_WARNING');
    });
  });

  describe('sanitizeUserInput', () => {
    it('通常の文字列をそのまま返す', () => {
      const input = 'テーブル名';
      const result = sanitizeUserInput(input);
      
      expect(result).toBe('テーブル名');
    });

    it('HTMLタグを除去する', () => {
      const input = '<script>alert("test")</script>テーブル名';
      const result = sanitizeUserInput(input);
      
      expect(result).toBe('alert("test")テーブル名');
    });

    it('JavaScriptプロトコルを除去する', () => {
      const input = 'javascript:alert("test")';
      const result = sanitizeUserInput(input);
      
      expect(result).toBe('alert("test")');
    });

    it('イベントハンドラーを除去する', () => {
      const input = 'onclick=alert("test")テーブル名';
      const result = sanitizeUserInput(input);
      
      expect(result).toBe('alert("test")テーブル名');
    });

    it('制御文字を除去する', () => {
      const input = 'テーブル\x00名\x1f';
      const result = sanitizeUserInput(input);
      
      expect(result).toBe('テーブル名');
    });

    it('長すぎる文字列を切り詰める', () => {
      const input = 'a'.repeat(1500);
      const result = sanitizeUserInput(input);
      
      expect(result.length).toBe(1000);
    });

    it('非文字列を空文字列に変換する', () => {
      const result1 = sanitizeUserInput(null as any);
      const result2 = sanitizeUserInput(undefined as any);
      const result3 = sanitizeUserInput(123 as any);
      
      expect(result1).toBe('');
      expect(result2).toBe('');
      expect(result3).toBe('');
    });
  });

  describe('sanitizeSVGContent', () => {
    it('安全なSVGコンテンツを受け入れる', () => {
      const svgContent = '<svg width="100" height="100"><rect x="10" y="10" width="80" height="80"/></svg>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('スクリプトタグを検出する', () => {
      const svgContent = '<svg><script>alert("test")</script></svg>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DANGEROUS_CONTENT');
    });

    it('JavaScriptプロトコルを検出する', () => {
      const svgContent = '<svg><a href="javascript:alert(\'test\')">link</a></svg>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DANGEROUS_CONTENT');
    });

    it('イベントハンドラーを検出する', () => {
      const svgContent = '<svg><rect onclick="alert(\'test\')" /></svg>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DANGEROUS_CONTENT');
    });

    it('外部リソース参照に警告を出す', () => {
      const svgContent = '<svg><image href="https://example.com/image.png" /></svg>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('EXTERNAL_RESOURCE');
    });

    it('大きすぎるコンテンツを拒否する', () => {
      const svgContent = '<svg>' + 'x'.repeat(15 * 1024 * 1024) + '</svg>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CONTENT_TOO_LARGE');
    });

    it('SVGタグがないコンテンツを拒否する', () => {
      const svgContent = '<div>not svg</div>';
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_SVG_TAG');
    });

    it('無効なXMLを拒否する', () => {
      const svgContent = '<svg><rect></svg>'; // 閉じタグが不正
      const result = sanitizeSVGContent(svgContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('XML_PARSE_ERROR');
    });
  });

  describe('sanitizeFileName', () => {
    it('有効なファイル名を受け入れる', () => {
      const fileName = 'venue-layout.svg';
      const result = sanitizeFileName(fileName);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('危険な文字を検出する', () => {
      const fileName = 'venue<script>.svg';
      const result = sanitizeFileName(fileName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_CHARACTERS');
    });

    it('パストラバーサルを検出する', () => {
      const fileName = '../../../etc/passwd';
      const result = sanitizeFileName(fileName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PATH_TRAVERSAL');
    });

    it('長すぎるファイル名を拒否する', () => {
      const fileName = 'a'.repeat(300) + '.svg';
      const result = sanitizeFileName(fileName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NAME_TOO_LONG');
    });

    it('システム予約語を検出する', () => {
      const fileName = 'CON.svg';
      const result = sanitizeFileName(fileName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('RESERVED_NAME');
    });
  });

  describe('sanitizeNumericInput', () => {
    it('有効な数値をそのまま返す', () => {
      const result = sanitizeNumericInput('123.45');
      expect(result).toBe(123.45);
    });

    it('最小値未満を最小値に調整する', () => {
      const result = sanitizeNumericInput('5', 10, 100);
      expect(result).toBe(10);
    });

    it('最大値超過を最大値に調整する', () => {
      const result = sanitizeNumericInput('150', 10, 100);
      expect(result).toBe(100);
    });

    it('無効な値にnullを返す', () => {
      const result1 = sanitizeNumericInput('abc');
      const result2 = sanitizeNumericInput('');
      const result3 = sanitizeNumericInput(null);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('無限大を拒否する', () => {
      const result = sanitizeNumericInput(Infinity);
      expect(result).toBeNull();
    });
  });

  describe('validateTableOverlap', () => {
    const createRectangleTable = (id: string, x: number, y: number, width: number, height: number): TableObject => ({
      id,
      type: 'rectangle',
      position: { x, y },
      properties: { width, height },
      style: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 }
    });

    it('重複しないテーブルを受け入れる', () => {
      const newTable = createRectangleTable('new', 100, 100, 200, 200);
      const existingTables = [
        createRectangleTable('existing', 400, 400, 200, 200)
      ];
      
      const result = validateTableOverlap(newTable, existingTables);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('大きな重複を拒否する', () => {
      const newTable = createRectangleTable('new', 100, 100, 200, 200);
      const existingTables = [
        createRectangleTable('existing', 120, 120, 200, 200) // 大きく重複
      ];
      
      const result = validateTableOverlap(newTable, existingTables);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MAJOR_OVERLAP');
    });

    it('小さな重複に警告を出す', () => {
      const newTable = createRectangleTable('new', 100, 100, 200, 200);
      const existingTables = [
        createRectangleTable('existing', 180, 180, 200, 200) // 小さく重複
      ];
      
      const result = validateTableOverlap(newTable, existingTables);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('MINOR_OVERLAP');
    });

    it('同じIDのテーブルをスキップする', () => {
      const newTable = createRectangleTable('same', 100, 100, 200, 200);
      const existingTables = [
        createRectangleTable('same', 100, 100, 200, 200) // 同じID
      ];
      
      const result = validateTableOverlap(newTable, existingTables);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateNumericRange', () => {
    it('範囲内の値を受け入れる', () => {
      const result = validateNumericRange(50, 'テスト値', 0, 100, 'mm');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('最小値未満を拒否する', () => {
      const result = validateNumericRange(-10, 'テスト値', 0, 100, 'mm');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('VALUE_TOO_SMALL');
    });

    it('最大値超過を拒否する', () => {
      const result = validateNumericRange(150, 'テスト値', 0, 100, 'mm');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('VALUE_TOO_LARGE');
    });

    it('上限に近い値に警告を出す', () => {
      const result = validateNumericRange(90, 'テスト値', 0, 100, 'mm');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('NEAR_MAX_VALUE');
    });

    it('無効な数値を拒否する', () => {
      const result = validateNumericRange(NaN, 'テスト値', 0, 100, 'mm');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_NUMBER');
    });
  });

  describe('validateCoordinatePrecision', () => {
    it('精密な座標を受け入れる', () => {
      const position: Position = { x: 100.0, y: 200.0 };
      const result = validateCoordinatePrecision(position, 0.1);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('精度が合わない座標に警告を出す', () => {
      const position: Position = { x: 100.15, y: 200.25 };
      const result = validateCoordinatePrecision(position, 0.1);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].code).toBe('PRECISION_MISMATCH');
      expect(result.warnings[1].code).toBe('PRECISION_MISMATCH');
    });
  });

  describe('validateVenueLayout', () => {
    const mockSVGData: SVGData = {
      content: '<svg width="1000" height="800"></svg>',
      width: 1000,
      height: 800,
      viewBox: { x: 0, y: 0, width: 1000, height: 800 },
      bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 800 }
    };

    const mockTable: TableObject = {
      id: 'table1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 800, height: 600 },
      style: { fill: '#fff', stroke: '#000', strokeWidth: 1, opacity: 1 }
    };

    it('有効なレイアウトを受け入れる', () => {
      const result = validateVenueLayout(mockSVGData, [mockTable]);
      
      expect(result.isValid).toBe(true);
    });

    it('SVGデータがない場合にエラーを出す', () => {
      const result = validateVenueLayout(null, [mockTable]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_SVG');
    });

    it('テーブルがない場合に警告を出す', () => {
      const result = validateVenueLayout(mockSVGData, []);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('NO_TABLES');
    });

    it('テーブルが多すぎる場合に警告を出す', () => {
      const manyTables = Array.from({ length: 150 }, (_, i) => ({
        ...mockTable,
        id: `table${i}`
      }));
      
      const result = validateVenueLayout(mockSVGData, manyTables);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'TOO_MANY_TABLES')).toBe(true);
    });
  });

  describe('VALIDATION_CONSTRAINTS', () => {
    it('制約値が適切に定義されている', () => {
      expect(VALIDATION_CONSTRAINTS.TABLE_SIZE.RECTANGLE.MIN_WIDTH).toBe(300);
      expect(VALIDATION_CONSTRAINTS.TABLE_SIZE.RECTANGLE.MAX_WIDTH).toBe(3000);
      expect(VALIDATION_CONSTRAINTS.TABLE_SIZE.CIRCLE.MIN_RADIUS).toBe(150);
      expect(VALIDATION_CONSTRAINTS.TABLE_SIZE.CIRCLE.MAX_RADIUS).toBe(1500);
      expect(VALIDATION_CONSTRAINTS.SVG_FILE.MAX_SIZE_MB).toBe(10);
      expect(VALIDATION_CONSTRAINTS.POSITION.PRECISION).toBe(0.1);
    });

    it('許可されたファイル形式が定義されている', () => {
      expect(VALIDATION_CONSTRAINTS.SVG_FILE.ALLOWED_TYPES).toContain('image/svg+xml');
      expect(VALIDATION_CONSTRAINTS.SVG_FILE.ALLOWED_EXTENSIONS).toContain('.svg');
    });

    it('文字列制約が定義されている', () => {
      expect(VALIDATION_CONSTRAINTS.STRING.TABLE_ID.MIN_LENGTH).toBe(1);
      expect(VALIDATION_CONSTRAINTS.STRING.TABLE_ID.MAX_LENGTH).toBe(100);
      expect(VALIDATION_CONSTRAINTS.STRING.TABLE_ID.PATTERN).toBeInstanceOf(RegExp);
    });
  });
});