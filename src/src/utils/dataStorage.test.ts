/**
 * データ保存・読み込み機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  stateToExportData,
  exportDataToState,
  exportToJSON,
  importFromJSON,
  saveToLocalStorage,
  loadFromLocalStorage,
  AutoSave,
  type VenueLayoutData,
  type ExportData
} from './dataStorage';
import type { AppState } from '../store/types';

// モックデータ
const mockAppState: AppState = {
  svgData: {
    content: '<svg width="100" height="100"><rect width="50" height="50"/></svg>',
    width: 100,
    height: 100,
    viewBox: { x: 0, y: 0, width: 100, height: 100 },
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  },
  tables: [
    {
      id: 'table-1',
      type: 'rectangle',
      position: { x: 50, y: 50 },
      properties: { width: 30, height: 20 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    },
    {
      id: 'table-2',
      type: 'circle',
      position: { x: 80, y: 80 },
      properties: { radius: 15 },
      style: {
        fill: '#f3e5f5',
        stroke: '#7b1fa2',
        strokeWidth: 2,
        opacity: 0.8
      }
    }
  ],
  selectedTableId: 'table-1',
  dragState: null,
  viewport: {
    scale: 1.5,
    offset: { x: 10, y: 20 },
    canvasSize: { width: 800, height: 600 }
  },
  ui: {
    isLoading: false,
    showGrid: true,
    showMeasurements: true,
    theme: 'light'
  },
  error: null,
  placementMode: null
};

const mockMetadata: VenueLayoutData['metadata'] = {
  name: 'テスト会場',
  description: 'テスト用の会場レイアウト',
  author: 'テストユーザー',
  tags: ['テスト', '会場']
};

describe('stateToExportData', () => {
  it('アプリケーション状態をエクスポートデータに変換できる', () => {
    const exportData = stateToExportData(mockAppState, mockMetadata, 'full');

    expect(exportData.version).toBe('2.0.0');
    expect(exportData.exportType).toBe('full');
    expect(exportData.metadata).toEqual(mockMetadata);
    expect(exportData.svgData).toEqual(mockAppState.svgData);
    expect(exportData.tables).toEqual(mockAppState.tables);
    expect(exportData.viewport).toEqual(mockAppState.viewport);
    expect(exportData.checksum).toBeDefined();
    expect(typeof exportData.timestamp).toBe('number');
  });

  it('layout-onlyモードでSVGデータを除外できる', () => {
    const exportData = stateToExportData(mockAppState, mockMetadata, 'layout-only');

    expect(exportData.exportType).toBe('layout-only');
    expect(exportData.svgData).toBeNull();
    expect(exportData.tables).toEqual(mockAppState.tables);
  });

  it('メタデータが未指定の場合デフォルト値を使用する', () => {
    const exportData = stateToExportData(mockAppState);

    expect(exportData.metadata.name).toContain('会場レイアウト_');
    expect(exportData.metadata.description).toBe('');
    expect(exportData.metadata.author).toBe('');
    expect(exportData.metadata.tags).toEqual([]);
  });
});

describe('exportDataToState', () => {
  it('エクスポートデータをアプリケーション状態に変換できる', () => {
    const exportData = stateToExportData(mockAppState, mockMetadata, 'full');
    const state = exportDataToState(exportData);

    expect(state.svgData).toEqual(mockAppState.svgData);
    expect(state.tables).toEqual(mockAppState.tables);
    expect(state.viewport).toEqual(mockAppState.viewport);
    expect(state.ui?.showGrid).toBe(mockAppState.ui.showGrid);
    expect(state.ui?.showMeasurements).toBe(mockAppState.ui.showMeasurements);
    expect(state.ui?.theme).toBe(mockAppState.ui.theme);
    expect(state.ui?.isLoading).toBe(false);
    expect(state.selectedTableId).toBeNull();
    expect(state.dragState).toBeNull();
    expect(state.error).toBeNull();
    expect(state.placementMode).toBeNull();
  });
});

describe('exportToJSON', () => {
  it('JSON文字列を生成できる', () => {
    const jsonString = exportToJSON(mockAppState, mockMetadata, 'full');
    const parsed = JSON.parse(jsonString);

    expect(parsed.version).toBe('2.0.0');
    expect(parsed.metadata).toEqual(mockMetadata);
    expect(parsed.tables).toEqual(mockAppState.tables);
    expect(typeof jsonString).toBe('string');
  });

  it('生成されたJSONが有効である', () => {
    const jsonString = exportToJSON(mockAppState, mockMetadata, 'full');
    
    expect(() => JSON.parse(jsonString)).not.toThrow();
  });
});

describe('importFromJSON', () => {
  it('有効なJSON文字列からデータをインポートできる', () => {
    const jsonString = exportToJSON(mockAppState, mockMetadata, 'full');
    const result = importFromJSON(jsonString);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.tables).toEqual(mockAppState.tables);
    expect(result.data?.metadata).toEqual(mockMetadata);
    expect(result.error).toBeUndefined();
  });

  it('無効なJSON文字列でエラーを返す', () => {
    const result = importFromJSON('invalid json');

    expect(result.success).toBe(false);
    expect(result.error).toContain('JSONの解析に失敗');
    expect(result.data).toBeUndefined();
  });

  it('必須フィールドが不足している場合にエラーを返す', () => {
    const invalidData = {
      version: '2.0.0',
      // tablesフィールドが不足
      metadata: mockMetadata
    };
    const result = importFromJSON(JSON.stringify(invalidData));

    expect(result.success).toBe(false);
    expect(result.error).toContain('データが無効');
  });

  it('チェックサムが一致しない場合にエラーを返す', () => {
    const exportData = stateToExportData(mockAppState, mockMetadata, 'full');
    exportData.checksum = 'invalid-checksum';
    const result = importFromJSON(JSON.stringify(exportData));

    expect(result.success).toBe(false);
    expect(result.error).toContain('整合性チェックに失敗');
  });

  it('バージョン互換性の警告を表示する', () => {
    const exportData = stateToExportData(mockAppState, mockMetadata, 'full');
    exportData.version = '1.0.0'; // 古いバージョン
    const result = importFromJSON(JSON.stringify(exportData));

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('互換性がない可能性'))).toBe(true);
  });
});

describe('ローカルストレージ機能', () => {
  // ローカルストレージのモック
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveToLocalStorage', () => {
    it('データをローカルストレージに保存できる', () => {
      const data = stateToExportData(mockAppState, mockMetadata, 'full');
      const result = saveToLocalStorage('test-key', data);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data)
      );
    });

    it('保存エラー時にfalseを返す', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const data = stateToExportData(mockAppState, mockMetadata, 'full');
      const result = saveToLocalStorage('test-key', data);

      expect(result).toBe(false);
    });
  });

  describe('loadFromLocalStorage', () => {
    it('ローカルストレージからデータを読み込める', () => {
      const data = stateToExportData(mockAppState, mockMetadata, 'full');
      localStorageMock.getItem.mockReturnValue(JSON.stringify(data));

      const result = loadFromLocalStorage('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
    });

    it('データが存在しない場合にエラーを返す', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadFromLocalStorage('non-existent-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('データが見つかりません');
    });

    it('無効なJSONデータでエラーを返す', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = loadFromLocalStorage('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSONの解析に失敗');
    });
  });
});

describe('AutoSave', () => {
  let autoSave: AutoSave;
  let mockGetData: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    autoSave = new AutoSave('test-autosave', 1000);
    mockGetData = vi.fn().mockReturnValue(
      stateToExportData(mockAppState, mockMetadata, 'full')
    );

    // ローカルストレージのモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    autoSave.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('自動保存を開始できる', () => {
    autoSave.start(mockGetData);

    // 1秒経過
    vi.advanceTimersByTime(1000);

    expect(mockGetData).toHaveBeenCalled();
  });

  it('自動保存を停止できる', () => {
    autoSave.start(mockGetData);
    autoSave.stop();

    // 1秒経過しても呼ばれない
    vi.advanceTimersByTime(1000);

    expect(mockGetData).not.toHaveBeenCalled();
  });

  it('手動保存ができる', () => {
    const data = stateToExportData(mockAppState, mockMetadata, 'full');
    const result = autoSave.saveNow(data);

    expect(result).toBe(true);
  });

  it('自動保存データを削除できる', () => {
    const removeItemSpy = vi.spyOn(localStorage, 'removeItem');
    
    autoSave.clear();

    expect(removeItemSpy).toHaveBeenCalledWith('test-autosave');
  });
});

describe('データバリデーション', () => {
  it('テーブルデータの詳細バリデーションを行う', () => {
    const invalidData = {
      version: '2.0.0',
      timestamp: Date.now(),
      metadata: mockMetadata,
      tables: [
        {
          // idが不足
          type: 'rectangle',
          position: { x: 50, y: 50 },
          properties: { width: 30, height: 20 }
        },
        {
          id: 'table-2',
          type: 'invalid-type', // 無効なタイプ
          position: { x: 80, y: 80 },
          properties: { radius: 15 }
        },
        {
          id: 'table-3',
          type: 'circle',
          position: { x: 'invalid' }, // 無効な位置
          properties: { radius: 15 }
        }
      ],
      viewport: mockAppState.viewport,
      ui: mockAppState.ui
    };

    const result = importFromJSON(JSON.stringify(invalidData));

    expect(result.success).toBe(false);
    expect(result.error).toContain('データが無効');
  });
});

describe('SVGエクスポート機能', () => {
  // DOMのモック
  beforeEach(() => {
    // document.createElement のモック
    global.document.createElement = vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'div') {
        return {
          innerHTML: '',
          querySelector: vi.fn().mockReturnValue({
            outerHTML: '<svg><rect/></svg>',
            appendChild: vi.fn()
          })
        };
      }
      return {};
    });

    // document.createElementNS のモック
    global.document.createElementNS = vi.fn().mockReturnValue({
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      textContent: ''
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SVGデータが存在しない場合にエラーを投げる', () => {
    const stateWithoutSVG = { ...mockAppState, svgData: null };

    expect(() => {
      // exportToSVG(stateWithoutSVG);
    }).toThrow('SVGデータが存在しません');
  });
});