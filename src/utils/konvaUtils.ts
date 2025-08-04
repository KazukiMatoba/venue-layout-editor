import { SVGData, Position, BoundingBox } from '../types';

/**
 * Konva互換のSVGデータ変換ユーティリティ
 */

/**
 * SVGをKonva Stageで表示するためのプロパティを生成する
 * @param svgData SVGデータ
 * @param containerWidth コンテナの幅
 * @param containerHeight コンテナの高さ
 * @returns Konva Stage用のプロパティ
 */
export interface KonvaStageProps {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
}

export const generateKonvaStageProps = (
  svgData: SVGData,
  containerWidth: number,
  containerHeight: number,
  maintainAspectRatio: boolean = true
): KonvaStageProps => {
  const { width: svgWidth, height: svgHeight } = svgData;
  
  if (!maintainAspectRatio) {
    return {
      width: containerWidth,
      height: containerHeight,
      scaleX: containerWidth / svgWidth,
      scaleY: containerHeight / svgHeight,
      x: 0,
      y: 0
    };
  }

  // アスペクト比を維持してフィット
  const scaleX = containerWidth / svgWidth;
  const scaleY = containerHeight / svgHeight;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = svgWidth * scale;
  const scaledHeight = svgHeight * scale;

  // 中央配置のためのオフセット計算
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  return {
    width: containerWidth,
    height: containerHeight,
    scaleX: scale,
    scaleY: scale,
    x: offsetX,
    y: offsetY
  };
};

/**
 * SVGの境界をKonva座標系に変換する
 * @param bounds SVGの境界
 * @param stageProps Konva Stageのプロパティ
 * @returns Konva座標系での境界
 */
export const convertBoundsToKonva = (bounds: BoundingBox, stageProps: KonvaStageProps): BoundingBox => {
  return {
    minX: bounds.minX * stageProps.scaleX + stageProps.x,
    minY: bounds.minY * stageProps.scaleY + stageProps.y,
    maxX: bounds.maxX * stageProps.scaleX + stageProps.x,
    maxY: bounds.maxY * stageProps.scaleY + stageProps.y
  };
};

/**
 * Konva座標をSVG座標系に変換する
 * @param position Konva座標
 * @param stageProps Konva Stageのプロパティ
 * @returns SVG座標系での位置
 */
export const convertKonvaToSVGCoordinates = (position: Position, stageProps: KonvaStageProps): Position => {
  return {
    x: (position.x - stageProps.x) / stageProps.scaleX,
    y: (position.y - stageProps.y) / stageProps.scaleY
  };
};

/**
 * SVG座標をKonva座標系に変換する
 * @param position SVG座標
 * @param stageProps Konva Stageのプロパティ
 * @returns Konva座標系での位置
 */
export const convertSVGToKonvaCoordinates = (position: Position, stageProps: KonvaStageProps): Position => {
  return {
    x: position.x * stageProps.scaleX + stageProps.x,
    y: position.y * stageProps.scaleY + stageProps.y
  };
};

/**
 * マウス/タッチ座標をSVG座標系に変換する
 * @param clientX クライアントX座標
 * @param clientY クライアントY座標
 * @param stageElement Stage DOM要素
 * @param stageProps Konva Stageのプロパティ
 * @returns SVG座標系での位置
 */
export const convertClientToSVGCoordinates = (
  clientX: number,
  clientY: number,
  stageElement: HTMLElement,
  stageProps: KonvaStageProps
): Position => {
  const rect = stageElement.getBoundingClientRect();
  const konvaX = clientX - rect.left;
  const konvaY = clientY - rect.top;
  
  return convertKonvaToSVGCoordinates({ x: konvaX, y: konvaY }, stageProps);
};

/**
 * SVGの背景画像をKonvaで表示するためのプロパティを生成する
 * @param svgData SVGデータ
 * @param stageProps Konva Stageのプロパティ
 * @returns Konva Image用のプロパティ
 */
export interface KonvaImageProps {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

export const generateKonvaImageProps = (svgData: SVGData, stageProps: KonvaStageProps): KonvaImageProps => {
  return {
    x: stageProps.x,
    y: stageProps.y,
    width: svgData.width,
    height: svgData.height,
    scaleX: stageProps.scaleX,
    scaleY: stageProps.scaleY
  };
};

/**
 * SVGデータからHTMLImageElementを作成する
 * @param svgData SVGデータ
 * @returns Promise<HTMLImageElement>
 */
export const createImageFromSVG = (svgData: SVGData): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = (error) => {
      reject(new Error('SVG画像の作成に失敗しました'));
    };
    
