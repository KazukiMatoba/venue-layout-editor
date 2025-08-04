import React, { useState } from 'react';
import type { VenueLayoutEditorProps } from '../types/components';
import type { SVGData, TableObject } from '../types';
import SVGLoader from './SVGLoader';
import TableToolbar from './TableToolbar';
import ErrorDisplay from './ErrorDisplay';
import { useErrorHandler } from '../hooks/useErrorHandler';

/**
 * メインの会場レイアウトエディターコンポーネント
 * 基本的なSVG読み込みとテーブル作成機能を提供
 */
const VenueLayoutEditor: React.FC<VenueLayoutEditorProps> = ({
  initialVenue,
  onSave,
  onExport,
}) => {
  const [svgData, setSvgData] = useState<SVGData | null>(initialVenue?.svgData || null);
  const [tables, setTables] = useState<TableObject[]>(initialVenue?.tables || []);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const { error, setError, clearError } = useErrorHandler();

  const handleSVGLoad = (data: SVGData) => {
    setSvgData(data);
    setTables([]); // 新しいSVGを読み込んだらテーブルをクリア
    clearError();
  };

  const handleSVGError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleCreateTable = (type: 'rectangle' | 'circle', props: any) => {
    if (!svgData) {
      setError('SVG会場図を先に読み込んでください');
      return;
    }

    const newTable: TableObject = {
      id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: { x: 100, y: 100 }, // デフォルト位置
      properties: props,
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };

    setTables(prev => [...prev, newTable]);
    setSelectedTableId(newTable.id);
  };

  const selectedTable = tables.find(table => table.id === selectedTableId) || null;

  return (
    <div className="venue-layout-editor">
      <div className="editor-header">
        <h1>会場レイアウトエディター</h1>
      </div>
      
      {error && (
        <ErrorDisplay
          message={error}
          onDismiss={clearError}
          type="error"
        />
      )}
      
      <div className="editor-content">
        <div className="editor-sidebar">
          <SVGLoader
            onSVGLoad={handleSVGLoad}
            onError={handleSVGError}
          />
          
          <TableToolbar
            onCreateTable={handleCreateTable}
            selectedTable={selectedTable}
            onUpdateTable={() => {}} // 今回は実装しない
          />
        </div>
        
        <div className="editor-main">
          {svgData ? (
            <div className="canvas-container">
              <div className="canvas-info">
                <p>会場サイズ: {svgData.width} × {svgData.height} mm</p>
                <p>テーブル数: {tables.length}</p>
              </div>
              {/* キャンバスは後で実装 */}
              <div className="canvas-placeholder">
                <p>キャンバス表示エリア</p>
                <p>SVG: {svgData.width}×{svgData.height}</p>
                {tables.map(table => (
                  <div key={table.id} className="table-item">
                    {table.type} - {table.id}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="canvas-empty">
              <p>SVG会場図を読み込んでください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VenueLayoutEditor;