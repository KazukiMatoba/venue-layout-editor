/**
 * データ管理UIコンポーネント
 * 保存・読み込み・エクスポート・インポート機能のUI
 */

import React, { useState, useCallback } from 'react';
import { useDataManager } from '../store/dataHooks';
import type { VenueLayoutData, ImportResult } from '../utils/dataStorage';

interface DataManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * データ管理メインコンポーネント
 */
const DataManager: React.FC<DataManagerProps> = ({ className, style }) => {
  const dataManager = useDataManager(true); // 自動保存有効
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showSavedData, setShowSavedData] = useState(false);
  const [metadata, setMetadata] = useState<VenueLayoutData['metadata']>({
    name: '',
    description: '',
    author: '',
    tags: []
  });

  // メッセージを表示
  const showMessage = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // JSON エクスポート
  const handleExportJSON = useCallback(async () => {
    setIsLoading(true);
    try {
      dataManager.export.exportJSON(metadata, 'full');
      showMessage('success', 'JSONファイルをダウンロードしました');
    } catch (error) {
      showMessage('error', `エクスポートに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, metadata, showMessage]);

  // SVG エクスポート
  const handleExportSVG = useCallback(async () => {
    setIsLoading(true);
    try {
      dataManager.export.exportSVG();
      showMessage('success', 'SVGファイルをダウンロードしました');
    } catch (error) {
      showMessage('error', `SVGエクスポートに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, showMessage]);

  // ファイルインポート
  const handleImportFile = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: ImportResult = await dataManager.import.importFromFileDialog();
      
      if (result.success) {
        showMessage('success', 'ファイルを正常にインポートしました');
        if (result.warnings && result.warnings.length > 0) {
          showMessage('info', `警告: ${result.warnings.join(', ')}`);
        }
      } else {
        showMessage('error', result.error || 'インポートに失敗しました');
      }
    } catch (error) {
      showMessage('error', `インポートに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, showMessage]);

  // ローカルストレージに保存
  const handleSaveLocal = useCallback(() => {
    setIsLoading(true);
    try {
      const success = dataManager.localStorage.save();
      if (success) {
        showMessage('success', 'ローカルストレージに保存しました');
      } else {
        showMessage('error', 'ローカルストレージへの保存に失敗しました');
      }
    } catch (error) {
      showMessage('error', `保存に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, showMessage]);

  // ローカルストレージから読み込み
  const handleLoadLocal = useCallback((key: string) => {
    setIsLoading(true);
    try {
      const result = dataManager.localStorage.load(key);
      
      if (result.success) {
        showMessage('success', 'データを正常に読み込みました');
        setShowSavedData(false);
      } else {
        showMessage('error', result.error || '読み込みに失敗しました');
      }
    } catch (error) {
      showMessage('error', `読み込みに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, showMessage]);

  // 保存データを削除
  const handleDeleteLocal = useCallback((key: string) => {
    if (confirm('このデータを削除しますか？')) {
      dataManager.localStorage.remove(key);
      showMessage('info', 'データを削除しました');
    }
  }, [dataManager, showMessage]);

  // クイック保存
  const handleQuickSave = useCallback(() => {
    setIsLoading(true);
    try {
      const success = dataManager.operations.quickSave();
      if (success) {
        showMessage('success', 'クイック保存しました');
      } else {
        showMessage('error', 'クイック保存に失敗しました');
      }
    } catch (error) {
      showMessage('error', `クイック保存に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, showMessage]);

  // 完全バックアップ
  const handleFullBackup = useCallback(() => {
    setIsLoading(true);
    try {
      const results = dataManager.operations.fullBackup(metadata);
      const successCount = Object.values(results).filter(Boolean).length;
      
      if (successCount === 3) {
        showMessage('success', '完全バックアップが完了しました');
      } else if (successCount > 0) {
        showMessage('info', `部分的にバックアップしました (${successCount}/3)`);
      } else {
        showMessage('error', 'バックアップに失敗しました');
      }
    } catch (error) {
      showMessage('error', `バックアップに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataManager, metadata, showMessage]);

  // 保存されたデータ一覧を取得
  const savedDataList = dataManager.localStorage.getSavedDataInfo();

  return (
    <div className={className} style={style}>
      <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#495057' }}>
          データ管理
        </h3>

        {/* メッセージ表示 */}
        {message && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '16px',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: message.type === 'success' ? '#d4edda' : 
                           message.type === 'error' ? '#f8d7da' : '#d1ecf1',
            color: message.type === 'success' ? '#155724' : 
                   message.type === 'error' ? '#721c24' : '#0c5460',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : 
                                message.type === 'error' ? '#f5c6cb' : '#bee5eb'}`
          }}>
            {message.text}
          </div>
        )}

        {/* メタデータ入力 */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
            プロジェクト情報
          </h4>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
            <input
              type="text"
              placeholder="プロジェクト名"
              value={metadata.name || ''}
              onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
              style={{
                padding: '6px 8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
            <input
              type="text"
              placeholder="作成者"
              value={metadata.author || ''}
              onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
              style={{
                padding: '6px 8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>
          <textarea
            placeholder="説明"
            value={metadata.description || ''}
            onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '12px',
              width: '100%',
              height: '60px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* エクスポート機能 */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
            エクスポート
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportJSON}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              JSON
            </button>
            <button
              onClick={handleExportSVG}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              SVG
            </button>
            <button
              onClick={handleFullBackup}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              完全バックアップ
            </button>
          </div>
        </div>

        {/* インポート機能 */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
            インポート
          </h4>
          <button
            onClick={handleImportFile}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            ファイルから読み込み
          </button>
        </div>

        {/* ローカル保存機能 */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
            ローカル保存
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveLocal}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              保存
            </button>
            <button
              onClick={handleQuickSave}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#20c997',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              クイック保存
            </button>
            <button
              onClick={() => setShowSavedData(!showSavedData)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              保存データ一覧
            </button>
          </div>
        </div>

        {/* 自動保存ステータス */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
            自動保存
          </h4>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            ステータス: {dataManager.autoSave.isEnabled ? '有効' : '無効'}
            {dataManager.autoSave.isEnabled && (
              <span> (30秒間隔)</span>
            )}
          </div>
          <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => dataManager.autoSave.saveNow()}
              disabled={!dataManager.autoSave.isEnabled}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '4px',
                cursor: dataManager.autoSave.isEnabled ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                opacity: dataManager.autoSave.isEnabled ? 1 : 0.6
              }}
            >
              今すぐ保存
            </button>
            <button
              onClick={() => dataManager.autoSave.clearAutoSave()}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              自動保存データ削除
            </button>
          </div>
        </div>

        {/* 保存データ一覧 */}
        {showSavedData && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
              保存されたデータ ({savedDataList.length}件)
            </h4>
            {savedDataList.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>
                保存されたデータはありません
              </p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {savedDataList.map((data) => (
                  <div
                    key={data.key}
                    style={{
                      padding: '8px',
                      marginBottom: '4px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                      {data.name}
                    </div>
                    <div style={{ color: '#6c757d', marginBottom: '4px' }}>
                      {new Date(data.timestamp).toLocaleString('ja-JP')} | 
                      テーブル数: {data.tableCount}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleLoadLocal(data.key)}
                        disabled={isLoading}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          opacity: isLoading ? 0.6 : 1
                        }}
                      >
                        読み込み
                      </button>
                      <button
                        onClick={() => handleDeleteLocal(data.key)}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManager;