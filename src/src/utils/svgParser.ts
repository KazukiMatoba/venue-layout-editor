import type { SVGData, ViewBox, BoundingBox } from '../types';

/**
 * SVGファイルの解析とデータ抽出を行うユーティリティ
 */

/**
 * SVGファイルの内容を解析してSVGDataオブジェクトを生成
 */
export const parseSVGFile = async (svgContent: string): Promise<SVGData> => {
  try {
    // SVG文字列の基本的なバリデーション
    if (!svgContent.trim().startsWith('<svg') && !svgContent.includes('<svg')) {
      throw new Error('有効なSVGファイルではありません。');
    }

    // DOMParserを使用してSVGを解析
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    // パースエラーのチェック
    const parserError = svgDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('SVGファイルの構文にエラーがあります。');
    }

    const svgElement = svgDoc.querySelector('svg');
    if (!svgElement) {
      throw new Error('SVG要素が見つかりません。');
    }

    // SVGの寸法を取得
    const { width, height } = extractSVGDimensions(svgElement);
    
    // ViewBoxを取得
    const viewBox = extractViewBox(svgElement, width, height);
    
    // BoundingBoxを計算
    const bounds = calculateBoundingBox(svgElement, viewBox);

    return {
      content: svgContent,
      width,
      height,
      viewBox,
      bounds
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('SVGファイルの解析中に予期しないエラーが発生しました。');
  }
};

/**
 * SVG要素から寸法を抽出
 */
const extractSVGDimensions = (svgElement: SVGSVGElement): { width: number; height: number } => {
  let width = 0;
  let height = 0;

  // width属性とheight属性を取得
  const widthAttr = svgElement.getAttribute('width');
  const heightAttr = svgElement.getAttribute('height');

  if (widthAttr && heightAttr) {
    width = parseFloat(widthAttr.replace(/[^\d.-]/g, '')) || 0;
    height = parseFloat(heightAttr.replace(/[^\d.-]/g, '')) || 0;
  }

  // width/heightが取得できない場合はviewBoxから推定
  if (width === 0 || height === 0) {
    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
      const viewBoxValues = viewBoxAttr.split(/\s+|,/).map(v => parseFloat(v));
      if (viewBoxValues.length >= 4) {
        width = width || viewBoxValues[2];
        height = height || viewBoxValues[3];
      }
    }
  }

  // デフォルト値を設定（最小サイズ）
  if (width === 0) width = 100;
  if (height === 0) height = 100;

  return { width, height };
};

/**
 * ViewBoxを抽出
 */
const extractViewBox = (svgElement: SVGSVGElement, defaultWidth: number, defaultHeight: number): ViewBox => {
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  
  if (viewBoxAttr) {
    const values = viewBoxAttr.split(/\s+|,/).map(v => parseFloat(v));
    if (values.length >= 4 && values.every(v => !isNaN(v))) {
      return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3]
      };
    }
  }

  // viewBoxが無い場合はデフォルト値を使用
  return {
    x: 0,
    y: 0,
    width: defaultWidth,
    height: defaultHeight
  };
};

/**
 * BoundingBoxを計算
 */
const calculateBoundingBox = (svgElement: SVGSVGElement, viewBox: ViewBox): BoundingBox => {
  try {
    // 一時的にDOMに追加してBBoxを取得
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.visibility = 'hidden';
    
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    tempContainer.appendChild(clonedSvg);
    document.body.appendChild(tempContainer);

    let bounds: BoundingBox;

    try {
      // SVG要素のBBoxを取得
      const bbox = clonedSvg.getBBox();
      bounds = {
        minX: bbox.x,
        minY: bbox.y,
        maxX: bbox.x + bbox.width,
        maxY: bbox.y + bbox.height
      };
    } catch {
      // getBBox()が失敗した場合はviewBoxを使用
      bounds = {
        minX: viewBox.x,
        minY: viewBox.y,
        maxX: viewBox.x + viewBox.width,
        maxY: viewBox.y + viewBox.height
      };
    } finally {
      // 一時的な要素を削除
      document.body.removeChild(tempContainer);
    }

    return bounds;
  } catch {
    // エラーが発生した場合はviewBoxベースのboundsを返す
    return {
      minX: viewBox.x,
      minY: viewBox.y,
      maxX: viewBox.x + viewBox.width,
      maxY: viewBox.y + viewBox.height
    };
  }
};

/**
 * SVGの複雑さを評価（パフォーマンス制限用）
 */
export const evaluateSVGComplexity = (svgContent: string): { 
  elementCount: number; 
  isComplex: boolean; 
  warnings: string[] 
} => {
  const warnings: string[] = [];
  
  // 要素数をカウント
  const elementMatches = svgContent.match(/<[^/][^>]*>/g) || [];
  const elementCount = elementMatches.length;
  
  // 複雑さの判定
  let isComplex = false;
  
  if (elementCount > 1000) {
    isComplex = true;
    warnings.push('SVGファイルが非常に複雑です。パフォーマンスに影響する可能性があります。');
  }
  
  if (svgContent.length > 1024 * 1024) { // 1MB
    isComplex = true;
    warnings.push('SVGファイルサイズが大きいです。読み込みに時間がかかる可能性があります。');
  }
  
  // 特定の複雑な要素をチェック
  const complexElements = ['filter', 'mask', 'clipPath', 'pattern'];
  const hasComplexElements = complexElements.some(element => 
    svgContent.includes(`<${element}`)
  );
  
  if (hasComplexElements) {
    warnings.push('SVGに複雑な視覚効果が含まれています。表示に時間がかかる場合があります。');
  }
  
  return { elementCount, isComplex, warnings };
};