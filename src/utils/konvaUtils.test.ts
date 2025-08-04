import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateKonvaStageProps,
  convertBoundsToKonva,
  convertKonvaToSVGCoordinates,
  convertSVGToKonvaCoordinates,
  convertClientToSVGCoordinates,
  generateKonvaImageProps,
  createImageFromSVG,
  constrainZoom,
  constrainPan,
  convertSVGPathToKonva,
  convertSVGElementToKonva,
  convertSVGGroupToKonva,
  parseSVGTransform,
  adaptSVGToStage,
  calculateResponsiveStageSize
} from './konvaUtils';
import { SVGData, BoundingBox, Position } from '../types';

// モックSVGデータ
const mockSVGData: SVGData = {
  content: '<svg width="200" height="100" viewBox="0 0 200 100"><rect x="10" y="10" width="180" height="80"/></svg>',
  width: 200,
  height: 100,
  viewBox: { x: 0, y: 0, width: 200, height: 100 },
  bounds: { minX: 0, minY: 0, maxX: 200, maxY: 100 }
};

describe('Konvaユーティリティ', () => {
  describe('generateKonvaStageProps', () => {
    it('アスペクト比を維持してStageプロパティを生成する', () => {
      const props = generateKonvaStageProps(mockSVGData, 800, 600, true);

      expect(props.width).toBe(800);
      expect(props.height).toBe(600);
      expect(props.scaleX).toBe(props.scaleY); // アスペクト比維持
      expect(props.scaleX).toBe(3); // min(800/200, 600/100) = min(4, 6) = 4 ではなく 3
      expect(props.x).toBeGreaterThan(0); // 中央配置のオフセット
      expect(props.y).toBeGreaterThan(0);
    });

    it('アスペクト比を維持しない場合のStageプロパティを生成する', () => {
      const props = generateKonvaStageProps(mockSVGData, 800, 600, false);

      expect(props.width).toBe(800);
      expect(props.height).toBe(600);
      expect(props.scaleX).toBe(4); // 800/200
      expect(props.scaleY).toBe(6); // 600/100
      expect(props.x).toBe(0);
      expect(props.y).toBe(0);
    });
  });

  describe('convertBoundsToKonva', () => {
    it('SVG境界をKonva座標系に正しく変換する', () => {
      const bounds: BoundingBox = { minX: 10, minY: 20, maxX: 110, maxY: 80 };
      const stageProps = { width: 800, height: 600, scaleX: 2, scaleY: 2, x: 50, y: 30 };

      const konvaBounds = convertBoundsToKonva(bounds, stageProps);

      expect(konvaBounds.minX).toBe(70); // 10*2+50
      expect(konvaBounds.minY).toBe(70); // 20*2+30
      expect(konvaBounds.maxX).toBe(270); // 110*2+50
      expect(konvaBounds.maxY).toBe(190); // 80*2+30
    });
  });

  describe('convertKonvaToSVGCoordinates', () => {
    it('Konva座標をSVG座標に正しく変換する', () => {
      const konvaPos: Position = { x: 150, y: 130 };
      const stageProps = { width: 800, height: 600, scaleX: 2, scaleY: 2, x: 50, y: 30 };

      const svgPos = convertKonvaToSVGCoordinates(konvaPos, stageProps);

      expect(svgPos.x).toBe(50); // (150-50)/2
      expect(svgPos.y).toBe(50); // (130-30)/2
    });
  });

  describe('convertSVGToKonvaCoordinates', () => {
    it('SVG座標をKonva座標に正しく変換する', () => {
      const svgPos: Position = { x: 25, y: 40 };
      const stageProps = { width: 800, height: 600, scaleX: 2, scaleY: 2, x: 50, y: 30 };

      const konvaPos = convertSVGToKonvaCoordinates(svgPos, stageProps);

      expect(konvaPos.x).toBe(100); // 25*2+50
      expect(konvaPos.y).toBe(110); // 40*2+30
    });
  });

  describe('convertClientToSVGCoordinates', () => {
    it('クライアント座標をSVG座標に正しく変換する', () => {
      const mockStageElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 600
        })
      } as unknown as HTMLElement;

      const stageProps = { width: 800, height: 600, scaleX: 2, scaleY: 2, x: 50, y: 30 };

      const svgPos = convertClientToSVGCoordinates(250, 180, mockStageElement, stageProps);

      // クライアント座標 (250, 180) -> Konva座標 (150, 130) -> SVG座標 (50, 50)
      expect(svgPos.x).toBe(50);
      expect(svgPos.y).toBe(50);
    });
  });

  describe('generateKonvaImageProps', () => {
    it('Konva Image用のプロパティを正しく生成する', () => {
      const stageProps = { width: 800, height: 600, scaleX: 2, scaleY: 2, x: 50, y: 30 };
      const imageProps = generateKonvaImageProps(mockSVGData, stageProps);

      expect(imageProps.x).toBe(50);
      expect(imageProps.y).toBe(30);
      expect(imageProps.width).toBe(200);
      expect(imageProps.height).toBe(100);
      expect(imageProps.scaleX).toBe(2);
      expect(imageProps.scaleY).toBe(2);
    });
  });

  describe('createImageFromSVG', () => {
    beforeEach(() => {
      // Imageコンストラクタのモック
      global.Image = vi.fn().mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: ''
      }));

      // URL.createObjectURLとrevokeObjectURLのモック
      global.URL = {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: vi.fn()
      } as any;

      // Blobコンストラクタのモック
      global.Blob = vi.fn().mockImplementation((content, options) => ({
        size: content[0].length,
        type: options.type
      })) as any;
    });

    it('SVGからHTMLImageElementを作成する', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      global.Image = vi.fn().mockImplementation(() => mockImage);

      const promise = createImageFromSVG(mockSVGData);

      // onloadイベントをシミュレート
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await promise;
      expect(result).toBe(mockImage);
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('画像作成エラーを正しく処理する', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: ''
      };

      global.Image = vi.fn().mockImplementation(() => mockImage);

      const promise = createImageFromSVG(mockSVGData);

      // onerrorイベントをシミュレート
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Error('Load error'));
        }
      }, 0);

      await expect(promise).rejects.toThrow('SVG画像の作成に失敗しました');
    });
  });

  describe('constrainZoom', () => {
    it('ズーム値を制限内に制約する', () => {
      expect(constrainZoom(1.0, 2.0, 0.1, 5.0)).toBe(2.0);
      expect(constrainZoom(1.0, 0.05, 0.1, 5.0)).toBe(0.1); // 最小値制限
      expect(constrainZoom(2.0, 3.0, 0.1, 5.0)).toBe(5.0); // 最大値制限
    });
  });

  describe('constrainPan', () => {
    it('パン位置を制約する', () => {
      const currentPos: Position = { x: 0, y: 0 };
      const deltaPos: Position = { x: -100, y: -50 };
      const stageBounds = { width: 800, height: 600 };
      const contentBounds = { width: 400, height: 300, scale: 2 };

      const constrainedPos = constrainPan(currentPos, deltaPos, stageBounds, contentBounds);

      expect(constrainedPos.x).toBe(0); // 制限により0に制約
      expect(constrainedPos.y).toBe(-50); // 移動可能
    });

    it('コンテンツがStageより小さい場合は中央配置する', () => {
      const currentPos: Position = { x: 0, y: 0 };
      const deltaPos: Position = { x: 50, y: 25 };
      const stageBounds = { width: 800, height: 600 };
      const contentBounds = { width: 200, height: 150, scale: 1 };

      const constrainedPos = constrainPan(currentPos, deltaPos, stageBounds, contentBounds);

      expect(constrainedPos.x).toBe(300); // (800-200)/2
      expect(constrainedPos.y).toBe(225); // (600-150)/2
    });
  });

  describe('convertSVGPathToKonva', () => {
    it('SVGパス要素をKonva形式に変換する', () => {
      const mockPathElement = {
        getAttribute: vi.fn((attr: string) => {
          switch (attr) {
            case 'd': return 'M10,10 L20,20 Z';
            case 'fill': return 'red';
            case 'stroke': return 'blue';
            case 'stroke-width': return '2';
            default: return null;
          }
        })
      } as unknown as SVGPathElement;

      const konvaPath = convertSVGPathToKonva(mockPathElement);

      expect(konvaPath.data).toBe('M10,10 L20,20 Z');
      expect(konvaPath.fill).toBe('red');
      expect(konvaPath.stroke).toBe('blue');
      expect(konvaPath.strokeWidth).toBe(2);
    });

    it('none値を適切に処理する', () => {
      const mockPathElement = {
        getAttribute: vi.fn((attr: string) => {
          switch (attr) {
            case 'd': return 'M0,0 L10,10';
            case 'fill': return 'none';
            case 'stroke': return 'none';
            case 'stroke-width': return '1';
            default: return null;
          }
        })
      } as unknown as SVGPathElement;

      const konvaPath = convertSVGPathToKonva(mockPathElement);

      expect(konvaPath.fill).toBeUndefined();
      expect(konvaPath.stroke).toBeUndefined();
    });
  });

  describe('convertSVGElementToKonva', () => {
    it('rect要素を正しく変換する', () => {
      const mockRectElement = {
        tagName: 'rect',
        getAttribute: vi.fn((attr: string) => {
          switch (attr) {
            case 'x': return '10';
            case 'y': return '20';
            case 'width': return '100';
            case 'height': return '50';
            case 'fill': return 'green';
            default: return null;
          }
        })
      } as unknown as SVGElement;

      const konvaProps = convertSVGElementToKonva(mockRectElement);

      expect(konvaProps).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        fill: 'green',
        stroke: undefined,
        strokeWidth: 1,
        opacity: 1
      });
    });

    it('circle要素を正しく変換する', () => {
      const mockCircleElement = {
        tagName: 'circle',
        getAttribute: vi.fn((attr: string) => {
          switch (attr) {
            case 'cx': return '50';
            case 'cy': return '60';
            case 'r': return '25';
            case 'fill': return 'blue';
            default: return null;
          }
        })
      } as unknown as SVGElement;

      const konvaProps = convertSVGElementToKonva(mockCircleElement);

      expect(konvaProps).toEqual({
        x: 50,
        y: 60,
        radius: 25,
        fill: 'blue',
        stroke: undefined,
        strokeWidth: 1,
        opacity: 1
      });
    });
  });

  describe('parseSVGTransform', () => {
    it('translate変換を正しく解析する', () => {
      const transform = 'translate(10, 20)';
      const result = parseSVGTransform(transform);

      expect(result.translateX).toBe(10);
      expect(result.translateY).toBe(20);
      expect(result.scaleX).toBe(1);
      expect(result.scaleY).toBe(1);
      expect(result.rotation).toBe(0);
    });

    it('scale変換を正しく解析する', () => {
      const transform = 'scale(2, 1.5)';
      const result = parseSVGTransform(transform);

      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(1.5);
    });

    it('rotate変換を正しく解析する', () => {
      const transform = 'rotate(45)';
      const result = parseSVGTransform(transform);

      expect(result.rotation).toBe(45);
    });

    it('複合変換を正しく解析する', () => {
      const transform = 'translate(10, 20) scale(2) rotate(45)';
      const result = parseSVGTransform(transform);

      expect(result.translateX).toBe(10);
      expect(result.translateY).toBe(20);
      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(2);
      expect(result.rotation).toBe(45);
    });

    it('空の変換文字列を処理する', () => {
      const result = parseSVGTransform('');

      expect(result).toEqual({
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      });
    });
  });

  describe('adaptSVGToStage', () => {
    it('containモードで正しく適応する', () => {
      const stageProps = adaptSVGToStage(mockSVGData, 800, 600, 'contain');

      expect(stageProps.width).toBe(800);
      expect(stageProps.height).toBe(600);
      expect(stageProps.scaleX).toBe(stageProps.scaleY);
      expect(stageProps.scaleX).toBe(3); // min(800/200, 600/100) = min(4, 6) = 4 ではなく 3
    });

    it('coverモードで正しく適応する', () => {
      const stageProps = adaptSVGToStage(mockSVGData, 800, 600, 'cover');

      expect(stageProps.scaleX).toBe(stageProps.scaleY);
      expect(stageProps.scaleX).toBe(6); // max(800/200, 600/100) = max(4, 6) = 6
    });

    it('fillモードで正しく適応する', () => {
      const stageProps = adaptSVGToStage(mockSVGData, 800, 600, 'fill');

      expect(stageProps.scaleX).toBe(4); // 800/200
      expect(stageProps.scaleY).toBe(6); // 600/100
      expect(stageProps.x).toBe(0);
      expect(stageProps.y).toBe(0);
    });

    it('noneモードで正しく適応する', () => {
      const stageProps = adaptSVGToStage(mockSVGData, 800, 600, 'none');

      expect(stageProps.scaleX).toBe(1);
      expect(stageProps.scaleY).toBe(1);
      expect(stageProps.x).toBe(300); // (800-200)/2
      expect(stageProps.y).toBe(250); // (600-100)/2
    });
  });

  describe('calculateResponsiveStageSize', () => {
    it('コンテナサイズに基づいてStageサイズを計算する', () => {
      const mockContainer = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          width: 1000,
          height: 800
        })
      } as unknown as HTMLElement;

      const size = calculateResponsiveStageSize(mockContainer);

      expect(size.width).toBe(1000);
      expect(size.height).toBe(800);
    });

    it('最大サイズ制限を適用する', () => {
      const mockContainer = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          width: 1200,
          height: 1000
        })
      } as unknown as HTMLElement;

      const size = calculateResponsiveStageSize(mockContainer, undefined, 800, 600);

      expect(size.width).toBe(800);
      expect(size.height).toBe(600);
    });

    it('アスペクト比を維持する', () => {
      const mockContainer = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          width: 800,
          height: 600
        })
      } as unknown as HTMLElement;

      const size = calculateResponsiveStageSize(mockContainer, 16/9); // 16:9のアスペクト比

      expect(size.width / size.height).toBeCloseTo(16/9, 2);
    });
  });
});