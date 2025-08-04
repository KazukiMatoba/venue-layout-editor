import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image, Line } from 'react-konva';
import ContextMenu from './ContextMenu';
import ZoomPanControls from './ZoomPanControls';
import type { SVGData, TableObject, Position, BoundaryArea } from '../types';

interface SimpleCanvasProps {
  svgData: SVGData;
  tables: TableObject[];
  onTableSelect?: (id: string | null) => void;
  onTableMove?: (id: string, position: Position) => void;
  onTableDelete?: (id: string) => void;
  onTableDuplicate?: (id: string) => void;
  selectedTableId?: string | null;
  boundaryArea?: BoundaryArea;
  onBoundaryAreaSet?: (boundary: BoundaryArea) => void;
  isBoundarySettingMode?: boolean;
  gridSize?: number;
  snapEnabled?: boolean;
  gridVisible?: boolean;
}

const SimpleCanvas: React.FC<SimpleCanvasProps> = ({
  svgData,
  tables,
  onTableSelect,
  onTableMove,
  onTableDelete,
  onTableDuplicate,
  selectedTableId,
  boundaryArea,
  onBoundaryAreaSet,
  isBoundarySettingMode = false,
  gridSize = 100,
  snapEnabled = false,
  gridVisible = false
}) => {
  const baseCanvasWidth = Math.min(800, svgData.width);
  const baseCanvasHeight = Math.min(600, svgData.height);
  const baseScaleX = baseCanvasWidth / svgData.width;
  const baseScaleY = baseCanvasHeight / svgData.height;
  const baseScale = Math.min(baseScaleX, baseScaleY);

  // ズーム・パン状態
  const [userScale, setUserScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const finalScale = baseScale * userScale;
  const canvasWidth = baseCanvasWidth;
  const canvasHeight = baseCanvasHeight;

  const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

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

  // SVGをImageオブジェクトに変換
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    // SVGをData URLに変換
    const svgBlob = new Blob([svgData.content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      setSvgImage(img);
      URL.revokeObjectURL(url); // メモリリークを防ぐ
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

  // グリッドスナップ機能
  const snapToGrid = (value: number): number => {
    if (!snapEnabled) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // ズーム・パンコントロールハンドラー
  const handleScaleChange = (newScale: number) => {
    setUserScale(newScale);
  };

  const handlePanChange = (newPanX: number, newPanY: number) => {
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleResetView = () => {
    setUserScale(1.0);
    setPanX(0);
    setPanY(0);
  };

  // 境界エリア設定のマウスイベントハンドラー
  const handleStageMouseDown = (e: any) => {
    if (!isBoundarySettingMode) return;

    const pos = e.target.getStage().getPointerPosition();
    const x = pos.x / scale;
    const y = pos.y / scale;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleStageMouseMove = (e: any) => {
    if (!isBoundarySettingMode || !isDrawing || !startPoint) return;

    const pos = e.target.getStage().getPointerPosition();
    const x = pos.x / scale;
    const y = pos.y / scale;

    const width = x - startPoint.x;
    const height = y - startPoint.y;

    setCurrentRect({
      x: width > 0 ? startPoint.x : x,
      y: height > 0 ? startPoint.y : y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleStageMouseUp = () => {
    if (!isBoundarySettingMode || !isDrawing || !currentRect) return;

    setIsDrawing(false);

    // 最小サイズチェック
    if (currentRect.width > 10 && currentRect.height > 10) {
      onBoundaryAreaSet?.(currentRect);
    }

    setStartPoint(null);
    setCurrentRect(null);
  };

  return (
    <div className="simple-canvas">
      <div className="canvas-header">
        <h4>会場レイアウト</h4>
        <ZoomPanControls
          scale={userScale}
          onScaleChange={handleScaleChange}
          panX={panX}
          panY={panY}
          onPanChange={handlePanChange}
          onResetView={handleResetView}
        />
        {!svgImage && <p>(読み込み中...)</p>}
      </div>

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
              x={0}
              y={0}
              width={svgData.width * scale}
              height={svgData.height * scale}
              listening={false} // テーブルのドラッグを妨げないように
            />
          )}

          {/* 設定された境界エリアの表示 */}
          {boundaryArea && (
            <Rect
              x={boundaryArea.x * scale}
              y={boundaryArea.y * scale}
              width={boundaryArea.width * scale}
              height={boundaryArea.height * scale}
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
              x={currentRect.x * scale}
              y={currentRect.y * scale}
              width={currentRect.width * scale}
              height={currentRect.height * scale}
              fill="rgba(0, 0, 255, 0.1)"
              stroke="rgba(0, 0, 255, 0.8)"
              strokeWidth={2}
              dash={[3, 3]}
              listening={false}
            />
          )}

          {/* 会場情報テキスト（背景付き） */}
          <Rect
            x={5}
            y={5}
            width={250}
            height={25}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="rgba(0, 0, 0, 0.3)"
            strokeWidth={1}
            cornerRadius={3}
            listening={false}
          />
          <Text
            x={10}
            y={12}
            text={`会場: ${svgData.width}×${svgData.height}mm`}
            fontSize={14}
            fill="black"
            listening={false}
          />

          {/* テーブルの描画 */}
          {tables.map((table) => {
            const isSelected = table.id === selectedTableId;
            const x = table.position.x * scale;
            const y = table.position.y * scale;

            // 境界制約の計算関数
            const constrainPosition = (newX: number, newY: number) => {
              let constrainedX = newX;
              let constrainedY = newY;

              // 境界エリアが設定されている場合はそれを使用、そうでなければSVG全体を使用
              const bounds = boundaryArea || {
                x: 0,
                y: 0,
                width: svgData.width,
                height: svgData.height
              };

              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };
                const halfWidth = props.width / 2;
                const halfHeight = props.height / 2;

                // 厳密な境界制約（テーブルの一部も境界を超えないよう制約）
                constrainedX = Math.max(bounds.x + halfWidth, Math.min(bounds.x + bounds.width - halfWidth, newX));
                constrainedY = Math.max(bounds.y + halfHeight, Math.min(bounds.y + bounds.height - halfHeight, newY));
              } else {
                const props = table.properties as { radius: number };
                const radius = props.radius;

                // 厳密な境界制約（円の一部も境界を超えないよう制約）
                constrainedX = Math.max(bounds.x + radius, Math.min(bounds.x + bounds.width - radius, newX));
                constrainedY = Math.max(bounds.y + radius, Math.min(bounds.y + bounds.height - radius, newY));
              }

              return { x: constrainedX, y: constrainedY };
            };

            const handleDragMove = (e: any) => {
              // リアルタイムでの境界制約
              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };
                const centerX = (e.target.x() + (props.width * scale) / 2) / scale;
                const centerY = (e.target.y() + (props.height * scale) / 2) / scale;
                const constrained = constrainPosition(centerX, centerY);

                e.target.x((constrained.x - props.width / 2) * scale);
                e.target.y((constrained.y - props.height / 2) * scale);
              } else {
                const centerX = e.target.x() / scale;
                const centerY = e.target.y() / scale;
                const constrained = constrainPosition(centerX, centerY);

                e.target.x(constrained.x * scale);
                e.target.y(constrained.y * scale);
              }
            };

            const handleDragEnd = (e: any) => {
              let centerX: number;
              let centerY: number;

              if (table.type === 'rectangle') {
                const props = table.properties as { width: number; height: number };
                centerX = (e.target.x() + (props.width * scale) / 2) / scale;
                centerY = (e.target.y() + (props.height * scale) / 2) / scale;
              } else {
                centerX = e.target.x() / scale;
                centerY = e.target.y() / scale;
              }

              const constrained = constrainPosition(centerX, centerY);
              onTableMove?.(table.id, constrained);
            };

            if (table.type === 'rectangle') {
              const props = table.properties as { width: number; height: number };
              return (
                <Rect
                  key={table.id}
                  x={x - (props.width * scale) / 2}
                  y={y - (props.height * scale) / 2}
                  width={props.width * scale}
                  height={props.height * scale}
                  fill={isSelected ? '#ffeb3b' : table.style.fill}
                  stroke={isSelected ? '#ff9800' : table.style.stroke}
                  strokeWidth={isSelected ? 3 : table.style.strokeWidth}
                  opacity={table.style.opacity}
                  draggable={!isBoundarySettingMode}
                  onClick={() => !isBoundarySettingMode && onTableSelect?.(table.id)}
                  onTap={() => !isBoundarySettingMode && onTableSelect?.(table.id)}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              );
            } else {
              const props = table.properties as { radius: number };
              return (
                <Circle
                  key={table.id}
                  x={x}
                  y={y}
                  radius={props.radius * scale}
                  fill={isSelected ? '#ffeb3b' : table.style.fill}
                  stroke={isSelected ? '#ff9800' : table.style.stroke}
                  strokeWidth={isSelected ? 3 : table.style.strokeWidth}
                  opacity={table.style.opacity}
                  draggable={!isBoundarySettingMode}
                  onClick={() => !isBoundarySettingMode && onTableSelect?.(table.id)}
                  onTap={() => !isBoundarySettingMode && onTableSelect?.(table.id)}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              );
            }
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default SimpleCanvas;