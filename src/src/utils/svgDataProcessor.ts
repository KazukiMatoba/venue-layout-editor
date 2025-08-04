import type { SVGData, BoundingBox, Position, ViewBox, SVGLoadError, SVGProcessingResult } from '../types';
import { parseSVGContent, optimizeSVGForKonva, getSVGRenderingRecommendation } from './svgUtils';
import { generateKonvaStageProps, adaptSVGToStage, createImageFromSVG, type KonvaStageProps } from './konvaUtils';
import { mmToPx, pxToMm } from './scaleUtils';

/**
 * SVGデータ処理の統合ユーティリティ
 * SVG読み込みからKonva表示までの一連の処理を統合
 */

/**
 * SVG処理オプション
 */
export interface SVGProcessingOptions {
  /** 最適化を有効にするか */
  optimize?: boolean;
  /** 1px=1mmスケールを適用するか */
  applyMmScale?: boolean;
  /** 最大ファイルサイズ（MB） */
  maxFileSizeMB?: number;
  /** 最大寸法（px） */
  maxDimensions?: { width: number; height: number };
}

/**
 * 処理されたSVGデータ
 */
export interface ProcessedSVGData extends SVGData {
  /** 最適化されたコンテンツ */
  optimizedContent: string;
  /** レンダリング推奨事項 */
  renderingRecommendation: ReturnType<typeof getSVGRenderingRecommendation>;
  /** HTMLImageElement（必要に応じて） */
  imageElement?: HTMLImageElement;
  /** 処理メタデータ */
  processingMetadata: {
    originalSize: number;
    optimizedSize: number;
    processingTime: number;
    appliedOptimizations: string[];
  };
}

/**
 * SVGファイルを読み込んで処理する
 * @param file SVGファイル
 * @param options 処理オプション
 * @returns Promise<ProcessedSVGData>
 */
export const processSVGFile = async (
  file: File,
  options: SVGProcessingOptions = {}
): Promise<ProcessedSVGData> => {
  const startTime = performance.now();
  const appliedOptimizations: string[] = [];

  // デフォルトオプション
  const {
    optimize = true,
    applyMmScale = true,
    maxFileSizeMB = 10,
    maxDimensions = { width: 5000, height: 5000 }
  } = options;

  // ファイルサイズチェック
  if (file.size > maxFileSizeMB * 1024 * 1024) {
    throw new Error(`ファイルサイズが制限（${maxFileSizeMB}MB）を超えています`);
  }

  // ファイル読み込み
  const content = await readFileAsText(file);
  const originalSize = content.length;

  // SVG解析
  let svgData = parseSVGContent(content);

  // 寸法チェック
  if (svgData.width > maxDimensions.width || svgData.height > maxDimensions.height) {
    throw new Error(`SVGの寸法が制限（${maxDimensions.width}x${maxDimensions.height}px）を超えています`);
  }

  // 1px=1mmスケール適用
  if (applyMmScale) {
    svgData = applyMillimeterScale(svgData);
    appliedOptimizations.push('millimeter-scale');
  }

  // 最適化
  let optimizedContent = content;
  if (optimize) {
    optimizedContent = optimizeSVGForKonva(content);
    appliedOptimizations.push('konva-optimization');
  }

  // レンダリング推奨事項を取得
  const renderingRecommendation = getSVGRenderingRecommendation(svgData);

  // 必要に応じてImageElementを作成
  let imageElement: HTMLImageElement | undefined;
  if (renderingRecommendation.method === 'image') {
    try {
      imageElement = await createImageFromSVG(svgData);
      appliedOptimizations.push('image-element-creation');
    } catch (error) {
      console.warn('ImageElement作成に失敗しました:', error);
    }
  }

  const processingTime = performance.now() - startTime;
  const optimizedSize = optimizedContent.length;

  return {
    ...svgData,
    content: optimizedContent,
    optimizedContent,
    renderingRecommendation,
    imageElement,
    processingMetadata: {
      originalSize,
      optimizedSize,
      processingTime,
      appliedOptimizations
    }
  };
};

/**
 * SVGデータをKonva表示用に準備する
 * @param svgData 処理されたSVGデータ
 * @param containerWidth コンテナ幅
 * @param containerHeight コンテナ高さ
 * @param fitMode フィットモード
 * @returns Konva表示用の設定
 */
export interface KonvaDisplayConfig {
  stageProps: ReturnType<typeof generateKonvaStageProps>;
  imageProps: ReturnType<typeof generateKonvaStageProps>;
  svgBounds: BoundingBox;
  scaleFactor: number;
  displayMode: 'image' | 'svg' | 'canvas';
}

export const prepareForKonvaDisplay = (
  svgData: ProcessedSVGData,
  containerWidth: number,
  containerHeight: number,
  fitMode: 'contain' | 'cover' | 'fill' | 'none' = 'contain'
): KonvaDisplayConfig => {
  // Stage設定を生成
  const stageProps = adaptSVGToStage(svgData, containerWidth, containerHeight, fitMode);
  
  // Image表示用の設定も生成
  const imageProps = generateKonvaStageProps(svgData, containerWidth, containerHeight, true);
  
  // SVG境界をKonva座標系に変換
  const svgBounds: BoundingBox = {
    minX: svgData.bounds.minX * stageProps.scaleX + stageProps.x,
    minY: svgData.bounds.minY * stageProps.scaleY + stageProps.y,
    maxX: svgData.bounds.maxX * stageProps.scaleX + stageProps.x,
    maxY: svgData.bounds.maxY * stageProps.scaleY + stageProps.y
  };

  // スケールファクター
  const scaleFactor = Math.min(stageProps.scaleX, stageProps.scaleY);

  // 表示モード決定
  let displayMode: 'image' | 'svg' | 'canvas' = 'svg';
  if (svgData.renderingRecommendation.method === 'image' && svgData.imageElement) {
    displayMode = 'image';
  } else if (svgData.renderingRecommendation.method === 'canvas') {
    displayMode = 'canvas';
  }

  return {
    stageProps,
    imageProps,
    svgBounds,
    scaleFactor,
    displayMode
  };
};

/**
 * SVG座標とミリメートル座標の変換ユーティリティ
 */
export class SVGCoordinateConverter {
  private svgData: SVGData;
  private stageProps: ReturnType<typeof generateKonvaStageProps>;

  constructor(svgData: SVGData, stageProps: ReturnType<typeof generateKonvaStageProps>) {
    this.svgData = svgData;
    this.stageProps = stageProps;
  }

  /**
   * SVG座標をミリメートル座標に変換
   */
  svgToMm(position: Position): Position {
    return {
      x: pxToMm(position.x),
      y: pxToMm(position.y)
    };
  }

  /**
   * ミリメートル座標をSVG座標に変換
   */
  mmToSvg(position: Position): Position {
    return {
      x: mmToPx(position.x),
      y: mmToPx(position.y)
    };
  }

  /**
   * Konva座標をミリメートル座標に変換
   */
  konvaToMm(position: Position): Position {
    const svgPos = this.konvaToSvg(position);
    return this.svgToMm(svgPos);
  }

  /**
   * ミリメートル座標をKonva座標に変換
   */
  mmToKonva(position: Position): Position {
    const svgPos = this.mmToSvg(position);
    return this.svgToKonva(svgPos);
  }

  /**
   * Konva座標をSVG座標に変換
   */
  konvaToSvg(position: Position): Position {
    return {
      x: (position.x - this.stageProps.x) / this.stageProps.scaleX,
      y: (position.y - this.stageProps.y) / this.stageProps.scaleY
    };
  }

  /**
   * SVG座標をKonva座標に変換
   */
  svgToKonva(position: Position): Position {
    return {
      x: position.x * this.stageProps.scaleX + this.stageProps.x,
      y: position.y * this.stageProps.scaleY + this.stageProps.y
    };
  }

  /**
   * 寸法をスケール変換
   */
  scaleDimensions(width: number, height: number, fromScale: number, toScale: number): { width: number; height: number } {
    const factor = toScale / fromScale;
    return {
      width: width * factor,
      height: height * factor
    };
  }
}

/**
 * SVGデータの品質評価
 */
export interface SVGQualityAssessment {
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  performance: 'excellent' | 'good' | 'fair' | 'poor';
}

export const assessSVGQuality = (svgData: ProcessedSVGData): SVGQualityAssessment => {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // ファイルサイズ評価
  const sizeMB = svgData.processingMetadata.originalSize / (1024 * 1024);
  if (sizeMB > 5) {
    score -= 20;
    issues.push('ファイルサイズが大きすぎます');
    recommendations.push('SVGを最適化してファイルサイズを削減してください');
  } else if (sizeMB > 2) {
    score -= 10;
    issues.push('ファイルサイズがやや大きいです');
  }

  // 寸法評価
  const area = svgData.width * svgData.height;
  if (area > 2000000) { // 2M pixels
    score -= 15;
    issues.push('SVGの寸法が大きすぎます');
    recommendations.push('SVGの寸法を適切なサイズに調整してください');
  }

  // レンダリング性能評価
  if (svgData.renderingRecommendation.performance === 'low') {
    score -= 25;
    issues.push('レンダリング性能が低いです');
    recommendations.push(svgData.renderingRecommendation.reason);
  } else if (svgData.renderingRecommendation.performance === 'medium') {
    score -= 10;
    issues.push('レンダリング性能が中程度です');
  }

  // 最適化効果評価
  const optimizationRatio = svgData.processingMetadata.optimizedSize / svgData.processingMetadata.originalSize;
  if (optimizationRatio > 0.9) {
    score -= 5;
    issues.push('最適化効果が限定的です');
  }

  // 処理時間評価
  if (svgData.processingMetadata.processingTime > 1000) {
    score -= 10;
    issues.push('処理時間が長すぎます');
    recommendations.push('SVGの複雑さを減らすことを検討してください');
  }

  // 性能レベル決定
  let performance: SVGQualityAssessment['performance'];
  if (score >= 90) performance = 'excellent';
  else if (score >= 75) performance = 'good';
  else if (score >= 60) performance = 'fair';
  else performance = 'poor';

  return {
    score: Math.max(0, score),
    issues,
    recommendations,
    performance
  };
};

/**
 * SVGデータのバリデーション
 */
export const validateSVGData = (svgData: SVGData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 基本的なバリデーション
  if (!svgData.content || svgData.content.trim().length === 0) {
    errors.push('SVGコンテンツが空です');
  }

  if (svgData.width <= 0 || svgData.height <= 0) {
    errors.push('SVGの寸法が無効です');
  }

  if (!svgData.viewBox || svgData.viewBox.width <= 0 || svgData.viewBox.height <= 0) {
    errors.push('ViewBoxが無効です');
  }

  if (!svgData.bounds || 
      svgData.bounds.minX >= svgData.bounds.maxX || 
      svgData.bounds.minY >= svgData.bounds.maxY) {
    errors.push('境界情報が無効です');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * SVGの統計情報を取得する
 */
export interface SVGStatistics {
  fileSize: number;
  dimensions: { width: number; height: number };
  aspectRatio: number;
  area: number;
  viewBoxRatio: number;
  boundsArea: number;
  complexity: number;
  elementCount: number;
  hasViewBox: boolean;
  hasExplicitDimensions: boolean;
}

export const getSVGStatistics = (svgData: ProcessedSVGData): SVGStatistics => {
  const fileSize = svgData.processingMetadata.originalSize;
  const dimensions = { width: svgData.width, height: svgData.height };
  const aspectRatio = svgData.width / svgData.height;
  const area = svgData.width * svgData.height;
  
  // ViewBoxとSVG寸法の比率
  const viewBoxArea = svgData.viewBox.width * svgData.viewBox.height;
  const viewBoxRatio = viewBoxArea / area;
  
  // 境界の面積
  const boundsWidth = svgData.bounds.maxX - svgData.bounds.minX;
  const boundsHeight = svgData.bounds.maxY - svgData.bounds.minY;
  const boundsArea = boundsWidth * boundsHeight;
  
  // 複雑さの評価（簡易版）
  const complexity = evaluateComplexityFromContent(svgData.content);
  
  // 要素数の概算
  const elementCount = estimateElementCount(svgData.content);
  
  // ViewBoxの存在確認
  const hasViewBox = svgData.content.includes('viewBox=');
  
  // 明示的な寸法の存在確認
  const hasExplicitDimensions = svgData.content.includes('width=') && svgData.content.includes('height=');

  return {
    fileSize,
    dimensions,
    aspectRatio,
    area,
    viewBoxRatio,
    boundsArea,
    complexity,
    elementCount,
    hasViewBox,
    hasExplicitDimensions
  };
};

/**
 * ヘルパー関数: ファイルをテキストとして読み込む
 */
const readFileAsText = (file: File): Promise<string> => {
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
    reader.onerror = () => reject(new Error('ファイルの読み込み中にエラーが発生しました'));
    reader.readAsText(file);
  });
};

