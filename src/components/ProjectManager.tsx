import React, { useState, useEffect } from 'react';
import { LoadDialog } from './LoadDialog';
import type { ProjectData, TableObject, SVGData } from '../types/index';
import { downloadProjectAsJSON, autoSaveProject, hasAutoSavedProject } from '../utils/projectUtils';

interface ProjectManagerProps {
  tables: TableObject[];
  svgData: SVGData | null;
  onLoadProject: (projectData: ProjectData) => void;
  onLastSaveTimeChange?: (lastSaveTime: Date | null) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  tables,
  svgData,
  onLoadProject,
  onLastSaveTimeChange
}) => {
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // 自動保存の実行
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (tables.length > 0 || svgData) {
        autoSaveProject(tables, svgData, svgData?.fileName + '(自動保存)');
        setHasUnsavedChanges(false);
        const autoSaveTime = new Date();
        setLastSaveTime(autoSaveTime);

        // 親コンポーネントに最終保存時刻を通知
        onLastSaveTimeChange?.(autoSaveTime);
      }
    }, 30000); // 30秒ごとに自動保存

    return () => clearInterval(autoSaveInterval);
  }, [tables, svgData, onLastSaveTimeChange]);

  // 変更検知
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [tables, svgData]);

  const handleSaveProject = () => {
    // ダイアログを閉じる
    setShowLoadDialog(false);

    try {
      downloadProjectAsJSON(tables, svgData, svgData?.fileName || "会場レイアウト");
      const saveTime = new Date();
      setLastSaveTime(saveTime);
      setHasUnsavedChanges(false);

      // 親コンポーネントに最終保存時刻を通知
      onLastSaveTimeChange?.(saveTime);

      // 成功通知
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = 'プロジェクトが保存されました';
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    } catch (error) {
      alert('保存に失敗しました: ' + (error as Error).message);
    }
  };

  const handleLoad = (projectData: ProjectData) => {
    onLoadProject(projectData);
    setHasUnsavedChanges(false);
    const loadTime = new Date();
    setLastSaveTime(loadTime);

    // 親コンポーネントに最終保存時刻を通知
    onLastSaveTimeChange?.(loadTime);

    // 成功通知
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
    notification.textContent = 'プロジェクトが読み込まれました';
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const handleNewProject = () => {
    setShowLoadDialog(false);

    if (hasUnsavedChanges) {
      const proceed = window.confirm('未保存の変更があります。新しいプロジェクトを作成しますか？');
      if (!proceed) return;
    }

    // 新しいプロジェクトの作成（空の状態）
    const emptyProject: ProjectData = {
      projectInfo: {
        name: '新しいプロジェクト',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0'
      },
      venue: {
        dimensions: { width: 800, height: 600 }
      },
      tables: []
    };

    onLoadProject(emptyProject);
    setHasUnsavedChanges(false);
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSaveProject();
            break;
          case 'o':
            e.preventDefault();
            setShowLoadDialog(true);
            break;
          case 'n':
            e.preventDefault();
            handleNewProject();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges]);

  return (
    <div className="flex items-center space-x-2">
      {/* 新規プロジェクト */}
      <button
        onClick={handleNewProject}
        className="btn-action btn-mr"
        title="新しいプロジェクト (Ctrl+N)"
      >
        新規
      </button>

      {/* 保存ボタン */}
      <button
        onClick={handleSaveProject}
        className="btn-action btn-mr"
        title="プロジェクトを保存 (Ctrl+S)"
        disabled={(svgData == null)}
      >
        保存
      </button>

      {/* 読み込みボタン */}
      <button
        onClick={() => setShowLoadDialog(true)}
        className="btn-action"
        title="プロジェクトを読み込み (Ctrl+O)"
      >
        読み込み
      </button>

      {/* ダイアログ */}
      <LoadDialog
        isOpen={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        onLoad={handleLoad}
      />
    </div>
  );
};
export default ProjectManager;