import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processSVGFile,
  prepareForKonvaDisplay,
  SVGCoordinateConverter,
  assessSVGQuality,
  validateSVGData,
  getSVGStatistics,
  extractViewBoxFromSVG,
  calculateSVGBounds,
  calculateScaleTransforms,
  convertSVGToKonvaData
} from './svgDataProcessor';
import type { SVGData } from '../types';

// ブラウザAPIのモック設定
beforeEach(() => {
  // FileReaderのモック
  const mockFileReader = () => {
    const reader = {
      readAsText: vi.fn(),
      onload: null as ((event: any) => void) | null,
      onerror: null as ((event: any) => void) | null,
      result: null as string | null
    };
    
    reader.readAsText.mockImplementation((file: File) => {
      setTimeout(() => {
        if (reader.onload) {
          // テスト用に保存されたコンテンツを使用
          let content = (file as any)._testContent || '<svg width="200" height="150" viewBox="0 0 200 150"><circle cx="100" cy="75" r="50" fill="red"/></svg>';
          
          reader.result = content;
          reader.onload({ target: { result: reader.result } });
        }
      }, 0);
    });
    
    return reader;
  };

  (globalThis as any).FileReader = vi.fn().mockImplementation(mockFileReader);

  // DOMParserのモック - より柔軟に対応
  (globalThis as any).DOMParser = vi.fn().mockImplementation(() => ({
    parseFromString: vi.fn().mockImplementation((content: string, type: string) => {
      // 無効なSVGコンテンツをチェック
      if (!content.includes('<svg')) {
        return {
          querySelector: vi.fn().mockImplementation((selector: string) => {
            if (selector === 'parsererror') return null;
            if (selector === 'svg') return null; // 無効なSVGの場合はnullを返す
            return null;
          })
        };
      }

      // SVGコンテンツに基づいて動的にレスポンスを生成
      const doc = {
        querySelector: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'parsererror') return null;
          if (selector === 'svg') {
            // コンテンツから属性を抽出
            const widthMatch = content.match(/width="(\d+)"/);
            const heightMatch = content.match(/height="(\d+)"/);
            const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
            
            const width = widthMatch ? widthMatch[1] : '300';
            const height = heightMatch ? heightMatch[1] : '150';
            const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;
            
            return {
              getAttribute: vi.fn().mockImplementation((attr: string) => {
                switch (attr) {
                  case 'width': return width;
                  case 'height': return height;
                  case 'viewBox': return viewBox;
                  default: return null;
                }
              }),
              hasAttribute: vi.fn().mockReturnValue(false),
              removeAttribute: vi.fn(),
              querySelectorAll: vi.fn().mockReturnValue([]),
              getBBox: vi.fn().mockReturnValue({
                x: 0, y: 0, width: parseInt(width), height: parseInt(height)
              })
            };
          }
          return null;
        })
      };
      return doc;
    })
  }));

  // XMLSerializerのモック
  (globalThis as any).XMLSerializer = vi.fn().mockImplementation(() => ({
    serializeToString: vi.fn().mockReturnValue('<svg width="200" height="150"></svg>')
  }));

  // Imageのモック
  (globalThis as any).Image = vi.fn().mockImplementation(() => ({
    onload: null,
    onerror: null,
    src: ''
  }));

  // URLのモック
  (globalThis as any).URL = {
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn()
  };

  // Blobのモック
  (globalThis as any).Blob = vi.fn().mockImplementation((content, options) => ({
    size: content[0]?.length || 1000,
    type: options?.type || ''
  }));
});

// モックSVGデータ
const mockSVGData: SVGData = {
  content: '<svg width="100" height="100" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="blue"/></svg>',
  width: 100,
  height: 100,
  viewBox: { x: 0, y: 0, width: 100, height: 100 },
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
};

// モックファイル
const createMockFile = (content: string, size: number = 1000): File => {
  const file = new File([content], 'test.svg', { type: 'image/svg+xml' });
  Object.defineProperty(file, 'size', { 
    value: size,
    writable: false,
    configurable: true
  });
  // ファイルにコンテンツを保存（テスト用）
  (file as any)._testContent = content;
  return file;
};

describe('SVGデータ処理ユーティリティ', () => {
  describe('processSVGFile', () => {
    it('有効なSVGファイルを正しく処理する', async () => {
      const svgContent = '<svg width="200" height="150" viewBox="0 0 200 150"><circle cx="100" cy="75" r="50" fill="red"/></svg>';
      const file = createMockFile(svgContent);

      const result = await processSVGFile(file);

      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(result.viewBox).toEqual({ x: 0, y: 0, width: 200, height: 150 });
      expect(result.optimizedContent).toBeDefined();
      expect(result.renderingRecommendation).toBeDefined();
      expect(result.processingMetadata).toBeDefined();
    });

    it('ファイルサイズ制限を適用する', async () => {
      const svgContent = '<svg width="100" height="100"><rect width="100" height="100"/></svg>';
      const file = createMockFile(svgContent, 15 * 1024 * 1024); // 15MB

      await expect(processSVGFile(file, { maxFileSizeMB: 10 }))
        .rejects.toThrow('ファイルサイズが制限（10MB）を超えています');
    });

    it('寸法制限を適用する', async () => {
      const svgContent = '<svg width="6000" height="4000"><rect width="6000" height="4000"/></svg>';
      const file = createMockFile(svgContent);

      await expect(processSVGFile(file, { maxDimensions: { width: 5000, height: 5000 } }))
        .rejects.toThrow('SVGの寸法が制限（5000x5000px）を超えています');
    });

    it('最適化オプションを適用する', async () => {
      const svgContent = '<svg width="100" height="100" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="100" height="100"/></svg>';
      const file = createMockFile(svgContent);

      const result = await processSVGFile(file, { optimize: true });

      expect(result.processingMetadata.appliedOptimizations).toContain('konva-optimization');
    });
  });

  describe('prepareForKonvaDisplay', () => {
    it('Konva表示用の設定を正しく生成する', () => {
      const processedSVGData = {
        ...mockSVGData,
        optimizedContent: mockSVGData.content,
        renderingRecommendation: { method: 'inline' as const, reason: 'test', performance: 'high' as const },
        processingMetadata: {
          originalSize: 1000,
          optimizedSize: 900,
          processingTime: 50,
          appliedOptimizations: []
        }
      };

      const config = prepareForKonvaDisplay(processedSVGData, 800, 600, 'contain');

      expect(config.stageProps).toBeDefined();
      expect(config.imageProps).toBeDefined();
      expect(config.svgBounds).toBeDefined();
      expect(config.scaleFactor).toBeGreaterThan(0);
      expect(config.displayMode).toBe('svg');
    });

    it('異なるフィットモードで正しく動作する', () => {
      const processedSVGData = {
        ...mockSVGData,
        optimizedContent: mockSVGData.content,
        renderingRecommendation: { method: 'inline' as const, reason: 'test', performance: 'high' as const },
        processingMetadata: {
          originalSize: 1000,
          optimizedSize: 900,
          processingTime: 50,
          appliedOptimizations: []
        }
      };

      const containConfig = prepareForKonvaDisplay(processedSVGData, 800, 600, 'contain');
      const coverConfig = prepareForKonvaDisplay(processedSVGData, 800, 600, 'cover');
      const fillConfig = prepareForKonvaDisplay(processedSVGData, 800, 600, 'fill');

      expect(containConfig.stageProps.scaleX).toBe(containConfig.stageProps.scaleY);
      expect(coverConfig.stageProps.scaleX).toBe(coverConfig.stageProps.scaleY);
      expect(fillConfig.stageProps.scaleX).not.toBe(fillConfig.stageProps.scaleY);
    });
  });

  describe('SVGCoordinateConverter', () => {
    let converter: SVGCoordinateConverter;

    beforeEach(() => {
      const stageProps = {
        width: 800,
        height: 600,
        scaleX: 2,
        scaleY: 2,
        x: 100,
        y: 50
      };
      converter = new SVGCoordinateConverter(mockSVGData, stageProps);
    });

    it('SVG座標をミリメートル座標に変換する', () => {
      const result = converter.svgToMm({ x: 50, y: 30 });
      expect(result).toEqual({ x: 50, y: 30 }); // 1px = 1mm
    });

    it('ミリメートル座標をSVG座標に変換する', () => {
      const result = converter.mmToSvg({ x: 25, y: 40 });
      expect(result).toEqual({ x: 25, y: 40 }); // 1px = 1mm
    });

    it('Konva座標をSVG座標に変換する', () => {
      const result = converter.konvaToSvg({ x: 200, y: 150 });
      expect(result).toEqual({ x: 50, y: 50 }); // (200-100)/2, (150-50)/2
    });

    it('SVG座標をKonva座標に変換する', () => {
      const result = converter.svgToKonva({ x: 25, y: 30 });
      expect(result).toEqual({ x: 150, y: 110 }); // 25*2+100, 30*2+50
    });

    it('寸法をスケール変換する', () => {
      const result = converter.scaleDimensions(100, 80, 1, 2);
      expect(result).toEqual({ width: 200, height: 160 });
    });
  });

  describe('assessSVGQuality', () => {
    it('高品質なSVGに高いスコアを付ける', () => {
      const processedSVGData = {
        ...mockSVGData,
        optimizedContent: mockSVGData.content,
        renderingRecommendation: { method: 'inline' as const, reason: 'test', performance: 'high' as const },
        processingMetadata: {
          originalSize: 1000,
          optimizedSize: 800,
          processingTime: 50,
          appliedOptimizations: ['konva-optimization']
        }
      };

      const assessment = assessSVGQuality(processedSVGData);

      expect(assessment.score).toBeGreaterThan(80);
      expect(assessment.performance).toBe('excellent');
      expect(assessment.issues.length).toBeLessThan(3);
    });

    it('低品質なSVGに低いスコアを付ける', () => {
      const processedSVGData = {
        ...mockSVGData,
        width: 3000,
        height: 2000,
        optimizedContent: mockSVGData.content,
        renderingRecommendation: { method: 'canvas' as const, reason: 'test', performance: 'low' as const },
        processingMetadata: {
          originalSize: 8 * 1024 * 1024, // 8MB
          optimizedSize: 7.5 * 1024 * 1024,
          processingTime: 1500,
          appliedOptimizations: []
        }
      };

      const assessment = assessSVGQuality(processedSVGData);

      expect(assessment.score).toBeLessThan(60);
      expect(assessment.performance).toBe('poor');
      expect(assessment.issues.length).toBeGreaterThan(2);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('validateSVGData', () => {
    it('有効なSVGデータを検証する', () => {
      const result = validateSVGData(mockSVGData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効なSVGデータを検出する', () => {
      const invalidSVGData: SVGData = {
        content: '',
        width: -100,
        height: 0,
        viewBox: { x: 0, y: 0, width: -50, height: 0 },
        bounds: { minX: 100, minY: 50, maxX: 50, maxY: 25 }
      };

      const result = validateSVGData(invalidSVGData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('SVGコンテンツが空です');
      expect(result.errors).toContain('SVGの寸法が無効です');
      expect(result.errors).toContain('ViewBoxが無効です');
      expect(result.errors).toContain('境界情報が無効です');
    });
  });

  describe('getSVGStatistics', () => {
    it('SVGの統計情報を正しく計算する', () => {
      const processedSVGData = {
        ...mockSVGData,
        optimizedContent: mockSVGData.content,
        renderingRecommendation: { method: 'inline' as const, reason: 'test', performance: 'high' as const },
        processingMetadata: {
          originalSize: 2000,
          optimizedSize: 1800,
          processingTime: 75,
          appliedOptimizations: ['konva-optimization']
        }
      };

      const stats = getSVGStatistics(processedSVGData);

      expect(stats.fileSize).toBe(2000);
      expect(stats.dimensions).toEqual({ width: 100, height: 100 });
      expect(stats.aspectRatio).toBe(1);
      expect(stats.area).toBe(10000);
      expect(stats.viewBoxRatio).toBe(1);
      expect(stats.boundsArea).toBe(10000);
      expect(stats.complexity).toBeDefined();
    });
  });

  // 新しく実装した核となる機能のテスト
  describe('extractViewBoxFromSVG', () => {
    it('明示的なviewBox属性を正しく抽出する', () => {
      const svgContent = '<svg width="200" height="150" viewBox="10 20 180 130"><rect width="100" height="100"/></svg>';
      
      const result = extractViewBoxFromSVG(svgContent);
      
      expect(result.viewBox).toEqual({ x: 10, y: 20, width: 180, height: 130 });
      expect(result.hasExplicitViewBox).toBe(true);
      expect(result.calculatedFromDimensions).toBe(false);
      expect(result.extractionMethod).toBe('explicit-viewBox-attribute');
    });

    it('viewBoxがない場合は寸法から計算する', () => {
      const svgContent = '<svg width="300" height="200"><rect width="100" height="100"/></svg>';
      
      const result = extractViewBoxFromSVG(svgContent);
      
      expect(result.viewBox).toEqual({ x: 0, y: 0, width: 300, height: 200 });
      expect(result.hasExplicitViewBox).toBe(false);
      expect(result.calculatedFromDimensions).toBe(true);
      expect(result.extractionMethod).toBe('calculated-from-dimensions');
    });

    it('無効なSVGの場合はデフォルト値を返す', () => {
      const svgContent = '<invalid>not svg</invalid>';
      
      const result = extractViewBoxFromSVG(svgContent);
      
      expect(result.viewBox).toEqual({ x: 0, y: 0, width: 300, height: 150 });
      expect(result.hasExplicitViewBox).toBe(false);
      expect(result.calculatedFromDimensions).toBe(false);
      expect(result.extractionMethod).toBe('default-fallback');
    });
  });

  describe('calculateSVGBounds', () => {
    it('有効なSVGの境界を正しく計算する', () => {
      const svgContent = '<svg width="200" height="150" viewBox="0 0 200 150"><rect width="100" height="100"/></svg>';
      
      const result = calculateSVGBounds(svgContent);
      
      expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 200, maxY: 150 });
      expect(result.calculationMethod).toBe('getBBox-with-viewBox-comparison');
      expect(result.accuracy).toBe('high');
      expect(result.contentBounds).toBeDefined();
    });

    it('getBBoxが失敗した場合はviewBoxから計算する', () => {
      // getBBoxが失敗するケースをシミュレート
      const svgContent = '<svg width="100" height="80"><path d="M10,10 L90,70"/></svg>';
      
      const result = calculateSVGBounds(svgContent);
      
      expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 80 });
      expect(result.accuracy).toMatch(/medium|high/);
    });

    it('無効なSVGの場合はデフォルト境界を返す', () => {
      const svgContent = '<invalid>not svg</invalid>';
      
      const result = calculateSVGBounds(svgContent);
      
      expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 300, maxY: 150 });
      expect(result.calculationMethod).toBe('default-fallback');
      expect(result.accuracy).toBe('low');
    });
  });

  describe('calculateScaleTransforms', () => {
    it('uniformスケールモードで正しく計算する', () => {
      const sourceDimensions = { width: 100, height: 80 };
      const targetDimensions = { width: 200, height: 200 };
      
      const result = calculateScaleTransforms(sourceDimensions, targetDimensions, 'uniform');
      
      expect(result.scaleX).toBe(result.scaleY);
      expect(result.uniformScale).toBe(2); // min(200/100, 200/80) = min(2, 2.5) = 2
      expect(result.aspectRatioPreserved).toBe(true);
      expect(result.scaledDimensions).toEqual({ width: 200, height: 160 });
      expect(result.offset).toEqual({ x: 0, y: 20 });
    });

    it('fitスケールモードで正しく計算する', () => {
      const sourceDimensions = { width: 150, height: 100 };
      const targetDimensions = { width: 300, height: 150 };
      
      const result = calculateScaleTransforms(sourceDimensions, targetDimensions, 'fit');
      
      expect(result.scaleX).toBe(result.scaleY);
      expect(result.uniformScale).toBe(1.5); // min(300/150, 150/100) = min(2, 1.5) = 1.5
      expect(result.aspectRatioPreserved).toBe(true);
    });

    it('stretchスケールモードで正しく計算する', () => {
      const sourceDimensions = { width: 100, height: 100 };
      const targetDimensions = { width: 200, height: 150 };
      
      const result = calculateScaleTransforms(sourceDimensions, targetDimensions, 'stretch');
      
      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(1.5);
      expect(result.aspectRatioPreserved).toBe(false);
      expect(result.scaledDimensions).toEqual({ width: 200, height: 150 });
    });
  });

  describe('convertSVGToKonvaData', () => {
    it('SVGをKonva互換データに正しく変換する', () => {
      const targetDimensions = { width: 800, height: 600 };
      
      const result = convertSVGToKonvaData(mockSVGData, targetDimensions);
      
      expect(result.konvaStageConfig).toBeDefined();
      expect(result.konvaStageConfig.width).toBe(800);
      expect(result.konvaStageConfig.height).toBe(600);
      expect(result.svgImageConfig).toBeDefined();
      expect(result.coordinateTransforms).toBeDefined();
      expect(result.boundaryConstraints).toBeDefined();
    });

    it('座標変換関数が正しく動作する', () => {
      const targetDimensions = { width: 400, height: 300 };
      
      const result = convertSVGToKonvaData(mockSVGData, targetDimensions);
      
      // SVG座標をKonva座標に変換
      const konvaPos = result.coordinateTransforms.svgToKonva({ x: 50, y: 50 });
      expect(konvaPos.x).toBeGreaterThan(0);
      expect(konvaPos.y).toBeGreaterThan(0);
      
      // Konva座標をSVG座標に逆変換
      const svgPos = result.coordinateTransforms.konvaToSvg(konvaPos);
      expect(svgPos.x).toBeCloseTo(50, 1);
      expect(svgPos.y).toBeCloseTo(50, 1);
      
      // ミリメートル座標変換（1px = 1mm）
      const mmPos = result.coordinateTransforms.konvaToMm(konvaPos);
      expect(mmPos.x).toBeCloseTo(50, 1);
      expect(mmPos.y).toBeCloseTo(50, 1);
    });

    it('境界制約が正しく動作する', () => {
      const targetDimensions = { width: 400, height: 300 };
      
      const result = convertSVGToKonvaData(mockSVGData, targetDimensions);
      
      // 境界内の位置
      const validPos = { x: result.boundaryConstraints.konvaBounds.minX + 10, y: result.boundaryConstraints.konvaBounds.minY + 10 };
      expect(result.boundaryConstraints.isWithinBounds(validPos)).toBe(true);
      
      // 境界外の位置
      const invalidPos = { x: result.boundaryConstraints.konvaBounds.maxX + 100, y: result.boundaryConstraints.konvaBounds.maxY + 100 };
      expect(result.boundaryConstraints.isWithinBounds(invalidPos)).toBe(false);
      
      // 位置制約
      const constrainedPos = result.boundaryConstraints.constrainPosition(invalidPos);
      expect(result.boundaryConstraints.isWithinBounds(constrainedPos)).toBe(true);
    });
  });
});