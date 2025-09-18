import React, { useState } from 'react'
import SVGLoader from './components/SVGLoader'
import TableToolbar from './components/TableToolbar'
import EnhancedCanvas from './components/EnhancedCanvas'
import BoundaryAreaSelector from './components/BoundaryAreaSelector'
import GridSnapControls from './components/GridSnapControls'
import ErrorDisplay from './components/ErrorDisplay'
import TextBoxEditor from './components/TextBoxEditor'
import ShapeEditor from './components/ShapeEditor'
import ProjectManager from './components/ProjectManager'
import { useErrorHandler } from './hooks/useErrorHandler'
import type { SVGData, TableObject, BoundaryArea, TextBoxProps, ProjectData } from './types/index'
import './App.css'

function App() {
  const [svgData, setSvgData] = useState<SVGData | null>(null)
  const [tables, setTables] = useState<TableObject[]>([])
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([])
  const [boundaryArea, setBoundaryArea] = useState<BoundaryArea | null>(null)
  const [isBoundarySettingMode, setIsBoundarySettingMode] = useState(false)

  // グリッドスナップ設定
  const [gridSize, setGridSize] = useState(1000)
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)

  // テキストボックス編集用の状態
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null)

  // 図形編集用の状態
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null)

  // プロジェクト管理用の状態
  const [currentProjectName, setCurrentProjectName] = useState<string>('')
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)

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

  const handleCreateTable = (type: 'rectangle' | 'circle' | 'svg' | 'textbox', props: any) => {
    if (!svgData) {
      setError('SVG会場図を先に読み込んでください')
      return
    }

    // 会場の中央付近にランダムに配置
    const centerX = svgData.width / 2
    const centerY = svgData.height / 2
    const randomOffsetX = (Math.random() - 0.5) * 1000
    const randomOffsetY = (Math.random() - 0.5) * 1000

    const newTable: TableObject = {
      id: `table_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      position: {
        x: centerX + randomOffsetX,
        y: centerY + randomOffsetY
      },
      properties: props
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
        x: originalTable.position.x + 500, // 500mm右にオフセット
        y: originalTable.position.y + 500  // 500mm下にオフセット
      }
    }

    setTables(prev => [...prev, newTable])
    setSelectedTableIds([newTable.id])
  }

  // 複数選択時の削除処理
  const handleMultipleTableDelete = (ids: string[]) => {
    setTables(prev => prev.filter(table => !ids.includes(table.id)))
    setSelectedTableIds([])
  }

  // 複数選択時の複製処理
  const handleMultipleTableDuplicate = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    const newTables: TableObject[] = selectedTables.map((originalTable, index) => ({
      ...originalTable,
      id: `table_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${index}`,
      position: {
        x: originalTable.position.x + 500, // 500mm右にオフセット
        y: originalTable.position.y + 500  // 500mm下にオフセット
      }
    }))

    setTables(prev => [...prev, ...newTables])
    setSelectedTableIds(newTables.map(table => table.id))
  }

  // 複数選択時の上揃え処理
  const handleAlignTop = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    // 最初に選択されたテーブルを取得
    const primaryTable = tables.find(table => table.id == ids[0])!;

    // 最初に選択されたテーブルの高さを取得
    const primaryTableHeight = () => {
      if (primaryTable.type === 'circle') {
        const props = primaryTable.properties as { radius: number };
        return props.radius * 2; // 直径
      } else {
        const props = primaryTable.properties as any;
        return props.height;
      }
      return 0;
    }
    // 最初に選択されたテーブルの上辺の座標を取得
    const primaryTopY = primaryTable.position.y - (primaryTableHeight() / 2);

    setTables(prev => prev.map(table => {
      if (ids.includes(table.id)) {
        // それぞれのテーブルの高さを取得
        const tableHeight = () => {
          if (table.type === 'circle') {
            const props = table.properties as { radius: number };
            return props.radius * 2; // 直径
          } else {
            const props = table.properties as any;
            return props.height;
          }
          return 0;
        }

        // 新しい中心座標を設定
        return {
          ...table,
          position: {
            x: table.position.x,
            y: primaryTopY + (tableHeight() / 2)
          }
        };
      }
      return table;
    }));
  }

  // 複数選択時の上下中央揃え処理
  const handleVerticallyCentered = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    // 最初に選択されたテーブルの中心Y座標を取得
    const primaryTable = tables.find(table => table.id == ids[0])!;
    const baseY = primaryTable.position.y;

    setTables(prev => prev.map(table => {
      if (ids.includes(table.id)) {

        return {
          ...table,
          position: {
            x: table.position.x,
            y: baseY
          }
        };
      }
      return table;
    }));
  }

  // 複数選択時の下揃え処理
  const handleAlignBottom = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    // 最初に選択されたテーブルを取得
    const primaryTable = tables.find(table => table.id == ids[0])!;

    // 最初に選択されたテーブルの高さを取得
    const primaryTableHeight = () => {
      if (primaryTable.type === 'circle') {
        const props = primaryTable.properties as { radius: number };
        return props.radius * 2; // 直径
      } else {
        const props = primaryTable.properties as any;
        return props.height;
      }
      return 0;
    }
    // 最初に選択されたテーブルの下辺の座標を取得
    const primaryBottomY = primaryTable.position.y + (primaryTableHeight() / 2);

    setTables(prev => prev.map(table => {
      if (ids.includes(table.id)) {
        // それぞれのテーブルの高さを取得
        const tableHeight = () => {
          if (table.type === 'circle') {
            const props = table.properties as { radius: number };
            return props.radius * 2; // 直径
          } else {
            const props = table.properties as any;
            return props.height;
          }
          return 0;
        }

        return {
          ...table,
          position: {
            x: table.position.x,
            y: primaryBottomY - (tableHeight() / 2)
          }
        };
      }
      return table;
    }));
  }

  // 複数選択時の左揃え処理
  const handleAlignLeft = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    // 最初に選択されたテーブルを取得
    const primaryTable = tables.find(table => table.id == ids[0])!;

    // 最初に選択されたテーブルの幅を取得
    const primaryTableWidth = () => {
      if (primaryTable.type === 'circle') {
        const props = primaryTable.properties as { radius: number };
        return props.radius * 2; // 直径
      } else {
        const props = primaryTable.properties as any;
        return props.width;
      }
      return 0;
    }
    // 最初に選択されたテーブルの左辺の座標を取得
    const primaryLeftX = primaryTable.position.x - (primaryTableWidth() / 2);

    setTables(prev => prev.map(table => {
      if (ids.includes(table.id)) {
        // それぞれのテーブルの幅を取得
        const tableWidth = () => {
          if (table.type === 'circle') {
            const props = table.properties as { radius: number };
            return props.radius * 2; // 直径
          } else {
            const props = table.properties as any;
            return props.width;
          }
          return 0;
        }

        // 新しい中心座標を設定
        return {
          ...table,
          position: {
            x: primaryLeftX + (tableWidth() / 2),
            y: table.position.y
          }
        };
      }
      return table;
    }));
  }

  // 複数選択時の左右中央揃え処理
  const handleHorizontallyCentered = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    // 最初に選択されたテーブルの中心X座標を取得
    const primaryTable = tables.find(table => table.id == ids[0])!;
    const baseX = primaryTable.position.x;

    setTables(prev => prev.map(table => {
      if (ids.includes(table.id)) {

        return {
          ...table,
          position: {
            x: baseX,
            y: table.position.y
          }
        };
      }
      return table;
    }));
  }

  // 複数選択時の右揃え処理
  const handleAlignRight = (ids: string[]) => {
    const selectedTables = tables.filter(table => ids.includes(table.id))
    if (selectedTables.length === 0) return

    // 最初に選択されたテーブルを取得
    const primaryTable = tables.find(table => table.id == ids[0])!;

    // 最初に選択されたテーブルの幅を取得
    const primaryTableWidth = () => {
      if (primaryTable.type === 'circle') {
        const props = primaryTable.properties as { radius: number };
        return props.radius * 2; // 直径
      } else {
        const props = primaryTable.properties as any;
        return props.width;
      }
      return 0;
    }
    // 最初に選択されたテーブルの右辺の座標を取得
    const primaryRightX = primaryTable.position.x + (primaryTableWidth() / 2);

    setTables(prev => prev.map(table => {
      if (ids.includes(table.id)) {
        // それぞれのテーブルの幅を取得
        const tableWidth = () => {
          if (table.type === 'circle') {
            const props = table.properties as { radius: number };
            return props.radius * 2; // 直径
          } else {
            const props = table.properties as any;
            return props.width;
          }
          return 0;
        }

        // 新しい中心座標を設定
        return {
          ...table,
          position: {
            x: primaryRightX - (tableWidth() / 2),
            y: table.position.y
          }
        };
      }
      return table;
    }));
  }

  // テキストボックス編集ハンドラー
  const handleTextBoxDoubleClick = (id: string) => {
    setEditingTextBoxId(id);
  };

  // circle と rectangle のダブルクリック処理
  const handleShapeDoubleClick = (id: string) => {
    setEditingShapeId(id);
  };

  const handleTextBoxSave = (id: string, properties: TextBoxProps) => {
    setTables(prev => prev.map(table =>
      table.id === id
        ? { ...table, properties }
        : table
    ));
    setEditingTextBoxId(null);
  };

  const handleTextBoxEditCancel = () => {
    setEditingTextBoxId(null);
  };

  // 図形編集ハンドラー
  const handleShapeSave = (id: string, properties: any) => {
    setTables(prev => prev.map(table =>
      table.id === id
        ? { ...table, properties }
        : table
    ));
    setEditingShapeId(null);
  };

  const handleShapeEditCancel = () => {
    setEditingShapeId(null);
  };

  // プロジェクト読み込みハンドラー
  const handleLoadProject = (projectData: ProjectData) => {
    // プロジェクト情報を設定
    setCurrentProjectName(projectData.projectInfo.name);

    // 会場データを設定
    if (projectData.venue.svgData) {
      setSvgData(projectData.venue.svgData);
    } else {
      setSvgData(null);
    }

    // テーブルデータを設定
    setTables(projectData.tables);

    // 選択状態をクリア
    setSelectedTableIds([]);
    setEditingTextBoxId(null);
    setEditingShapeId(null);

    // 境界エリアをクリア
    setBoundaryArea(null);
    setIsBoundarySettingMode(false);

    // エラーをクリア
    clearError();
  };

  const selectedTables = tables.filter(table => selectedTableIds.includes(table.id))
  const primarySelectedTable = selectedTables.length > 0 ? selectedTables[0] : null
  const editingTextBox = editingTextBoxId ? tables.find(table => table.id === editingTextBoxId) : null
  const editingShape = editingShapeId ? tables.find(table => table.id === editingShapeId) : null

  return (
    <div className="App">
      <div className="venue-layout-editor">
        <div className="editor-header">
          <div className="header-left">
            <h1>会場レイアウトエディター</h1>
            {currentProjectName && (
              <span className="project-name">- {currentProjectName}</span>
            )}
          </div>
          <div className="header-right">
            <ProjectManager
              tables={tables}
              svgData={svgData}
              onLoadProject={handleLoadProject}
              onLastSaveTimeChange={setLastSaveTime}
            />
          </div>
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
              onUpdateTable={() => { }} // 今回は実装しない
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
                onMultipleTableDelete={handleMultipleTableDelete}
                onMultipleTableDuplicate={handleMultipleTableDuplicate}
                boundaryArea={boundaryArea || undefined}
                onBoundaryAreaSet={handleBoundaryAreaSet}
                isBoundarySettingMode={isBoundarySettingMode}
                gridSize={gridSize}
                snapEnabled={snapEnabled}
                gridVisible={gridVisible}
                onAlignTop={handleAlignTop}
                onVerticallyCentered={handleVerticallyCentered}
                onAlignBottom={handleAlignBottom}
                onAlignLeft={handleAlignLeft}
                onHorizontallyCentered={handleHorizontallyCentered}
                onAlignRight={handleAlignRight}
                onTextBoxDoubleClick={handleTextBoxDoubleClick}
                onShapeDoubleClick={handleShapeDoubleClick}
                lastSaveTime={lastSaveTime}
              />
            ) : (
              <div className="canvas-empty">
                <p>SVG会場図を読み込んでください</p>
              </div>
            )}
          </div>
        </div>

        {/* テキストボックス編集モーダル */}
        {editingTextBox && (
          <TextBoxEditor
            isOpen={!!editingTextBoxId}
            textBoxId={editingTextBoxId!}
            properties={editingTextBox.properties as TextBoxProps}
            onSave={handleTextBoxSave}
            onCancel={handleTextBoxEditCancel}
          />
        )}

        {/* 図形編集モーダル */}
        {editingShape && (editingShape.type === 'rectangle' || editingShape.type === 'circle') && (
          <ShapeEditor
            isOpen={!!editingShapeId}
            shapeId={editingShapeId!}
            shapeType={editingShape.type}
            properties={editingShape.properties as any}
            onSave={handleShapeSave}
            onCancel={handleShapeEditCancel}
          />
        )}
      </div>
    </div>
  )
}

export default App