/**
 * ヘルパー関数: 1px=1mmスケールを適用
 */
const applyMillimeterScale = (svgData: SVGData): SVGData => {
  // 1px=1mmの関係では実際の変換は不要だが、
  // メタデータとして記録し、将来の拡張に備える
  return {
    ...svgData,
    // 必要に応じてスケール情報を追加
  };
};

/**
 * SVGコンテンツから複雑さを評価する（簡易版）
 */
const evaluateComplexityFromContent = (svgContent: string): number => {
  let complexity = 0;
  
  // 基本的な要素の数
  const basicElements = ['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];
  basicElements.forEach(element => {
    const matches = svgContent.match(new RegExp(`<${element}`, 'g'));
    complexity += (matches?.length || 0) * 1;
  });
  
  // 複雑な要素の数
  const complexElements = ['path', 'text', 'image'];
  complexElements.forEach(element => {
    const matches = svgContent.match(new RegExp(`<${element}`, 'g'));
    complexity += (matches?.length || 0) * 3;
  });
  
  // グループ要素
  const groupMatches = svgContent.match(/<g/g);
  complexity += (groupMatches?.length || 0) * 2;
  
  // グラデーションやパターン
  const gradientMatches = svgContent.match(/<(linearGradient|radialGradient|pattern)/g);
  complexity += (gradientMatches?.length || 0) * 5;
  
  // フィルター
  const filterMatches = svgContent.match(/<filter/g);
  complexity += (filterMatches?.length || 0) * 10;
  
  return Math.min(complexity, 100);
};

/**
 * SVGコンテンツから要素数を概算する
 */
const estimateElementCount = (svgContent: string): number => {
  // 開始タグの数を数える（簡易的な方法）
  const tagMatches = svgContent.match(/<[a-zA-Z][^>]*>/g);
  return tagMatches?.length || 0;
};
/**

 * SVG文字列解析とviewBox抽出の核となる機能
 * タスク要件: SVG文字列解析とviewBox抽出機能の実装
 */
export const extractViewBoxFromSVG = (svgContent: string): {
  viewBox: ViewBox;
  hasExplicitViewBox: boolean;
  calculatedFromDimensions: boolean;
  extractionMethod: string;
} => {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('有効なSVG要素が見つかりません');
    }

    // 明示的なviewBox属性をチェック
    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
      const values = viewBoxAttr.split(/\s+/).map(Number);
      if (values.length === 4 && values.every(v => !isNaN(v))) {
        return {
          viewBox: {
            x: values[0],
            y: values[1],
            width: values[2],
            height: values[3]
          },
          hasExplicitViewBox: true,
          calculatedFromDimensions: false,
          extractionMethod: 'explicit-viewBox-attribute'
        };
      }
    }

    // width/height属性から計算
    const width = parseFloat(svgElement.getAttribute('width') || '0') || 300;
    const height = parseFloat(svgElement.getAttribute('height') || '0') || 150;

    return {
      viewBox: {
        x: 0,
        y: 0,
        width,
        height
      },
      hasExplicitViewBox: false,
      calculatedFromDimensions: true,
      extractionMethod: 'calculated-from-dimensions'
    };
  } catch (error) {
    // エラーの場合はデフォルト値を返す
    return {
      viewBox: { x: 0, y: 0, width: 300, height: 150 },
      hasExplicitViewBox: false,
      calculatedFromDimensions: false,
      extractionMethod: 'default-fallback'
    };
  }
};

