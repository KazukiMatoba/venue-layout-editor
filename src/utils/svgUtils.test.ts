import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseSVGContent,
  calculateDetailedBounds,
  isValidSVGFile,
  isValidFileSize,
  readSVGFile,
  optimizeSVGForKonva,
  evaluateSVGComplexity,
  getSVGRenderingRecommendation,
  extractSVGElementInfo
} from './svgUtils';

// モックDOM環境のセットアップ
const mockDOMParser = vi.fn();
const mockXMLSerializer = vi.fn();

beforeEach(() => {
  // DOMParserのモック
  global.DOMParser = vi.fn().mockImplementation(() => ({
    parseFromString: vi.fn().mockReturnValue({
      querySelector: vi.fn().mockReturnValue({
        getAttribute: vi.fn(),
        hasAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        getBBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
      }),
      querySelectorAll: vi.fn().mockReturnValue([])
    })
  }));

  // XMLSerializerのモック
  global.XMLSerializer = vi.fn().mockImplementation(() => ({
    serializeToString: vi.fn().mockReturnValue('<svg></svg>')
  }));
});

describe('SVGユーティリティ', () => {
  describe('parseSVGContent', () => {
    it('有効なSVGコンテンツを正しく解析する', () => {
      const svgContent = '<svg width="200" height="150" viewBox="0 0 200 150"><rect x="10" y="10" width="180" height="130"/></svg>';
      
      // DOMParserのモックを設定
      const mockSVGElement = {
        getAttribute: vi.fn((attr: string) => {
          switch (attr) {
            case 'width': return '200';
            case 'height': return '150';
            case 'viewBox': return '0 0 200 150';
            default: return null;
          }
        }),
        hasAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        getBBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 200, height: 150 })
      };

      const mockDoc = {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'parsererror') return null;
          if (selector === 'svg') return mockSVGElement;
          return null;
        }),
        querySelectorAll: vi.fn().mockReturnValue([])
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const result = parseSVGContent(svgContent);

      expect(result.content).toBe(svgContent);
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(result.viewBox).toEqual({ x: 0, y: 0, width: 200, height: 150 });
      expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 200, maxY: 150 });
    });

    it('viewBoxがない場合にデフォルト値を使用する', () => {
      const svgContent = '<svg width="300" height="200"><rect width="300" height="200"/></svg>';
      
      const mockSVGElement = {
        getAttribute: vi.fn((attr: string) => {
          switch (attr) {
            case 'width': return '300';
            case 'height': return '200';
            case 'viewBox': return null;
            default: return null;
          }
        }),
        hasAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        getBBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 300, height: 200 })
      };

      const mockDoc = {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'parsererror') return null;
          if (selector === 'svg') return mockSVGElement;
          return null;
        }),
        querySelectorAll: vi.fn().mockReturnValue([])
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const result = parseSVGContent(svgContent);

      expect(result.viewBox).toEqual({ x: 0, y: 0, width: 300, height: 200 });
    });

    it('無効なSVGでエラーを投げる', () => {
      const invalidSVG = '<invalid>not svg</invalid>';
      
      const mockDoc = {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'parsererror') return { textContent: 'Parse error' };
          return null;
        })
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      expect(() => parseSVGContent(invalidSVG)).toThrow();
    });
  });

  describe('isValidSVGFile', () => {
    it('SVGファイルを正しく識別する', () => {
      const svgFile = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      expect(isValidSVGFile(svgFile)).toBe(true);
    });

    it('拡張子でSVGファイルを識別する', () => {
      const svgFile = new File(['<svg></svg>'], 'test.svg', { type: 'text/plain' });
      expect(isValidSVGFile(svgFile)).toBe(true);
    });

    it('非SVGファイルを正しく識別する', () => {
      const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
      expect(isValidSVGFile(textFile)).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('制限内のファイルサイズを許可する', () => {
      const smallFile = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      Object.defineProperty(smallFile, 'size', { value: 1024 }); // 1KB
      expect(isValidFileSize(smallFile, 10)).toBe(true);
    });

    it('制限を超えるファイルサイズを拒否する', () => {
      const largeFile = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      expect(isValidFileSize(largeFile, 10)).toBe(false);
    });
  });

  describe('readSVGFile', () => {
    it('ファイルを正しく読み込む', async () => {
      const svgContent = '<svg width="100" height="100"></svg>';
      const file = new File([svgContent], 'test.svg', { type: 'image/svg+xml' });

      // FileReaderのモック
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: svgContent
      };

      global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

      const promise = readSVGFile(file);
      
      // onloadイベントをシミュレート
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: svgContent } });
        }
      }, 0);

      const result = await promise;
      expect(result).toBe(svgContent);
    });

    it('読み込みエラーを正しく処理する', async () => {
      const file = new File([''], 'test.svg', { type: 'image/svg+xml' });

      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any
      };

      global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

      const promise = readSVGFile(file);
      
      // onerrorイベントをシミュレート
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror(new Error('Read error'));
        }
      }, 0);

      await expect(promise).rejects.toThrow('ファイルの読み込み中にエラーが発生しました');
    });
  });

  describe('optimizeSVGForKonva', () => {
    it('SVGを最適化する', () => {
      const svgContent = '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><rect width="100" height="100"/></svg>';
      
      const mockSVGElement = {
        getAttribute: vi.fn(),
        hasAttribute: vi.fn((attr: string) => attr === 'xmlns:xlink' || attr === 'xml:space'),
        removeAttribute: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([])
      };

      const mockDoc = {
        querySelector: vi.fn(() => mockSVGElement),
        querySelectorAll: vi.fn().mockReturnValue([])
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      global.XMLSerializer = vi.fn().mockImplementation(() => ({
        serializeToString: vi.fn().mockReturnValue('<svg><rect width="100" height="100"/></svg>')
      }));

      const result = optimizeSVGForKonva(svgContent);
      
      expect(mockSVGElement.removeAttribute).toHaveBeenCalledWith('xmlns:xlink');
      expect(mockSVGElement.removeAttribute).toHaveBeenCalledWith('xml:space');
      expect(result).toBeDefined();
    });

    it('最適化に失敗した場合は元のコンテンツを返す', () => {
      const svgContent = '<svg><rect width="100" height="100"/></svg>';
      
      global.DOMParser = vi.fn().mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = optimizeSVGForKonva(svgContent);
      expect(result).toBe(svgContent);
    });
  });

  describe('evaluateSVGComplexity', () => {
    it('シンプルなSVGに低い複雑さスコアを付ける', () => {
      const simpleSVG = '<svg><rect width="100" height="100"/></svg>';
      
      const mockSVGElement = {
        querySelectorAll: vi.fn((selector: string) => {
          if (selector === '*') return [{ tagName: 'rect' }];
          if (selector === 'path') return [];
          if (selector === 'linearGradient, radialGradient, pattern') return [];
          if (selector === 'filter') return [];
          return [];
        })
      };

      const mockDoc = {
        querySelector: vi.fn(() => mockSVGElement)
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const complexity = evaluateSVGComplexity(simpleSVG);
      expect(complexity).toBeLessThan(50);
    });

    it('複雑なSVGに高い複雑さスコアを付ける', () => {
      const complexSVG = '<svg><path d="M10,10 L20,20 C30,30 40,40 50,50"/><linearGradient/><filter/></svg>';
      
      const mockPath = {
        getAttribute: vi.fn(() => 'M10,10 L20,20 C30,30 40,40 50,50')
      };

      const mockSVGElement = {
        querySelectorAll: vi.fn((selector: string) => {
          if (selector === '*') return Array(20).fill({ tagName: 'path' }); // 20個の要素
          if (selector === 'path') return [mockPath];
          if (selector === 'linearGradient, radialGradient, pattern') return [{}];
          if (selector === 'filter') return [{}];
          return [];
        })
      };

      const mockDoc = {
        querySelector: vi.fn(() => mockSVGElement)
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const complexity = evaluateSVGComplexity(complexSVG);
      expect(complexity).toBeGreaterThan(50);
    });
  });

  describe('getSVGRenderingRecommendation', () => {
    it('シンプルなSVGにインライン表示を推奨する', () => {
      const svgData = {
        content: '<svg><rect width="50" height="50"/></svg>',
        width: 50,
        height: 50,
        viewBox: { x: 0, y: 0, width: 50, height: 50 },
        bounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 }
      };

      // evaluateSVGComplexityをモック
      vi.doMock('./svgUtils', async () => {
        const actual = await vi.importActual('./svgUtils');
        return {
          ...actual,
          evaluateSVGComplexity: vi.fn().mockReturnValue(20)
        };
      });

      const recommendation = getSVGRenderingRecommendation(svgData);
      expect(recommendation.method).toBe('inline');
      expect(recommendation.performance).toBe('high');
    });

    it('複雑なSVGに画像表示を推奨する', () => {
      const svgData = {
        content: '<svg><path d="...complex path..."/></svg>',
        width: 2000,
        height: 1500,
        viewBox: { x: 0, y: 0, width: 2000, height: 1500 },
        bounds: { minX: 0, minY: 0, maxX: 2000, maxY: 1500 }
      };

      const recommendation = getSVGRenderingRecommendation(svgData);
      expect(recommendation.method).toBe('image');
      expect(recommendation.performance).toBe('high');
    });
  });

  describe('extractSVGElementInfo', () => {
    it('SVG要素情報を正しく抽出する', () => {
      const svgContent = '<svg><rect/><circle/><animate/></svg>';
      
      const mockElements = [
        { tagName: 'rect', hasAttribute: vi.fn(() => false), getAttribute: vi.fn(() => null) },
        { tagName: 'circle', hasAttribute: vi.fn(() => false), getAttribute: vi.fn(() => null) },
        { tagName: 'animate', hasAttribute: vi.fn(() => false), getAttribute: vi.fn(() => null) }
      ];

      const mockSVGElement = {
        querySelectorAll: vi.fn(() => mockElements)
      };

      const mockDoc = {
        querySelector: vi.fn(() => mockSVGElement)
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const info = extractSVGElementInfo(svgContent);
      
      expect(info.totalElements).toBe(3);
      expect(info.elementTypes.rect).toBe(1);
      expect(info.elementTypes.circle).toBe(1);
      expect(info.elementTypes.animate).toBe(1);
      expect(info.hasAnimations).toBe(true);
    });

    it('インタラクティブ要素を検出する', () => {
      const svgContent = '<svg><rect onclick="alert()"/></svg>';
      
      const mockElement = {
        tagName: 'rect',
        hasAttribute: vi.fn((attr: string) => attr === 'onclick'),
        getAttribute: vi.fn(() => null)
      };

      const mockSVGElement = {
        querySelectorAll: vi.fn(() => [mockElement])
      };

      const mockDoc = {
        querySelector: vi.fn(() => mockSVGElement)
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const info = extractSVGElementInfo(svgContent);
      expect(info.hasInteractivity).toBe(true);
    });

    it('外部参照を検出する', () => {
      const svgContent = '<svg><use href="external.svg#icon"/></svg>';
      
      const mockElement = {
        tagName: 'use',
        hasAttribute: vi.fn(() => false),
        getAttribute: vi.fn((attr: string) => attr === 'href' ? 'external.svg#icon' : null)
      };

      const mockSVGElement = {
        querySelectorAll: vi.fn(() => [mockElement])
      };

      const mockDoc = {
        querySelector: vi.fn(() => mockSVGElement)
      };

      global.DOMParser = vi.fn().mockImplementation(() => ({
        parseFromString: vi.fn().mockReturnValue(mockDoc)
      }));

      const info = extractSVGElementInfo(svgContent);
      expect(info.hasExternalReferences).toBe(true);
    });
  });
});