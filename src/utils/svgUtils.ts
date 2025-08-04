import { SVGData, ViewBox, BoundingBox, SVGLoadError } from '../types';

/**
 * SVGファイルの内容を解析してSVGDataオブジェクトを作成する
 * @param svgContent SVGファイルの文字列内容
 * @returns 解析されたSVGData
 * @throws SVGLoadError 解析に失敗した場合
 */
export const parseSVGContent = (svgContent: string): SVGData => {
  try {
    // DOMParserを使用してSVGを解析
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    // パースエラーをチェック
    const parserError = svgDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('SVGの解析に失敗しました: 無効なSVG形式です');
    }

    const svgElement = svgDoc.querySelector('svg');
    if (!svgElement) {
      throw new Error('有効なSVG要素が見つかりません');
    }

    // SVGの寸法を取得
    const width = getSVGDimension(svgElement, 'width');
    const height = getSVGDimension(svgElement, 'height');

    // ViewBoxを取得
    const viewBox = extractViewBox(svgElement, width, height);

    // 境界を計算
    const bounds = calculateBounds(viewBox);

    return {
      content: svgContent,
      width,
      height,
      viewBox,
      bounds
    };
  } catch (error) {
    const svgError: SVGLoadError = {
      type: 'parse',
      message: 'SVGの解析に失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    };
    throw svgError;
  }
};

/**
 * SVG要素から寸法を取得する
 * @param svgElement SVG要素
 * @param dimension 'width' または 'height'
 * @returns 寸法値（ピクセル）
 */
const getSVGDimension = (svgElement: SVGSVGElement, dimension: 'width' | 'height'): number => {
  const attr = svgElement.getAttribute(dimension);
  
  if (attr) {
    // 単位を除去して数値を取得
    const numericValue = parseFloat(attr.replace(/[^\d.-]/g, ''));
    if (!isNaN(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  // 属性がない場合はviewBoxから取得を試行
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  if (viewBoxAttr) {
    const viewBoxValues = viewBoxAttr.split(/\s+/).map(Number);
    if (viewBoxValues.length === 4) {
      return dimension === 'width' ? viewBoxValues[2] : viewBoxValues[3];
    }
  }

  // デフォルト値
  return dimension === 'width' ? 300 : 150;
};

/**
 * SVG要素からViewBoxを抽出する
 * @param svgElement SVG要素
 * @param defaultWidth デフォルト幅
 * @param defaultHeight デフォルト高さ
 * @returns ViewBoxオブジェクト
 */
const extractViewBox = (svgElement: SVGSVGElement, defaultWidth: number, defaultHeight: number): ViewBox => {
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  
  if (viewBoxAttr) {
    const values = viewBoxAttr.split(/\s+/).map(Number);
    if (values.length === 4 && values.every(v => !isNaN(v))) {
      return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3]
      };
    }
  }

  // viewBoxがない場合は寸法から作成
  return {
    x: 0,
    y: 0,
    width: defaultWidth,
    height: defaultHeight
  };
};

/**
 * ViewBoxから境界を計算する
 * @param viewBox ViewBoxオブジェクト
 * @returns BoundingBoxオブジェクト
 */
const calculateBounds = (viewBox: ViewBox): BoundingBox => {
  return {
    minX: viewBox.x,
    minY: viewBox.y,
    maxX: viewBox.x + viewBox.width,
    maxY: viewBox.y + viewBox.height
  };
};

/**
 * SVG要素から詳細な境界情報を計算する
 * @param svgElement SVG要素
 * @returns 詳細な境界情報
 */
export const calculateDetailedBounds = (svgElement: SVGSVGElement): BoundingBox => {
  try {
    // getBBoxを使用して実際のコンテンツ境界を取得
    const bbox = svgElement.getBBox();
    return {
      minX: bbox.x,
      minY: bbox.y,
      maxX: bbox.x + bbox.width,
      maxY: bbox.y + bbox.height
    };
  } catch (error) {
    // getBBoxが失敗した場合はviewBoxから計算
    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
      const values = viewBoxAttr.split(/\s+/).map(Number);
      if (values.length === 4) {
        return {
          minX: values[0],
          minY: values[1],
          maxX: values[0] + values[2],
          maxY: values[1] + values[3]
        };
      }
    }
    
    // フォールバック: 要素の寸法から計算
    const width = getSVGDimension(svgElement, 'width');
    const height = getSVGDimension(svgElement, 'height');
    return {
      minX: 0,
      minY: 0,
      maxX: width,
      maxY: height
    };
  }
};

/**
 * ファイルがSVG形式かどうかをチェックする
 * @param file ファイルオブジェクト
 * @returns SVGファイルの場合true
 */
export const isValidSVGFile = (file: File): boolean => {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
};

/**
 * ファイルサイズが制限内かどうかをチェックする
 * @param file ファイルオブジェクト
 * @param maxSizeMB 最大サイズ（MB）
 * @returns サイズが制限内の場合true
 */
export const isValidFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * SVGファイルを読み込んで文字列として取得する
 * @param file SVGファイル
 * @returns Promise<string> ファイル内容
 */