    // SVGをData URLに変換
    const svgBlob = new Blob([svgData.content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
    
    // メモリリークを防ぐためにURLを解放
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
  });
};

/**
 * ズーム操作のための制約を計算する
 * @param currentScale 現在のスケール
 * @param deltaScale スケール変更量
 * @param minScale 最小スケール
 * @param maxScale 最大スケール
 * @returns 制約されたスケール値
 */
export const constrainZoom = (
  currentScale: number,
  deltaScale: number,
  minScale: number = 0.1,
  maxScale: number = 5.0
): number => {
  const newScale = currentScale * deltaScale;
  return Math.max(minScale, Math.min(maxScale, newScale));
};

/**
 * パン操作のための制約を計算する
 * @param currentPosition 現在の位置
 * @param deltaPosition 位置変更量
 * @param stageBounds Stageの境界
 * @param contentBounds コンテンツの境界
 * @returns 制約された位置
 */
export const constrainPan = (
  currentPosition: Position,
  deltaPosition: Position,
  stageBounds: { width: number; height: number },
  contentBounds: { width: number; height: number; scale: number }
): Position => {
  const newX = currentPosition.x + deltaPosition.x;
  const newY = currentPosition.y + deltaPosition.y;
  
  const scaledContentWidth = contentBounds.width * contentBounds.scale;
  const scaledContentHeight = contentBounds.height * contentBounds.scale;
  
  // コンテンツがStageより小さい場合は中央に配置
  if (scaledContentWidth <= stageBounds.width) {
    return {
      x: (stageBounds.width - scaledContentWidth) / 2,
      y: Math.max(
        Math.min(newY, 0),
        stageBounds.height - scaledContentHeight
      )
    };
  }
  
  if (scaledContentHeight <= stageBounds.height) {
    return {
      x: Math.max(
        Math.min(newX, 0),
        stageBounds.width - scaledContentWidth
      ),
      y: (stageBounds.height - scaledContentHeight) / 2
    };
  }
  
  // 通常の制約
  return {
    x: Math.max(
      Math.min(newX, 0),
      stageBounds.width - scaledContentWidth
    ),
    y: Math.max(
      Math.min(newY, 0),
      stageBounds.height - scaledContentHeight
    )
  };
};

/**
 * SVGパスデータをKonva互換の形式に変換する
 * @param pathData SVGパスデータ
 * @returns Konva Path用のデータ
 */
export interface KonvaPathData {
  data: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const convertSVGPathToKonva = (pathElement: SVGPathElement): KonvaPathData => {
  const pathData = pathElement.getAttribute('d') || '';
  const fill = pathElement.getAttribute('fill') || 'transparent';
  const stroke = pathElement.getAttribute('stroke') || 'none';
  const strokeWidth = parseFloat(pathElement.getAttribute('stroke-width') || '1');

  return {
    data: pathData,
    fill: fill === 'none' ? undefined : fill,
    stroke: stroke === 'none' ? undefined : stroke,
    strokeWidth: strokeWidth
  };
};

/**
 * SVG要素をKonva互換のプロパティに変換する
 * @param svgElement SVG要素
 * @returns Konva用のプロパティ
 */
export interface KonvaElementProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export const convertSVGElementToKonva = (element: SVGElement): KonvaElementProps | null => {
  const tagName = element.tagName.toLowerCase();
  const baseProps: KonvaElementProps = {
    x: parseFloat(element.getAttribute('x') || '0'),
    y: parseFloat(element.getAttribute('y') || '0'),
    fill: element.getAttribute('fill') || undefined,
    stroke: element.getAttribute('stroke') || undefined,
    strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1'),
    opacity: parseFloat(element.getAttribute('opacity') || '1')
  };

