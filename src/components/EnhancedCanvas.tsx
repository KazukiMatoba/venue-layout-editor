import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image, Line } from 'react-konva';
import ContextMenu from './ContextMenu';
import ZoomPanControls from './ZoomPanControls';
import type { SVGData, TableObject, Position, BoundaryArea } from '../types';

interface EnhancedCanvasProps {
  svgData: SVGData;
  tables: TableObject[];
  onTableSelect?: (id: string | null, ctrlKey?: boolean) => void;
  onTableMove?: (id: string, position: Position) => void;
  onTableDelete?: (id: string) => void;
  onTableDuplicate?: (id: string) => void;
  selectedTableIds?: string[];
  boundaryArea?: BoundaryArea;
  onBoundaryAreaSet?: (boundary: BoundaryArea) => void;
  isBoundarySettingMode?: boolean;
  gridSize?: number;
  snapEnabled?: boolean;
  gridVisible?: boolean;
}

const EnhancedCanvas: React.FC<EnhancedCanvasProps> = ({
  svgData,
  tables,
  onTableSelect,
  onTableMove,
  onTableDelete,
  onTableDuplicate,
  selectedTableIds = [],
  boundaryArea,
  onBoundaryAreaSet,
  isBoundarySettingMode = false,
  gridSize = 100,
  snapEnabled = false,
  gridVisible = false
}) => {
  // 動的なキャンバスサイズ計算
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // ズーム・パン状態
  const [userScale, setUserScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // シフト+ドラッグによるパン操作の状態
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const updateCanvasSize = () => {
      // 利用可能な画面領域を計算
      const sidebar = 300; // サイドバー幅
      const headerHeight = 80; // ヘッダー高さ
      const canvasHeaderHeight = 60; // キャンバスヘッダー高さ
      const padding = 32; // パディング
      
      const availableWidth = window.innerWidth - sidebar - padding;
      const availableHeight = window.innerHeight - headerHeight - canvasHeaderHeight - padding;
      
      setCanvasSize({
        width: Math.max(600, availableWidth),
        height: Math.max(400, availableHeight)
      });
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // キーボードイベントでシフトキーの状態を監視
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isPanning) {
        // シフトキーが離されたらカーソルをデフォルトに戻す
        const stage = document.querySelector('.konvajs-content');
        if (stage) {
          (stage as HTMLElement).style.cursor = 'default';
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isPanning) {
        // シフトキーが押されたらカーソルをgrabに変更
        const stage = document.querySelector('.konvajs-content');
        if (stage) {
          (stage as HTMLElement).style.cursor = 'grab';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning]);
  
  const baseCanvasWidth = canvasSize.width;
  const baseCanvasHeight = canvasSize.height;
  const baseScaleX = baseCanvasWidth / svgData.width;
  const baseScaleY = baseCanvasHeight / svgData.height;
  const baseScale = Math.min(baseScaleX, baseScaleY);
  
  const finalScale = baseScale * userScale;
  const canvasWidth = baseCanvasWidth;
  const canvasHeight = baseCanvasHeight;

  // SVG画像を中央配置するためのオフセット計算
  const scaledSvgWidth = svgData.width * finalScale;
  const scaledSvgHeight = svgData.height * finalScale;
  const centerOffsetX = (canvasWidth - scaledSvgWidth) / 2;
  const centerOffsetY = (canvasHeight - scaledSvgHeight) / 2;

  const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // SVGテーブル用の画像管理
  const [svgTableImages, setSvgTableImages] = useState<{ [key: string]: HTMLImageElement }>({});
  
  // 境界エリア設定用の状態
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<BoundaryArea | null>(null);
  
  // 右クリックメニュー用の状態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tableId: string;
  } | null>(null);

  // ドラッグ中のテーブル位置を管理
  const [draggingPositions, setDraggingPositions] = useState<{ [tableId: string]: { x: number; y: number } }>({});

  // SVGをImageオブジェクトに変換
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    const svgBlob = new Blob([svgData.content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      setSvgImage(img);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      console.error('SVG画像の読み込みに失敗しました');
      URL.revokeObjectURL(url);
    };

    img.src = url;
    imageRef.current = img;

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [svgData.content]);

  // SVGテーブル画像を読み込む関数
  const loadSVGTableImage = async (tableId: string, svgContent: string) => {
    const img = new window.Image();
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        setSvgTableImages(prev => ({ ...prev, [tableId]: img }));
        resolve(img);
      };

      img.onerror = (error) => {
        console.error('SVGテーブル画像の読み込みに失敗しました:', error);
        reject(new Error('SVGテーブル画像の読み込みに失敗しました'));
      };

      // SVGコンテンツをData URLとして設定
      const encodedSvg = encodeURIComponent(svgContent);
      img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
    });
  };

  // SVGテーブルの画像を事前読み込み
  useEffect(() => {
    const svgTables = tables.filter(table => table.type === 'svg');
    
    svgTables.forEach(table => {
      if (!svgTableImages[table.id]) {
        const props = table.properties as any;
        if (props.svgContent) {
          loadSVGTableImage(table.id, props.svgContent).catch(error => {
            console.warn(`テーブル ${table.id} の画像読み込みに失敗:`, error);
          });
        }
      }
    });
  }, [tables]);

  // グリッドスナップ機能（境界範囲内のグリッド線にスナップ）
  const snapToGrid = (value: number, isX: boolean = true): number => {
    if (!snapEnabled) return value;
    
    const bounds = boundaryArea || { x: 0, y: 0, width: svgData.width, height: svgData.height };
    const boundaryStart = isX ? bounds.x : bounds.y;
    
    // 境界範囲の開始点からの相対位置を計算
    const relativeValue = value - boundaryStart;
    
    // 境界範囲内のグリッド線にスナップ
    const snappedRelative = Math.round(relativeValue / gridSize) * gridSize;
    
    // 絶対座標に戻す
    return boundaryStart + snappedRelative;
  };

  // 複数選択時の左上テーブルを判定する関数
  const getLeadTableId = (tables: TableObject[], selectedIds: string[]): string => {
    const selectedTables = tables.filter(table => selectedIds.includes(table.id));
    if (selectedTables.length === 0) return '';
    
    // 左上角の座標を計算してソート
    const tablesWithTopLeft = selectedTables.map(table => {
      let leftTopX: number, leftTopY: number;
      
      if (table.type === 'rectangle') {
        const props = table.properties as { width: number; height: number };
        leftTopX = table.position.x - props.width / 2;
        leftTopY = table.position.y - props.height / 2;
      } else if (table.type === 'svg') {
        const props = table.properties as any;
        leftTopX = table.position.x - props.width / 2;
        leftTopY = table.position.y - props.height / 2;
      } else {
        const props = table.properties as { radius: number };
        leftTopX = table.position.x - props.radius;
        leftTopY = table.position.y - props.radius;
      }
      
      return { table, leftTopX, leftTopY };
    });
    
    // Y座標が最小、次にX座標が最小のテーブルを選択
    tablesWithTopLeft.sort((a, b) => {
      if (Math.abs(a.leftTopY - b.leftTopY) < 1) {
        return a.leftTopX - b.leftTopX;
      }
      return a.leftTopY - b.leftTopY;
    });
    
    return tablesWithTopLeft[0].table.id;
  };

  // ズーム・パンコントロールハンドラー
  const handleScaleChange = (newScale: number) => {
    setUserScale(newScale);
  };

  const handleResetView = () => {
    setUserScale(1.0);
    setPanX(0);
    setPanY(0);
  };

  // マウスイベントハンドラー（境界エリア設定とシフト+ドラッグパン）
  const handleStageMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    
    // シフト+ドラッグでパン操作
    if (e.evt.shiftKey) {
      setIsPanning(true);
      setPanStartPos({ x: pos.x, y: pos.y });
      setPanStartOffset({ x: panX, y: panY });
      e.target.getStage().container().style.cursor = 'grabbing';
      return;
    }
    
    // 境界エリア設定モード
    if (!isBoundarySettingMode) return;
    
    // 中央配置オフセットを考慮した座標変換
    const x = (pos.x - centerOffsetX - panX) / finalScale;
    const y = (pos.y - centerOffsetY - panY) / finalScale;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleStageMouseMove = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    
    // シフト+ドラッグパン処理
    if (isPanning) {
      const deltaX = pos.x - panStartPos.x;
      const deltaY = pos.y - panStartPos.y;
      setPanX(panStartOffset.x + deltaX);
      setPanY(panStartOffset.y + deltaY);
      return;
    }
    
    // カーソル変更（シフトキー押下時）
    if (e.evt.shiftKey) {
      e.target.getStage().container().style.cursor = 'grab';
    } else {
      e.target.getStage().container().style.cursor = 'default';
    }
    
    // 境界エリア設定処理
    if (!isBoundarySettingMode || !isDrawing || !startPoint) return;
    
    // 中央配置オフセットを考慮した座標変換
    const x = (pos.x - centerOffsetX - panX) / finalScale;
    const y = (pos.y - centerOffsetY - panY) / finalScale;
    
    const width = x - startPoint.x;
    const height = y - startPoint.y;
    
    setCurrentRect({
      x: width > 0 ? startPoint.x : x,
      y: height > 0 ? startPoint.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleStageMouseUp = (e: any) => {
    // パン操作終了
    if (isPanning) {
      setIsPanning(false);
      e.target.getStage().container().style.cursor = e.evt.shiftKey ? 'grab' : 'default';
      return;
    }
    
    // 境界エリア設定処理
    if (!isBoundarySettingMode || !isDrawing || !currentRect) return;
    
    setIsDrawing(false);
    
    if (currentRect.width > 10 && currentRect.height > 10) {
      onBoundaryAreaSet?.(currentRect);
    }
    
    setStartPoint(null);
    setCurrentRect(null);
  };

  // 右クリックメニューハンドラー
  const handleTableRightClick = (e: any, tableId: string) => {
    e.evt.preventDefault();
    
    // 右クリックした実際の位置を取得
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    // ステージのDOM要素の位置を取得
    const stageContainer = stage.container();
    const rect = stageContainer.getBoundingClientRect();
    
    // ページ上の絶対座標を計算
    let absoluteX = rect.left + pointerPosition.x;
    let absoluteY = rect.top + pointerPosition.y;
    
    // メニューが画面外に出ないように調整
    const menuWidth = 150; // ContextMenuの最小幅
    const menuHeight = 80; // ContextMenuの概算高さ
    
    // 右端チェック
    if (absoluteX + menuWidth > window.innerWidth) {
      absoluteX = window.innerWidth - menuWidth - 10;
    }
    
    // 下端チェック
    if (absoluteY + menuHeight > window.innerHeight) {
      absoluteY = window.innerHeight - menuHeight - 10;
    }
    
    // 左端・上端チェック
    absoluteX = Math.max(10, absoluteX);
    absoluteY = Math.max(10, absoluteY);
    
    setContextMenu({
      x: absoluteX,
      y: absoluteY,
      tableId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleTableDelete = (tableId: string) => {
    onTableDelete?.(tableId);
  };

  const handleTableDuplicate = (tableId: string) => {
    onTableDuplicate?.(tableId);
  };

  // グリッド線の生成
  const generateGridLines = () => {
    if (!gridVisible) return [];
    
    const lines = [];
    const bounds = boundaryArea || { x: 0, y: 0, width: svgData.width, height: svgData.height };
    
    // 境界範囲内のみにグリッド線を表示
    // 境界範囲の(0,0)を基準にしてグリッド線を計算
    
    // 境界範囲内でのグリッド線の開始点と終了点を計算
    const startX = bounds.x;
    const endX = bounds.x + bounds.width;
    const startY = bounds.y;
    const endY = bounds.y + bounds.height;
    
    // 垂直線：境界範囲の左端からgridSize間隔で描画
    for (let x = startX; x <= endX; x += gridSize) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[
            (x * finalScale) + centerOffsetX + panX, 
            (startY * finalScale) + centerOffsetY + panY,
            (x * finalScale) + centerOffsetX + panX, 
            (endY * finalScale) + centerOffsetY + panY
          ]}
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    
    // 水平線：境界範囲の上端からgridSize間隔で描画
    for (let y = startY; y <= endY; y += gridSize) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[
            (startX * finalScale) + centerOffsetX + panX, 
            (y * finalScale) + centerOffsetY + panY,
            (endX * finalScale) + centerOffsetX + panX, 
            (y * finalScale) + centerOffsetY + panY
          ]}
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    
    return lines;
  };

  return (
    <div className="enhanced-canvas">
      <div className="canvas-header">
        <h4>会場レイアウト</h4>
        <ZoomPanControls
          scale={userScale}
          onScaleChange={handleScaleChange}
          onResetView={handleResetView}
        />
        {!svgImage && <p>(読み込み中...)</p>}
      </div>

      <div className="canvas-content">
        <Stage 
          width={canvasWidth} 
          height={canvasHeight}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
        >
        <Layer>
          {/* SVG背景画像の表示 */}
          {svgImage && (
            <Image
              image={svgImage}
              x={centerOffsetX + panX}
              y={centerOffsetY + panY}
              width={svgData.width * finalScale}
              height={svgData.height * finalScale}
              listening={false}
            />
          )}

          {/* グリッド線の表示 */}
          {generateGridLines()}

          {/* 設定された境界エリアの表示 */}
          {boundaryArea && (
            <Rect
              x={(boundaryArea.x * finalScale) + centerOffsetX + panX}
              y={(boundaryArea.y * finalScale) + centerOffsetY + panY}
              width={boundaryArea.width * finalScale}
              height={boundaryArea.height * finalScale}
              fill="rgba(0, 255, 0, 0.1)"
              stroke="rgba(0, 255, 0, 0.8)"
              strokeWidth={2}
              dash={[5, 5]}
              listening={false}
            />
          )}
          
          {/* 境界エリア設定中の表示 */}
          {isBoundarySettingMode && currentRect && (
            <Rect
              x={(currentRect.x * finalScale) + centerOffsetX + panX}
              y={(currentRect.y * finalScale) + centerOffsetY + panY}
              width={currentRect.width * finalScale}
              height={currentRect.height * finalScale}
              fill="rgba(0, 0, 255, 0.1)"
              stroke="rgba(0, 0, 255, 0.8)"
              strokeWidth={2}
              dash={[3, 3]}
              listening={false}
            />
          )}



          {/* テーブルの描画 */}
          {tables.map((table) => {
            const isSelected = selectedTableIds.includes(table.id);
            const x = table.position.x;
            const y = table.position.y;
            
            // ドラッグ中の場合は実際のKonva要素の位置を使用、そうでなければ計算位置を使用
            const draggingPos = draggingPositions[table.id];
            const displayX = draggingPos ? draggingPos.x : (x * finalScale) + centerOffsetX + panX;
            const displayY = draggingPos ? draggingPos.y : (y * finalScale) + centerOffsetY + panY;

            // 複数選択時の左上テーブル判定
            const isLeadTable = selectedTableIds.length > 1 ? 
              getLeadTableId(tables, selectedTableIds) === table.id : true;

            // 境界制約の計算関数（左上角ベース）
            const constrainPosition = (leftTopX: number, leftTopY: number) => {
              const bounds = boundaryArea || {
                x: 0,
                y: 0,
                width: svgData.width,
                height: svgData.height
              };

              let constrainedX = leftTopX;
              let constrainedY = leftTopY;

              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };

                // 左上角の制約
                constrainedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - props.width, leftTopX));
                constrainedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - props.height, leftTopY));
              } else if (table.type === 'circle') {
                const props = table.properties as { radius: number };
                const diameter = props.radius * 2;

                // 左上角の制約（円の場合は直径分を考慮）
                constrainedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - diameter, leftTopX));
                constrainedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - diameter, leftTopY));
              } else if (table.type === 'svg') {
                const props = table.properties as any;

                // SVGテーブルの左上角制約
                constrainedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - props.width, leftTopX));
                constrainedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - props.height, leftTopY));
              }

              // 左上角から中心位置に変換して返す（既存のposition管理との互換性のため）
              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };
                return { 
                  x: constrainedX + props.width / 2, 
                  y: constrainedY + props.height / 2 
                };
              } else if (table.type === 'svg') {
                const props = table.properties as any;
                return { 
                  x: constrainedX + props.width / 2, 
                  y: constrainedY + props.height / 2 
                };
              } else {
                const props = table.properties as { radius: number };
                return { 
                  x: constrainedX + props.radius, 
                  y: constrainedY + props.radius 
                };
              }
            };

            const handleDragMove = (e: any) => {
              // 単一選択時または複数選択時でも通常のドラッグ処理
              // ドラッグ中は1つのテーブルのみ移動

              // リアルタイムでの境界制約
              let leftTopX: number;
              let leftTopY: number;

              if (table.type === 'rectangle' || table.type === 'svg') {
                // 長方形・SVGテーブルの場合：左上角の座標を取得
                leftTopX = (e.target.x() - centerOffsetX - panX) / finalScale;
                leftTopY = (e.target.y() - centerOffsetY - panY) / finalScale;
              } else {
                // 円形の場合：中心から左上角相当の位置を計算
                const props = table.properties as { radius: number };
                leftTopX = ((e.target.x() - centerOffsetX - panX) / finalScale) - props.radius;
                leftTopY = ((e.target.y() - centerOffsetY - panY) / finalScale) - props.radius;
              }

              // 左上角をスナップ（境界範囲内のグリッド線に）
              let snappedX = snapEnabled ? snapToGrid(leftTopX, true) : leftTopX;
              let snappedY = snapEnabled ? snapToGrid(leftTopY, false) : leftTopY;

              // 境界制約を適用（左上角ベース）
              const constrained = constrainPosition(snappedX, snappedY);
              
              // 中心位置から表示位置を計算
              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };
                e.target.x((constrained.x - props.width / 2) * finalScale + centerOffsetX + panX);
                e.target.y((constrained.y - props.height / 2) * finalScale + centerOffsetY + panY);
              } else if (table.type === 'svg') {
                const props = table.properties as any;
                e.target.x((constrained.x - props.width / 2) * finalScale + centerOffsetX + panX);
                e.target.y((constrained.y - props.height / 2) * finalScale + centerOffsetY + panY);
              } else {
                e.target.x(constrained.x * finalScale + centerOffsetX + panX);
                e.target.y(constrained.y * finalScale + centerOffsetY + panY);
              }

              // ドラッグ中の位置を更新（選択枠の追従のため）
              // 中心座標として保存
              let centerX, centerY;
              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };
                centerX = e.target.x() + (props.width * finalScale) / 2;
                centerY = e.target.y() + (props.height * finalScale) / 2;
              } else if (table.type === 'svg') {
                const props = table.properties as any;
                centerX = e.target.x() + (props.width * finalScale) / 2;
                centerY = e.target.y() + (props.height * finalScale) / 2;
              } else {
                // 円形の場合は既に中心座標
                centerX = e.target.x();
                centerY = e.target.y();
              }
              
              setDraggingPositions(prev => ({
                ...prev,
                [table.id]: { x: centerX, y: centerY }
              }));
            };

            const handleDragEnd = (e: any) => {
              let leftTopX: number;
              let leftTopY: number;

              if (table.type === 'rectangle' || table.type === 'svg') {
                // 長方形・SVGテーブルの場合：左上角の座標を取得
                leftTopX = (e.target.x() - centerOffsetX - panX) / finalScale;
                leftTopY = (e.target.y() - centerOffsetY - panY) / finalScale;
              } else {
                // 円形の場合：中心から左上角相当の位置を計算
                const props = table.properties as { radius: number };
                leftTopX = ((e.target.x() - centerOffsetX - panX) / finalScale) - props.radius;
                leftTopY = ((e.target.y() - centerOffsetY - panY) / finalScale) - props.radius;
              }

              // 左上角をスナップ（境界範囲内のグリッド線に）
              let snappedX = snapEnabled ? snapToGrid(leftTopX, true) : leftTopX;
              let snappedY = snapEnabled ? snapToGrid(leftTopY, false) : leftTopY;

              // 境界制約を適用（左上角ベース）
              const constrained = constrainPosition(snappedX, snappedY);
              
              // App.tsxのhandleMultipleTableMoveに処理を委譲
              // 複数選択の場合の相対移動処理はApp.tsx側で実行される
              onTableMove?.(table.id, constrained);

              // ドラッグ終了時にドラッグ中の位置をクリア
              setDraggingPositions(prev => {
                const newPositions = { ...prev };
                delete newPositions[table.id];
                return newPositions;
              });
            };

            if (table.type === 'rectangle') {
              const props = table.properties as { width: number; height: number };
              return (
                <>
                  <Rect
                    key={table.id}
                    x={displayX - (props.width * finalScale) / 2}
                    y={displayY - (props.height * finalScale) / 2}
                    width={props.width * finalScale}
                    height={props.height * finalScale}
                    fill={table.style.fill}
                    stroke={table.style.stroke}
                    strokeWidth={1}
                    opacity={table.style.opacity}
                    draggable={!isBoundarySettingMode}
                    onClick={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, e.evt.ctrlKey)}
                    onTap={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, e.evt.ctrlKey)}
                    onContextMenu={(e) => handleTableRightClick(e, table.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                  {isSelected && (
                    <Rect
                      key={`${table.id}-selection`}
                      x={displayX - (props.width * finalScale) / 2}
                      y={displayY - (props.height * finalScale) / 2}
                      width={props.width * finalScale}
                      height={props.height * finalScale}
                      fill="transparent"
                      stroke="#ff9800"
                      strokeWidth={2}
                      listening={false}
                    />
                  )}
                </>
              );
            } else if (table.type === 'circle') {
              const props = table.properties as { radius: number };
              return (
                <>
                  <Circle
                    key={table.id}
                    x={displayX}
                    y={displayY}
                    radius={props.radius * finalScale}
                    fill={table.style.fill}
                    stroke={table.style.stroke}
                    strokeWidth={1}
                    opacity={table.style.opacity}
                    draggable={!isBoundarySettingMode}
                    onClick={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, e.evt.ctrlKey)}
                    onTap={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, e.evt.ctrlKey)}
                    onContextMenu={(e) => handleTableRightClick(e, table.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                  {isSelected && (
                    <Circle
                      key={`${table.id}-selection`}
                      x={displayX}
                      y={displayY}
                      radius={props.radius * finalScale}
                      fill="transparent"
                      stroke="#ff9800"
                      strokeWidth={2}
                      listening={false}
                    />
                  )}
                </>
              );
            } else if (table.type === 'svg') {
              const props = table.properties as any;
              const svgImage = svgTableImages[table.id];
              
              if (!svgImage) {
                // SVG画像が読み込まれていない場合は仮の矩形を表示
                return (
                  <Rect
                    key={table.id}
                    x={displayX - (props.width * finalScale) / 2}
                    y={displayY - (props.height * finalScale) / 2}
                    width={props.width * finalScale}
                    height={props.height * finalScale}
                    fill="rgba(200, 200, 200, 0.5)"
                    stroke="rgba(100, 100, 100, 0.8)"
                    strokeWidth={1}
                    dash={[5, 5]}
                    listening={false}
                  />
                );
              }
              
              return (
                <>
                  <Image
                    key={table.id}
                    image={svgImage}
                    x={displayX - (props.width * finalScale) / 2}
                    y={displayY - (props.height * finalScale) / 2}
                    width={props.width * finalScale}
                    height={props.height * finalScale}
                    opacity={isSelected ? 0.8 : table.style.opacity}
                    draggable={!isBoundarySettingMode}
                    onClick={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, e.evt.ctrlKey)}
                    onTap={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, e.evt.ctrlKey)}
                    onContextMenu={(e) => handleTableRightClick(e, table.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                  {isSelected && (
                    <Rect
                      key={`${table.id}-selection`}
                      x={displayX - (props.width * finalScale) / 2}
                      y={displayY - (props.height * finalScale) / 2}
                      width={props.width * finalScale}
                      height={props.height * finalScale}
                      fill="transparent"
                      stroke="#ff9800"
                      strokeWidth={2}
                      listening={false}
                    />
                  )}
                </>
              );
            }
          })}
        </Layer>
        </Stage>

        {/* 右クリックメニュー */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            tableId={contextMenu.tableId}
            onClose={handleContextMenuClose}
            onDelete={() => handleTableDelete(contextMenu.tableId)}
            onDuplicate={() => handleTableDuplicate(contextMenu.tableId)}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedCanvas;