/**
 * データ保存・読み込み機能
 * レイアウトデータのJSON形式エクスポート・インポート機能を提供
 */

import type { AppState, SVGData, TableObject } from '../types';

// 保存データの型定義
export interface VenueLayoutData {
  version: string;
  timestamp: number;
  metadata: {
    name?: string;
    description?: string;
    author?: string;
    tags?: string[];
  };
  svgData: SVGData | null;
  tables: TableObject[];
  viewport: {
    scale: number;
    offset: { x: number; y: number };
    canvasSize: { width: number; height: number };
  };
  ui: {
    showGrid: boolean;
    showMeasurements: boolean;
    theme: 'light' | 'dark';
  };
}

// エクスポート用のデータ形式
export interface ExportData extends VenueLayoutData {
  exportType: 'full' | 'layout-only' | 'svg-only';
  checksum?: string;
}

// インポート結果の型定義
export interface ImportResult {
  success: boolean;
  data?: VenueLayoutData;
  error?: string;
  warnings?: string[];
}

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * アプリケーション状態をエクスポート用データに変換
 */
export const stateToExportData = (
  state: AppState,
  metadata: VenueLayoutData['metadata'] = {},
  exportType: ExportData['exportType'] = 'full'
): ExportData => {
  const baseData: VenueLayoutData = {
    version: '2.0.0',
    timestamp: Date.now(),
    metadata: {
      name: metadata.name || `会場レイアウト_${new Date().toLocaleDateString('ja-JP')}`,
      description: metadata.description || '',
      author: metadata.author || '',
      tags: metadata.tags || [],
      ...metadata
    },
    svgData: exportType === 'layout-only' ? null : state.svgData,
    tables: state.tables,
    viewport: state.viewport,
    ui: {
      showGrid: state.ui.showGrid,
      showMeasurements: state.ui.showMeasurements,
      theme: state.ui.theme
    }
  };

  // チェックサムを計算（データ整合性確認用）
  const checksum = calculateChecksum(baseData);

  return {
    ...baseData,
    exportType,
    checksum
  };
};

/**
 * エクスポートデータをアプリケーション状態に変換
 */
export const exportDataToState = (exportData: ExportData): Partial<AppState> => {
  return {
    svgData: exportData.svgData,
    tables: exportData.tables || [],
    viewport: exportData.viewport || {
      scale: 1,
      offset: { x: 0, y: 0 },
      canvasSize: { width: 800, height: 600 }
    },
    ui: {
      ...exportData.ui,
      isLoading: false
    },
    selectedTableId: null,
    dragState: null,
    error: null,
    placementMode: null
  };
};

/**
 * データをJSON形式でエクスポート
 */
export const exportToJSON = (
  state: AppState,
  metadata?: VenueLayoutData['metadata'],
  exportType?: ExportData['exportType']
): string => {
  const exportData = stateToExportData(state, metadata, exportType);
  return JSON.stringify(exportData, null, 2);
};

/**
 * JSON文字列からデータをインポート
 */