  switch (tagName) {
    case 'rect':
      return {
        ...baseProps,
        width: parseFloat(element.getAttribute('width') || '0'),
        height: parseFloat(element.getAttribute('height') || '0')
      };
    
    case 'circle':
      return {
        ...baseProps,
        x: parseFloat(element.getAttribute('cx') || '0'),
        y: parseFloat(element.getAttribute('cy') || '0'),
        radius: parseFloat(element.getAttribute('r') || '0')
      };
    
    case 'ellipse':
      return {
        ...baseProps,
        x: parseFloat(element.getAttribute('cx') || '0'),
        y: parseFloat(element.getAttribute('cy') || '0'),
        width: parseFloat(element.getAttribute('rx') || '0') * 2,
        height: parseFloat(element.getAttribute('ry') || '0') * 2
      };
    
    default:
      return baseProps;
  }
};

/**
 * SVGグループ要素を解析してKonva互換の構造に変換する
 * @param groupElement SVGグループ要素
 * @returns Konva Group用のデータ
 */
export interface KonvaGroupData {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  children: KonvaElementProps[];
}

export const convertSVGGroupToKonva = (groupElement: SVGGElement): KonvaGroupData => {
  const transform = groupElement.getAttribute('transform') || '';
  const transformData = parseSVGTransform(transform);
  
  const children: KonvaElementProps[] = [];
  Array.from(groupElement.children).forEach(child => {
    if (child instanceof SVGElement) {
      const konvaProps = convertSVGElementToKonva(child);
      if (konvaProps) {
        children.push(konvaProps);
      }
    }
  });

  return {
    x: transformData.translateX,
    y: transformData.translateY,
    scaleX: transformData.scaleX,
    scaleY: transformData.scaleY,
    rotation: transformData.rotation,
    children
  };
};

/**
 * SVGトランスフォーム属性を解析する
 * @param transform トランスフォーム文字列
 * @returns 変換データ
 */
interface SVGTransformData {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export const parseSVGTransform = (transform: string): SVGTransformData => {
  const result: SVGTransformData = {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0
  };

  if (!transform) {
    return result;
  }

  // translate()を解析
  const translateMatch = transform.match(/translate\(([^)]+)\)/);
  if (translateMatch) {
    const values = translateMatch[1].split(/[,\s]+/).map(Number);
    result.translateX = values[0] || 0;
    result.translateY = values[1] || 0;
  }

  // scale()を解析
  const scaleMatch = transform.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const values = scaleMatch[1].split(/[,\s]+/).map(Number);
    result.scaleX = values[0] || 1;
    result.scaleY = values[1] || values[0] || 1;
  }

  // rotate()を解析
  const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
  if (rotateMatch) {
    const values = rotateMatch[1].split(/[,\s]+/).map(Number);
    result.rotation = values[0] || 0;
  }

  return result;
};

/**
 * SVGビューポートをKonva Stageサイズに適応させる
 * @param svgData SVGデータ
 * @param targetWidth 目標幅
 * @param targetHeight 目標高さ
 * @param fitMode フィットモード
 * @returns 適応されたStageプロパティ
 */
export type FitMode = 'contain' | 'cover' | 'fill' | 'none';

export const adaptSVGToStage = (
  svgData: SVGData,
  targetWidth: number,
  targetHeight: number,
  fitMode: FitMode = 'contain'
): KonvaStageProps => {
  const { width: svgWidth, height: svgHeight, viewBox } = svgData;
  
  // ViewBoxがある場合はそれを使用、なければSVGサイズを使用
  const sourceWidth = viewBox.width || svgWidth;
  const sourceHeight = viewBox.height || svgHeight;
  
  let scaleX = 1;
  let scaleY = 1;
  let x = 0;
  let y = 0;

  switch (fitMode) {
    case 'contain':
      const containScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
      scaleX = scaleY = containScale;
      x = (targetWidth - sourceWidth * containScale) / 2;
      y = (targetHeight - sourceHeight * containScale) / 2;
      break;
    
    case 'cover':
      const coverScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
      scaleX = scaleY = coverScale;
      x = (targetWidth - sourceWidth * coverScale) / 2;
      y = (targetHeight - sourceHeight * coverScale) / 2;
      break;
    
    case 'fill':
      scaleX = targetWidth / sourceWidth;
      scaleY = targetHeight / sourceHeight;
      x = 0;
      y = 0;
      break;
    
    case 'none':
      scaleX = scaleY = 1;
      x = (targetWidth - sourceWidth) / 2;
      y = (targetHeight - sourceHeight) / 2;
      break;
  }

  return {
    width: targetWidth,
    height: targetHeight,
    scaleX,
    scaleY,
    x,
    y
  };
};

/**
 * レスポンシブなStageサイズを計算する
 * @param containerElement コンテナ要素
 * @param aspectRatio アスペクト比（幅/高さ）
 * @param maxWidth 最大幅
 * @param maxHeight 最大高さ
 * @returns 計算されたStageサイズ
 */
export const calculateResponsiveStageSize = (
  containerElement: HTMLElement,
  aspectRatio?: number,
  maxWidth?: number,
  maxHeight?: number
): { width: number; height: number } => {
  const containerRect = containerElement.getBoundingClientRect();
  let width = containerRect.width;
  let height = containerRect.height;

  // 最大サイズ制限を適用
  if (maxWidth && width > maxWidth) {
    width = maxWidth;
  }
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
  }

  // アスペクト比を維持
  if (aspectRatio) {
    const currentRatio = width / height;
    if (currentRatio > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  return { width, height };
};