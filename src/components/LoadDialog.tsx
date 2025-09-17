import React, { useState, useRef, useEffect } from 'react';
import type { ProjectData, LoadResult } from '../types/index';
import { loadProjectFromJSON, hasAutoSavedProject, loadAutoSavedProject } from '../utils/projectUtils';

interface LoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (projectData: ProjectData) => void;
}

export const LoadDialog: React.FC<LoadDialogProps> = ({
  isOpen,
  onClose,
  onLoad
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() =>{
    if (isOpen) {
      // ダイアログオープン時に初期化
      setIsLoading(false);
      setError(null);
      setWarnings([]);
    }
  }, [isOpen]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const result: LoadResult = await loadProjectFromJSON(file);
      
      if (result.success && result.data) {
        if (result.warnings && result.warnings.length > 0) {
          setWarnings(result.warnings);
          // 警告があっても読み込みを続行するか確認
          const proceed = window.confirm(
            `以下の警告があります:\n${result.warnings.join('\n')}\n\n読み込みを続行しますか？`
          );
          if (!proceed) {
            setIsLoading(false);
            return;
          }
        }
        
        onLoad(result.data);
        onClose();
      } else {
        setError(result.error || '不明なエラーが発生しました');
      }
    } catch (err) {
      setError('ファイルの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAutoSaved = () => {
    try {
      const autoSavedData = loadAutoSavedProject();
      if (autoSavedData) {
        onLoad(autoSavedData);
        onClose();
      } else {
        setError('自動保存データが見つからないか、破損しています');
      }
    } catch (err) {
      setError('自動保存データの読み込みに失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
        <h3>プロジェクトを読み込み</h3>
        
        {/* ファイル選択エリア */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          style={{display: 'none'}}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={"btn-action btn-mini btn-mr"}
        >
          ファイルを選択
        </button>

        {/* 自動保存データの読み込み */}
        {hasAutoSavedProject() && (
          <button
            onClick={handleLoadAutoSaved}
            className="btn-action btn-mini btn-mr"
          >
            自動保存データを読み込み
          </button>
        )}

        <button
          onClick={onClose}
          className="btn-cancel btn-mini"
        >
          キャンセル
        </button>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="error-text">{error}</p>
          </div>
        )}

        {/* 警告表示 */}
        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 font-medium mb-1">警告:</p>
            <ul className="text-sm text-yellow-700">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
};