/**
 * 境界計算の核となる機能
 * タスク要件: 境界計算とスケール変換ユーティリティの作成
 */
export const calculateSVGBounds = (svgContent: string): {
  bounds: BoundingBox;
  calculationMethod: string;
  accuracy: 'high' | 'medium' | 'low';
  contentBounds?: BoundingBox;
} => {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('有効なSVG要素が見つかりません');
    }

    // 最も正確な方法: getBBoxを使用
    try {
      const bbox = svgElement.getBBox();
      const contentBounds: BoundingBox = {
        minX: bbox.x,
        minY: bbox.y,
        maxX: bbox.x + bbox.width,
        maxY: bbox.y + bbox.height
      };

      // viewBoxと比較して適切な境界を決定
      const viewBoxInfo = extractViewBoxFromSVG(svgContent);
      const viewBoxBounds: BoundingBox = {
        minX: viewBoxInfo.viewBox.x,
        minY: viewBoxInfo.viewBox.y,
        maxX: viewBoxInfo.viewBox.x + viewBoxInfo.viewBox.width,
        maxY: viewBoxInfo.viewBox.y + viewBoxInfo.viewBox.height
      };

      return {
        bounds: viewBoxBounds, // レイアウト用にはviewBox境界を使用
        calculationMethod: 'getBBox-with-viewBox-comparison',
        accuracy: 'high',
        contentBounds
      };
    } catch (bboxError) {
      // getBBoxが失敗した場合はviewBoxから計算
      const viewBoxInfo = extractViewBoxFromSVG(svgContent);
      const bounds: BoundingBox = {
        minX: viewBoxInfo.viewBox.x,
        minY: viewBoxInfo.viewBox.y,
        maxX: viewBoxInfo.viewBox.x + viewBoxInfo.viewBox.width,
        maxY: viewBoxInfo.viewBox.y + viewBoxInfo.viewBox.height
      };

      return {
        bounds,
        calculationMethod: 'viewBox-fallback',
        accuracy: 'medium'
      };
    }
  } catch (error) {
    // 完全なフォールバック
    return {
      bounds: { minX: 0, minY: 0, maxX: 300, maxY: 150 },
      calculationMethod: 'default-fallback',
      accuracy: 'low'
    };
  }
};

/**
 * スケール変換の核となる機能
 * タスク要件: 境界計算とスケール変換ユーティリティの作成
 */
export const calculateScaleTransforms = (
  sourceDimensions: { width: number; height: number },
  targetDimensions: { width: number; height: number },
  scaleMode: 'uniform' | 'fit' | 'fill' | 'stretch' = 'uniform'
): {
  scaleX: number;
  scaleY: number;
  uniformScale: number;
  offset: Position;
  scaledDimensions: { width: number; height: number };
  aspectRatioPreserved: boolean;
} => {
  const sourceWidth = sourceDimensions.width;
  const sourceHeight = sourceDimensions.height;
  const targetWidth = targetDimensions.width;
  const targetHeight = targetDimensions.height;

  let scaleX: number;
  let scaleY: number;
  let uniformScale: number;
  let aspectRatioPreserved: boolean;

  switch (scaleMode) {
    case 'uniform':
      uniformScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
      scaleX = scaleY = uniformScale;
      aspectRatioPreserved = true;
      break;

    case 'fit':
      uniformScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
      scaleX = scaleY = uniformScale;
      aspectRatioPreserved = true;
      break;

    case 'fill':
      uniformScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
      scaleX = scaleY = uniformScale;
      aspectRatioPreserved = true;
      break;

    case 'stretch':
      scaleX = targetWidth / sourceWidth;
      scaleY = targetHeight / sourceHeight;
      uniformScale = Math.min(scaleX, scaleY);
      aspectRatioPreserved = false;
      break;

    default:
      uniformScale = 1;
      scaleX = scaleY = 1;
      aspectRatioPreserved = true;
  }

  const scaledDimensions = {
    width: sourceWidth * scaleX,
    height: sourceHeight * scaleY
  };

  const offset: Position = {
    x: (targetWidth - scaledDimensions.width) / 2,
    y: (targetHeight - scaledDimensions.height) / 2
  };

  return {
    scaleX,
    scaleY,
    uniformScale,
    offset,
    scaledDimensions,
    aspectRatioPreserved
  };
};

