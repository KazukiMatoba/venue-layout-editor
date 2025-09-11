// SVGテーブルAPI
import { SVG_SCALE_FACTOR } from '../constants/scale';

export interface SVGTableInfo {
  filename: string;
  name: string;
}

// SVGファイル一覧を取得するAPI
export const fetchSVGTableList = async (): Promise<SVGTableInfo[]> => {
  try {
    // JSONファイルから直接読み込み
    const response = await fetch('/api/svg-tables.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('JSONファイルの取得に失敗しました。:', error);
    return [];
  }
};

// SVGファイル一覧を取得するAPI
export const fetchSVGEquipmentList = async (): Promise<SVGTableInfo[]> => {
  try {
    // JSONファイルから直接読み込み
    const response = await fetch('/api/svg-equipments.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('JSONファイルの取得に失敗しました。:', error);
    return [];
  }
};

// SVGコンテンツからwidth/heightを解析する関数
export const parseSVGDimensions = (svgContent: string): { width: number; height: number } => {
  try {
    // SVGタグからwidth/height属性を抽出
    const svgMatch = svgContent.match(/<svg[^>]*>/i);
    if (!svgMatch) {
      throw new Error('SVGタグが見つかりません');
    }

    const svgTag = svgMatch[0];
    
    // width属性を抽出
    const widthMatch = svgTag.match(/width\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
    const heightMatch = svgTag.match(/height\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
    
    if (!widthMatch || !heightMatch) {
      throw new Error('width/height属性が見つかりません');
    }

    return {
      width: parseFloat(widthMatch[1]) * SVG_SCALE_FACTOR,
      height: parseFloat(heightMatch[1]) * SVG_SCALE_FACTOR
    };
  } catch (error) {
    console.warn('SVG寸法の解析に失敗しました:', error);
    // デフォルト値を返す
    return { width: 1000, height: 1000 };
  }
};