export const importFromJSON = (jsonString: string): ImportResult => {
  try {
    const data = JSON.parse(jsonString);
    const validation = validateImportData(data);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: `データが無効です: ${validation.errors.join(', ')}`,
        warnings: validation.warnings
      };
    }

    // チェックサムの検証
    if (data.checksum) {
      const calculatedChecksum = calculateChecksum({
        version: data.version,
        timestamp: data.timestamp,
        metadata: data.metadata,
        svgData: data.svgData,
        tables: data.tables,
        viewport: data.viewport,
        ui: data.ui
      });
      
      if (calculatedChecksum !== data.checksum) {
        return {
          success: false,
          error: 'データの整合性チェックに失敗しました。ファイルが破損している可能性があります。'
        };
      }
    }

    return {
      success: true,
      data: data as VenueLayoutData,
      warnings: validation.warnings
    };
  } catch (error) {
    return {
      success: false,
      error: `JSONの解析に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * ファイルからデータを読み込み
 */
export const importFromFile = (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        resolve({
          success: false,
          error: 'ファイルの読み込みに失敗しました'
        });
        return;
      }
      
      const result = importFromJSON(content);
      resolve(result);
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'ファイルの読み込み中にエラーが発生しました'
      });
    };
    
    reader.readAsText(file);
  });
};

/**
 * データをファイルとしてダウンロード
 */
export const downloadAsFile = (
  data: string,
  filename: string,
  mimeType: string = 'application/json'
): void => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * SVG形式でエクスポート
 */
export const exportToSVG = (state: AppState): string => {
  if (!state.svgData) {
    throw new Error('SVGデータが存在しません');
  }

  // 基本のSVG要素を作成
  const svgElement = document.createElement('div');
  svgElement.innerHTML = state.svgData.content;
  const svg = svgElement.querySelector('svg');
  
  if (!svg) {
    throw new Error('有効なSVGデータではありません');
  }

  // テーブルをSVG要素として追加
  state.tables.forEach(table => {
    const tableElement = createSVGTableElement(table);
    svg.appendChild(tableElement);
  });

  // SVG文字列として返す
  return svg.outerHTML;
};

/**
 * テーブルオブジェクトをSVG要素に変換
 */
const createSVGTableElement = (table: TableObject): SVGElement => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('id', `table-${table.id}`);
  group.setAttribute('transform', `translate(${table.position.x}, ${table.position.y})`);

  let shape: SVGElement;

  if (table.type === 'rectangle') {
    shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const props = table.properties as { width: number; height: number };
    shape.setAttribute('width', props.width.toString());
    shape.setAttribute('height', props.height.toString());
    shape.setAttribute('x', (-props.width / 2).toString());
    shape.setAttribute('y', (-props.height / 2).toString());
  } else {
    shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const props = table.properties as { radius: number };
    shape.setAttribute('r', props.radius.toString());
    shape.setAttribute('cx', '0');
    shape.setAttribute('cy', '0');
  }

  // スタイルを適用
  shape.setAttribute('fill', table.style.fill);
  shape.setAttribute('stroke', table.style.stroke);
  shape.setAttribute('stroke-width', table.style.strokeWidth.toString());
  shape.setAttribute('opacity', table.style.opacity.toString());

  // テーブルIDのラベルを追加
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', '0');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size', '12');
  text.setAttribute('font-family', 'Arial, sans-serif');
  text.setAttribute('fill', '#333');
  text.textContent = table.id;

  group.appendChild(shape);
  group.appendChild(text);

  return group;
};

/**
 * インポートデータのバリデーション
 */
const validateImportData = (data: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須フィールドのチェック
  if (!data.version) {
    errors.push('バージョン情報が不足しています');
  }

  if (!data.timestamp) {
    warnings.push('タイムスタンプが不足しています');
  }

  if (!Array.isArray(data.tables)) {
    errors.push('テーブルデータが無効です');
  } else {
    // テーブルデータの詳細バリデーション
    data.tables.forEach((table: any, index: number) => {
      if (!table.id) {
        errors.push(`テーブル${index + 1}: IDが不足しています`);
      }
      if (!table.type || !['rectangle', 'circle'].includes(table.type)) {
        errors.push(`テーブル${index + 1}: 無効なタイプです`);
      }
      if (!table.position || typeof table.position.x !== 'number' || typeof table.position.y !== 'number') {
        errors.push(`テーブル${index + 1}: 位置情報が無効です`);
      }
      if (!table.properties) {
        errors.push(`テーブル${index + 1}: プロパティが不足しています`);
      }
    });
  }

  // バージョン互換性のチェック
  if (data.version && !isVersionCompatible(data.version)) {
    warnings.push(`バージョン ${data.version} は現在のバージョンと互換性がない可能性があります`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * バージョン互換性のチェック
 */
const isVersionCompatible = (version: string): boolean => {
  const currentVersion = '2.0.0';
  const [currentMajor] = currentVersion.split('.').map(Number);
  const [importMajor] = version.split('.').map(Number);
  
  // メジャーバージョンが同じなら互換性あり
  return currentMajor === importMajor;
};

/**
 * データのチェックサムを計算
 */
const calculateChecksum = (data: any): string => {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * ローカルストレージへの保存
 */
export const saveToLocalStorage = (key: string, data: VenueLayoutData): boolean => {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error('ローカルストレージへの保存に失敗:', error);
    return false;
  }
};

/**
 * ローカルストレージからの読み込み
 */
export const loadFromLocalStorage = (key: string): ImportResult => {
  try {
    const jsonString = localStorage.getItem(key);
    if (!jsonString) {
      return {
        success: false,
        error: 'データが見つかりません'
      };
    }
    
    return importFromJSON(jsonString);
  } catch (error) {
    return {
      success: false,
      error: `ローカルストレージからの読み込みに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * ローカルストレージのキー一覧を取得
 */
export const getLocalStorageKeys = (prefix: string = 'venue-layout-'): string[] => {
  const keys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  
  return keys;
};

/**
 * 自動保存機能
 */
export class AutoSave {
  private key: string;
  private interval: number;
  private timeoutId: number | null = null;

  constructor(key: string = 'venue-layout-autosave', interval: number = 30000) {
    this.key = key;
    this.interval = interval;
  }

  /**
   * 自動保存を開始
   */
  start(getData: () => VenueLayoutData): void {
    this.stop(); // 既存のタイマーをクリア
    
    const save = () => {
      const data = getData();
      saveToLocalStorage(this.key, data);
      this.timeoutId = window.setTimeout(save, this.interval);
    };
    
    this.timeoutId = window.setTimeout(save, this.interval);
  }

  /**
   * 自動保存を停止
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 手動保存
   */
  saveNow(data: VenueLayoutData): boolean {
    return saveToLocalStorage(this.key, data);
  }

  /**
   * 自動保存データを読み込み
   */
  load(): ImportResult {
    return loadFromLocalStorage(this.key);
  }

  /**
   * 自動保存データを削除
   */
  clear(): void {
    localStorage.removeItem(this.key);
  }
}