/**
 * SVG処理ユーティリティ
 */

import type { SVGData, ViewBox, BoundingBox } from '../types';

/**
 * SVG文字列を解析してSVGDataを作成
 * @param svgContent SVG文字列
 * @returns SVGData
 */
export const parseSVG = (svgContent: string): SVGData => {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = svgDoc.querySelector('svg');
  
  if (!svgElement) {
    throw new Error('Invalid SVG content');
  }
  
  // SVGの寸法を取得
  const width = parseFloat(svgElement.getAttribute('width') || '0');
  const height = parseFloat(svgElement.getAttribute('height') || '0');
  
  // viewBoxを取得
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  let viewBox: ViewBox;
  
  if (viewBoxAttr) {
    const [x, y, w, h] = viewBoxAttr.split(' ').map(Number);
    viewBox = { x, y, width: w, height: h };
  } else {
    viewBox = { x: 0, y: 0, width, height };
  }
  
  // 境界を計算
  const bounds: BoundingBox = {
    minX: viewBox.x,
    minY: viewBox.y,
    maxX: viewBox.x + viewBox.width,
    maxY: viewBox.y + viewBox.height
  };
  
  return {
    content: svgContent,
    width,
    height,
    viewBox,
    bounds
  };
};

/**
 * SVGファイルを読み込んでSVGDataを作成
 * @param file SVGファイル
 * @returns Promise<SVGData>
 */
export const loadSVGFile = (file: File): Promise<SVGData> => {
  return new Promise((resolve, reject) => {
    if (!file.type.includes('svg')) {
      reject(new Error('Selected file is not an SVG'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const svgContent = event.target?.result as string;
        const svgData = parseSVG(svgContent);
        resolve(svgData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read SVG file'));
    };
    
    reader.readAsText(file);
  });
};