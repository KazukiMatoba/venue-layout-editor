import React, { useState } from 'react'
import SVGLoader from './components/SVGLoader'
import TableToolbar from './components/TableToolbar'
import EnhancedCanvas from './components/EnhancedCanvas'
import BoundaryAreaSelector from './components/BoundaryAreaSelector'
import GridSnapControls from './components/GridSnapControls'
import ErrorDisplay from './components/ErrorDisplay'
import { useErrorHandler } from './hooks/useErrorHandler'
import type { SVGData, TableObject, BoundaryArea } from './types'
import './App.css'

function App() {
  const [svgData, setSvgData] = useState<SVGData | null>(null)
  const [tables, setTables] = useState<TableObject[]>([])
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([])
  const [boundaryArea, setBoundaryArea] = useState<BoundaryArea | null>(null)
  const [isBoundarySettingMode, setIsBoundarySettingMode] = useState(false)
  
  // グリッドスナップ設定
  const [gridSize, setGridSize] = useState(100)
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)
  
  const { error, setError, clearError } = useErrorHandler()

  const handleSVGLoad = (data: SVGData) => {
    setSvgData(data)
    setTables([]) // 新しいSVGを読み込んだらテーブルをクリア
    setBoundaryArea(null) // 境界エリアもクリア
    setIsBoundarySettingMode(false)
    clearError()
  }

  const handleSVGError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleCreateTable = (type: 'rectangle' | 'circle' | 'svg', props: any) => {
    if (!svgData) {
      setError('SVG会場図を先に読み込んでください')
      return
    }

    // 会場の中央付近にランダムに配置
    const centerX = svgData.width / 2
    const centerY = svgData.height / 2
    const randomOffsetX = (Math.random() - 0.5) * 200
    const randomOffsetY = (Math.random() - 0.5) * 200

    const newTable: TableObject = {
      id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: { 
        x: centerX + randomOffsetX, 
        y: centerY + randomOffsetY 
      },
      properties: props,
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    }

    setTables(prev => [...prev, newTable])
    setSelectedTableIds([newTable.id])
  }

  // 複数選択対応のテーブル選択ハンドラー
  const handleTableSelect = (id: string | null, ctrlKey: boolean = false) => {
    if (id === null) {
      setSelectedTableIds([]);
      return;
    }

    if (ctrlKey) {
      // Ctrlキー押下時は複数選択
      setSelectedTableIds(prev => {
        if (prev.includes(id)) {
          // 既に選択されている場合は選択解除
          return prev.filter(tableId => tableId !== id);
        } else {
          // 新しく選択に追加
          return [...prev, id];
        }
      });
    } else {
      // 通常クリックは単一選択
      setSelectedTableIds([id]);
    }
  };

  const handleTableMove = (id: string, position: { x: number; y: number }) => {
    setTables(prev => prev.map(table => 
      table.id === id 
        ? { ...table, position }
        : table
    ))
  }

  // 複数テーブルの同時移動ハンドラー
  const handleMultipleTableMove = (leadTableId: string, newPosition: { x: number; y: number }) => {
    if (selectedTableIds.length <= 1) {
      // 単一選択の場合は通常の移動
      handleTableMove(leadTableId, newPosition);
      return;
    }

    // 複数選択の場合は相対移動
    const leadTable = tables.find(table => table.id === leadTableId);
    if (!leadTable) return;

    const deltaX = newPosition.x - leadTable.position.x;
    const deltaY = newPosition.y - leadTable.position.y;

    setTables(prev => prev.map(table => {
      if (selectedTableIds.includes(table.id)) {
        return {
          ...table,
          position: {
            x: table.position.x + deltaX,
            y: table.position.y + deltaY
          }
        };
      }
      return table;
    }));
  };

  const handleBoundaryAreaSet = (boundary: BoundaryArea) => {
    setBoundaryArea(boundary)
    setIsBoundarySettingMode(false)
  }

  const handleStartBoundarySettings = () => {
    setIsBoundarySettingMode(true)
    setSelectedTableIds([]) // テーブル選択を解除
  }

  const handleCancelBoundarySettings = () => {
    setIsBoundarySettingMode(false)
  }

  const handleTableDelete = (id: string) => {
    setTables(prev => prev.filter(table => table.id !== id))
    setSelectedTableIds(prev => prev.filter(tableId => tableId !== id))
  }

  const handleTableDuplicate = (id: string) => {
    const originalTable = tables.find(table => table.id === id)
    if (!originalTable) return

    const newTable: TableObject = {
      ...originalTable,
      id: `table_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      position: {
        x: originalTable.position.x + 50, // 50mm右にオフセット
        y: originalTable.position.y + 50  // 50mm下にオフセット
      }
    }

    setTables(prev => [...prev, newTable])
    setSelectedTableIds([newTable.id])
  }

  const selectedTables = tables.filter(table => selectedTableIds.includes(table.id))
  const primarySelectedTable = selectedTables.length > 0 ? selectedTables[0] : null

  return (
    <div className="App">
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
            
            {svgData && (
              <BoundaryAreaSelector
                onBoundarySet={handleStartBoundarySettings}
                onCancel={handleCancelBoundarySettings}
                isActive={isBoundarySettingMode}
              />
            )}
            
            <GridSnapControls
              gridSize={gridSize}
              onGridSizeChange={setGridSize}
              snapEnabled={snapEnabled}
              onSnapToggle={setSnapEnabled}
              gridVisible={gridVisible}
              onGridVisibilityToggle={setGridVisible}
            />
            
            <TableToolbar
              onCreateTable={handleCreateTable}
              selectedTable={primarySelectedTable}
              onUpdateTable={() => {}} // 今回は実装しない
            />
          </div>
          
          <div className="editor-main">
            {svgData ? (
              <EnhancedCanvas
                svgData={svgData}
                tables={tables}
                selectedTableIds={selectedTableIds}
                onTableSelect={handleTableSelect}
                onTableMove={handleMultipleTableMove}
                onTableDelete={handleTableDelete}
                onTableDuplicate={handleTableDuplicate}
                boundaryArea={boundaryArea || undefined}
                onBoundaryAreaSet={handleBoundaryAreaSet}
                isBoundarySettingMode={isBoundarySettingMode}
                gridSize={gridSize}
                snapEnabled={snapEnabled}
                gridVisible={gridVisible}
              />
            ) : (
              <div className="canvas-empty">
                <p>SVG会場図を読み込んでください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