export const readSVGFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込み中にエラーが発生しました'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * SVGコンテンツを最適化してKonvaレンダリング用に準備する
 * @param svgContent 元のSVGコンテンツ
 * @returns 最適化されたSVGコンテンツ
 */
export const optimizeSVGForKonva = (svgContent: string): string => {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
      return svgContent;
    }

    // Konvaでの表示に不要な属性を削除
    const attributesToRemove = ['xmlns:xlink', 'xml:space'];
    attributesToRemove.forEach(attr => {
      if (svgElement.hasAttribute(attr)) {
        svgElement.removeAttribute(attr);
      }
    });

    // 相対的なパスを絶対パスに変換（必要に応じて）
    const useElements = svgElement.querySelectorAll('use');
    useElements.forEach(useEl => {
      const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
      if (href && href.startsWith('#')) {
        // 内部参照は保持
        useEl.setAttribute('href', href);
      }
    });

    return new XMLSerializer().serializeToString(svgDoc);
  } catch (error) {
    // 最適化に失敗した場合は元のコンテンツを返す
    return svgContent;
  }
};

/**
 * SVGの複雑さを評価する
 * @param svgContent SVGコンテンツ
 * @returns 複雑さスコア（0-100）
 */
export const evaluateSVGComplexity = (svgContent: string): number => {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
      return 0;
    }

    let complexity = 0;
    
    // 要素数による複雑さ
    const allElements = svgElement.querySelectorAll('*');
    complexity += Math.min(allElements.length * 2, 40);
    
    // パス要素の複雑さ
    const pathElements = svgElement.querySelectorAll('path');
    pathElements.forEach(path => {
      const d = path.getAttribute('d');
      if (d) {
        // パスコマンドの数で複雑さを判定
        const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz]/g);
        complexity += Math.min((commands?.length || 0) * 0.5, 20);
      }
    });
    
    // グラデーションやパターンの複雑さ
    const gradients = svgElement.querySelectorAll('linearGradient, radialGradient, pattern');
    complexity += gradients.length * 5;
    
    // フィルターの複雑さ
    const filters = svgElement.querySelectorAll('filter');
    complexity += filters.length * 10;
    
    return Math.min(complexity, 100);
  } catch (error) {
    return 50; // エラーの場合は中程度の複雑さとして扱う
  }
};

/**
 * SVGの推奨レンダリング方法を決定する
 * @param svgData SVGデータ
 * @returns レンダリング方法の推奨事項
 */
export interface SVGRenderingRecommendation {
  method: 'image' | 'inline' | 'canvas';
  reason: string;
  performance: 'high' | 'medium' | 'low';
}

export const getSVGRenderingRecommendation = (svgData: SVGData): SVGRenderingRecommendation => {
  const complexity = evaluateSVGComplexity(svgData.content);
  const size = svgData.width * svgData.height;
  
  // 大きくて複雑なSVGはImageとして扱う
  if (complexity > 70 || size > 1000000) {
    return {
      method: 'image',
      reason: '高い複雑さまたは大きなサイズのため、画像として最適化',
      performance: 'high'
    };
  }
  
  // 中程度の複雑さはCanvasレンダリング
  if (complexity > 30 || size > 100000) {
    return {
      method: 'canvas',
      reason: '中程度の複雑さのため、Canvasレンダリングが適切',
      performance: 'medium'
    };
  }
  
  // シンプルなSVGはインライン表示
  return {
    method: 'inline',
    reason: 'シンプルなSVGのため、インライン表示が最適',
    performance: 'high'
  };
};

/**
 * SVGの要素情報を抽出する
 * @param svgContent SVGコンテンツ
 * @returns SVG要素の詳細情報
 */
export interface SVGElementInfo {
  totalElements: number;
  elementTypes: Record<string, number>;
  hasAnimations: boolean;
  hasInteractivity: boolean;
  hasExternalReferences: boolean;
}

export const extractSVGElementInfo = (svgContent: string): SVGElementInfo => {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
      return {
        totalElements: 0,
        elementTypes: {},
        hasAnimations: false,
        hasInteractivity: false,
        hasExternalReferences: false
      };
    }

    const allElements = svgElement.querySelectorAll('*');
    const elementTypes: Record<string, number> = {};
    let hasAnimations = false;
    let hasInteractivity = false;
    let hasExternalReferences = false;

    allElements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      elementTypes[tagName] = (elementTypes[tagName] || 0) + 1;
      
      // アニメーション要素をチェック
      if (['animate', 'animateTransform', 'animateMotion', 'set'].includes(tagName)) {
        hasAnimations = true;
      }
      
      // インタラクティブ要素をチェック
      if (element.hasAttribute('onclick') || element.hasAttribute('onmouseover')) {
        hasInteractivity = true;
      }
      
      // 外部参照をチェック
      const href = element.getAttribute('href') || element.getAttribute('xlink:href');
      if (href && !href.startsWith('#')) {
        hasExternalReferences = true;
      }
    });

    return {
      totalElements: allElements.length,
      elementTypes,
      hasAnimations,
      hasInteractivity,
      hasExternalReferences
    };
  } catch (error) {
    return {
      totalElements: 0,
      elementTypes: {},
      hasAnimations: false,
      hasInteractivity: false,
      hasExternalReferences: false
    };
  }
};