/**
 * データ保存・読み込み用のカスタムフック
 * 統合状態管理システムとデータ永続化機能を連携
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppState } from './hooks';
import {
  stateToExportData,
  exportDataToState,
  exportToJSON,
  exportToSVG,
  importFromJSON,
  importFromFile,
  downloadAsFile,
  saveToLocalStorage,
  loadFromLocalStorage,
  getLocalStorageKeys,
  AutoSave,
  type VenueLayoutData,
  type ExportData,
  type ImportResult
} from '../utils/dataStorage';

/**
 * データエクスポート機能のフック
 */
export const useDataExport = () => {
  const { state } = useAppState();

  const exportOperations = {
    /**
     * JSON形式でエクスポート
     */
    exportJSON: useCallback((
      metadata?: VenueLayoutData['metadata'],
      exportType?: ExportData['exportType']
    ) => {
      const jsonString = exportToJSON(state, metadata, exportType);
      const filename = `${metadata?.name || 'venue-layout'}_${new Date().toISOString().split('T')[0]}.json`;
      downloadAsFile(jsonString, filename, 'application/json');
      return jsonString;
    }, [state]),

    /**
     * SVG形式でエクスポート
     */
    exportSVG: useCallback((filename?: string) => {
      try {
        const svgString = exportToSVG(state);
        const defaultFilename = `venue-layout_${new Date().toISOString().split('T')[0]}.svg`;
        downloadAsFile(svgString, filename || defaultFilename, 'image/svg+xml');
        return svgString;
      } catch (error) {
        throw new Error(`SVGエクスポートに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, [state]),

    /**
     * エクスポートデータを取得（ダウンロードなし）
     */
    getExportData: useCallback((
      metadata?: VenueLayoutData['metadata'],
      exportType?: ExportData['exportType']
    ) => {
      return stateToExportData(state, metadata, exportType);
    }, [state]),

    /**
     * JSON文字列を取得（ダウンロードなし）
     */
    getJSONString: useCallback((
      metadata?: VenueLayoutData['metadata'],
      exportType?: ExportData['exportType']
    ) => {
      return exportToJSON(state, metadata, exportType);
    }, [state])
  };

  return exportOperations;
};

/**
 * データインポート機能のフック
 */
export const useDataImport = () => {
  const { actions } = useAppState();

  const importOperations = {
    /**
     * JSON文字列からインポート
     */
    importFromJSON: useCallback((jsonString: string): ImportResult => {
      const result = importFromJSON(jsonString);
      
      if (result.success && result.data) {
        const stateData = exportDataToState(result.data);
        actions.loadState(stateData);
        actions.saveSnapshot(`データをインポート: ${result.data.metadata.name || 'Untitled'}`);
      }
      
      return result;
    }, [actions]),

    /**
     * ファイルからインポート
     */
    importFromFile: useCallback(async (file: File): Promise<ImportResult> => {
      const result = await importFromFile(file);
      
      if (result.success && result.data) {
        const stateData = exportDataToState(result.data);
        actions.loadState(stateData);
        actions.saveSnapshot(`ファイルからインポート: ${file.name}`);
      }
      
      return result;
    }, [actions]),

    /**
     * ファイル選択ダイアログを開いてインポート
     */
    importFromFileDialog: useCallback((): Promise<ImportResult> => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const result = await importFromFile(file);
            
            if (result.success && result.data) {
              const stateData = exportDataToState(result.data);
              actions.loadState(stateData);
              actions.saveSnapshot(`ファイルからインポート: ${file.name}`);
            }
            
            resolve(result);
          } else {
            resolve({
              success: false,
              error: 'ファイルが選択されませんでした'
            });
          }
        };
        
        input.click();
      });
    }, [actions])
  };

  return importOperations;
};

/**
 * ローカルストレージ機能のフック
 */
export const useLocalStorage = () => {
  const { state, actions } = useAppState();

  const localStorageOperations = {
    /**
     * ローカルストレージに保存
     */
    save: useCallback((key?: string): boolean => {
      const storageKey = key || `venue-layout-${Date.now()}`;
      const exportData = stateToExportData(state);
      const success = saveToLocalStorage(storageKey, exportData);
      
      if (success) {
        actions.saveSnapshot(`ローカルストレージに保存: ${storageKey}`);
      }
      
      return success;
    }, [state, actions]),

    /**
     * ローカルストレージから読み込み
     */
    load: useCallback((key: string): ImportResult => {
      const result = loadFromLocalStorage(key);
      
      if (result.success && result.data) {
        const stateData = exportDataToState(result.data);
        actions.loadState(stateData);
        actions.saveSnapshot(`ローカルストレージから読み込み: ${key}`);
      }
      
      return result;
    }, [actions]),

    /**
     * 保存されたキー一覧を取得
     */
    getSavedKeys: useCallback((): string[] => {
      return getLocalStorageKeys('venue-layout-');
    }, []),

    /**
     * 保存されたデータの詳細情報を取得
     */
    getSavedDataInfo: useCallback((): Array<{
      key: string;
      name: string;
      timestamp: number;
      tableCount: number;
    }> => {
      const keys = getLocalStorageKeys('venue-layout-');
      const dataInfo: Array<{
        key: string;
        name: string;
        timestamp: number;
        tableCount: number;
      }> = [];

      keys.forEach(key => {
        const result = loadFromLocalStorage(key);
        if (result.success && result.data) {
          dataInfo.push({
            key,
            name: result.data.metadata.name || 'Untitled',
            timestamp: result.data.timestamp,
            tableCount: result.data.tables.length
          });
        }
      });

      // タイムスタンプでソート（新しい順）
      return dataInfo.sort((a, b) => b.timestamp - a.timestamp);
    }, []),

    /**
     * ローカルストレージからデータを削除
     */
    remove: useCallback((key: string): void => {
      localStorage.removeItem(key);
    }, [])
  };

  return localStorageOperations;
};

/**
 * 自動保存機能のフック
 */
export const useAutoSave = (enabled: boolean = true, interval: number = 30000) => {
  const { state } = useAppState();
  const autoSaveRef = useRef<AutoSave | null>(null);

  // 自動保存インスタンスの初期化
  useEffect(() => {
    if (enabled) {
      autoSaveRef.current = new AutoSave('venue-layout-autosave', interval);
    }

    return () => {
      if (autoSaveRef.current) {
        autoSaveRef.current.stop();
      }
    };
  }, [enabled, interval]);

  // 自動保存の開始/停止
  useEffect(() => {
    if (enabled && autoSaveRef.current) {
      const getData = (): VenueLayoutData => {
        return stateToExportData(state, {
          name: 'Auto Save',
          description: 'Automatically saved data'
        });
      };

      autoSaveRef.current.start(getData);
    } else if (autoSaveRef.current) {
      autoSaveRef.current.stop();
    }
  }, [enabled, state]);

  const autoSaveOperations = {
    /**
     * 手動で自動保存を実行
     */
    saveNow: useCallback((): boolean => {
      if (autoSaveRef.current) {
        const data = stateToExportData(state, {
          name: 'Manual Save',
          description: 'Manually saved data'
        });
        return autoSaveRef.current.saveNow(data);
      }
      return false;
    }, [state]),

    /**
     * 自動保存データを読み込み
     */
    loadAutoSave: useCallback((): ImportResult => {
      if (autoSaveRef.current) {
        return autoSaveRef.current.load();
      }
      return {
        success: false,
        error: '自動保存が有効ではありません'
      };
    }, []),

    /**
     * 自動保存データを削除
     */
    clearAutoSave: useCallback((): void => {
      if (autoSaveRef.current) {
        autoSaveRef.current.clear();
      }
    }, []),

    /**
     * 自動保存の有効/無効状態
     */
    isEnabled: enabled
  };

  return autoSaveOperations;
};

/**
 * 統合データ管理フック
 * エクスポート、インポート、ローカルストレージ、自動保存を統合
 */
export const useDataManager = (autoSaveEnabled: boolean = true) => {
  const exportOps = useDataExport();
  const importOps = useDataImport();
  const localStorageOps = useLocalStorage();
  const autoSaveOps = useAutoSave(autoSaveEnabled);

  const dataManager = {
    // エクスポート機能
    export: exportOps,
    
    // インポート機能
    import: importOps,
    
    // ローカルストレージ機能
    localStorage: localStorageOps,
    
    // 自動保存機能
    autoSave: autoSaveOps,

    // 統合操作
    operations: {
      /**
       * クイック保存（ローカルストレージ + 自動保存）
       */
      quickSave: useCallback((): boolean => {
        const localSuccess = localStorageOps.save(`venue-layout-quick-${Date.now()}`);
        const autoSuccess = autoSaveOps.saveNow();
        return localSuccess && autoSuccess;
      }, [localStorageOps, autoSaveOps]),

      /**
       * 完全バックアップ（JSON + SVG + ローカルストレージ）
       */
      fullBackup: useCallback((metadata?: VenueLayoutData['metadata']) => {
        const results = {
          json: false,
          svg: false,
          localStorage: false
        };

        try {
          // JSON エクスポート
          exportOps.exportJSON(metadata);
          results.json = true;

          // SVG エクスポート
          exportOps.exportSVG();
          results.svg = true;

          // ローカルストレージ保存
          results.localStorage = localStorageOps.save(`venue-layout-backup-${Date.now()}`);
        } catch (error) {
          console.error('Full backup failed:', error);
        }

        return results;
      }, [exportOps, localStorageOps])
    }
  };

  return dataManager;
};