/**
 * Konva互換データ変換の核となる機能
 * タスク要件: SVGレンダリング用のKonva互換データ変換
 */
export const convertSVGToKonvaData = (svgData: SVGData, targetDimensions: { width: number; height: number }): {
  konvaStageConfig: {
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    x: number;
    y: number;
  };
  svgImageConfig: {
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
  };
  coordinateTransforms: {
    svgToKonva: (pos: Position) => Position;
    konvaToSvg: (pos: Position) => Position;
    mmToKonva: (pos: Position) => Position;
    konvaToMm: (pos: Position) => Position;
  };
  boundaryConstraints: {
    konvaBounds: BoundingBox;
    isWithinBounds: (pos: Position) => boolean;
    constrainPosition: (pos: Position) => Position;
  };
} => {
  // スケール変換を計算
  const scaleTransforms = calculateScaleTransforms(
    { width: svgData.width, height: svgData.height },
    targetDimensions,
    'fit'
  );

  // Konva Stage設定
  const konvaStageConfig = {
    width: targetDimensions.width,
    height: targetDimensions.height,
    scaleX: scaleTransforms.scaleX,
    scaleY: scaleTransforms.scaleY,
    x: scaleTransforms.offset.x,
    y: scaleTransforms.offset.y
  };

  // SVG画像設定
  const svgImageConfig = {
    x: scaleTransforms.offset.x,
    y: scaleTransforms.offset.y,
    width: svgData.width,
    height: svgData.height,
    scaleX: scaleTransforms.scaleX,
    scaleY: scaleTransforms.scaleY
  };

  // 座標変換関数
  const coordinateTransforms = {
    svgToKonva: (pos: Position): Position => ({
      x: pos.x * konvaStageConfig.scaleX + konvaStageConfig.x,
      y: pos.y * konvaStageConfig.scaleY + konvaStageConfig.y
    }),
    konvaToSvg: (pos: Position): Position => ({
      x: (pos.x - konvaStageConfig.x) / konvaStageConfig.scaleX,
      y: (pos.y - konvaStageConfig.y) / konvaStageConfig.scaleY
    }),
    mmToKonva: (pos: Position): Position => {
      // 1px = 1mmの関係を使用
      const svgPos = { x: mmToPx(pos.x), y: mmToPx(pos.y) };
      return coordinateTransforms.svgToKonva(svgPos);
    },
    konvaToMm: (pos: Position): Position => {
      const svgPos = coordinateTransforms.konvaToSvg(pos);
      return { x: pxToMm(svgPos.x), y: pxToMm(svgPos.y) };
    }
  };

  // Konva座標系での境界
  const konvaBounds: BoundingBox = {
    minX: svgData.bounds.minX * konvaStageConfig.scaleX + konvaStageConfig.x,
    minY: svgData.bounds.minY * konvaStageConfig.scaleY + konvaStageConfig.y,
    maxX: svgData.bounds.maxX * konvaStageConfig.scaleX + konvaStageConfig.x,
    maxY: svgData.bounds.maxY * konvaStageConfig.scaleY + konvaStageConfig.y
  };

  // 境界制約
  const boundaryConstraints = {
    konvaBounds,
    isWithinBounds: (pos: Position): boolean => {
      return pos.x >= konvaBounds.minX && pos.x <= konvaBounds.maxX &&
             pos.y >= konvaBounds.minY && pos.y <= konvaBounds.maxY;
    },
    constrainPosition: (pos: Position): Position => ({
      x: Math.max(konvaBounds.minX, Math.min(konvaBounds.maxX, pos.x)),
      y: Math.max(konvaBounds.minY, Math.min(konvaBounds.maxY, pos.y))
    })
  };

  return {
    konvaStageConfig,
    svgImageConfig,
    coordinateTransforms,
    boundaryConstraints
  };
};