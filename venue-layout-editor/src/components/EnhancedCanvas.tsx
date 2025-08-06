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
  // 基本的なキャンバスサイズ設定
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // 繧ｺ繝ｼ繝繝ｻ繝代Φ迥ｶ諷・
  const [userScale, setUserScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // 繧ｷ繝輔ヨ+繝峨Λ繝・げ縺ｫ繧医ｋ繝代Φ謫堺ｽ懊・迥ｶ諷・
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const updateCanvasSize = () => {
      // 利用可能な画面領域を計算・
      const sidebar = 300; // サイドバー幅・
      const headerHeight = 80; // 繝倥ャ繝繝ｼ鬮倥＆
      const canvasHeaderHeight = 60; // 繧ｭ繝｣繝ｳ繝舌せ繝倥ャ繝繝ｼ鬮倥＆
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

  // 繧ｭ繝ｼ繝懊・繝峨う繝吶Φ繝医〒繧ｷ繝輔ヨ繧ｭ繝ｼ縺ｮ迥ｶ諷九ｒ逶｣隕・
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isPanning) {
        // 繧ｷ繝輔ヨ繧ｭ繝ｼ縺碁屬縺輔ｌ縺溘ｉ繧ｫ繝ｼ繧ｽ繝ｫ繧偵ョ繝輔か繝ｫ繝医↓謌ｻ縺・
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

  // SVG逕ｻ蜒上ｒ荳ｭ螟ｮ驟咲ｽｮ縺吶ｋ縺溘ａ縺ｮ繧ｪ繝輔そ繝・ヨ險育ｮ・
  const scaledSvgWidth = svgData.width * finalScale;
  const scaledSvgHeight = svgData.height * finalScale;
  const centerOffsetX = (canvasWidth - scaledSvgWidth) / 2;
  const centerOffsetY = (canvasHeight - scaledSvgHeight) / 2;

  const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // SVG繝・・繝悶Ν逕ｨ縺ｮ逕ｻ蜒冗ｮ｡逅・
  const [svgTableImages, setSvgTableImages] = useState<{ [key: string]: HTMLImageElement }>({});
  
  // 蠅・阜繧ｨ繝ｪ繧｢險ｭ螳夂畑縺ｮ迥ｶ諷・
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<BoundaryArea | null>(null);
  
  // 蜿ｳ繧ｯ繝ｪ繝・け繝｡繝九Η繝ｼ逕ｨ縺ｮ迥ｶ諷・
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tableId: string;
  } | null>(null);

  // 繝峨Λ繝・げ荳ｭ縺ｮ繝・・繝悶Ν菴咲ｽｮ繧堤ｮ｡逅・
  const [draggingPositions, setDraggingPositions] = useState<{ [tableId: string]: { x: number; y: number } }>({});

  // SVG繧棚mage繧ｪ繝悶ず繧ｧ繧ｯ繝医↓螟画鋤
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
      console.error('SVG逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
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

  // SVG繝・・繝悶Ν逕ｻ蜒上ｒ隱ｭ縺ｿ霎ｼ繧髢｢謨ｰ
  const loadSVGTableImage = async (tableId: string, svgContent: string) => {
    const img = new window.Image();
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        setSvgTableImages(prev => ({ ...prev, [tableId]: img }));
        resolve(img);
      };

      img.onerror = (error) => {
        console.error('SVG繝・・繝悶Ν逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
        reject(new Error('SVG繝・・繝悶Ν逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆'));
      };

      // SVG繧ｳ繝ｳ繝・Φ繝・ｒData URL縺ｨ縺励※險ｭ螳・
      const encodedSvg = encodeURIComponent(svgContent);
      img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
    });
  };

  // SVG繝・・繝悶Ν縺ｮ逕ｻ蜒上ｒ莠句燕隱ｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    const svgTables = tables.filter(table => table.type === 'svg');
    
    svgTables.forEach(table => {
      if (!svgTableImages[table.id]) {
        const props = table.properties as any;
        if (props.svgContent) {
          loadSVGTableImage(table.id, props.svgContent).catch(error => {
            console.warn(`繝・・繝悶Ν ${table.id} 縺ｮ逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨・`, error);
          });
        }
      }
    });
  }, [tables]);

  // 繧ｰ繝ｪ繝・ラ繧ｹ繝翫ャ繝玲ｩ溯・・亥｢・阜遽・峇蜀・・繧ｰ繝ｪ繝・ラ邱壹↓繧ｹ繝翫ャ繝暦ｼ・
  const snapToGrid = (value: number, isX: boolean = true): number => {
    if (!snapEnabled) return value;
    
    const bounds = boundaryArea || { x: 0, y: 0, width: svgData.width, height: svgData.height };
    const boundaryStart = isX ? bounds.x : bounds.y;
    
    // 蠅・阜遽・峇縺ｮ髢句ｧ狗せ縺九ｉ縺ｮ逶ｸ蟇ｾ菴咲ｽｮ繧定ｨ育ｮ・
    const relativeValue = value - boundaryStart;
    
    // 蠅・阜遽・峇蜀・・繧ｰ繝ｪ繝・ラ邱壹↓繧ｹ繝翫ャ繝・
    const snappedRelative = Math.round(relativeValue / gridSize) * gridSize;
    
    // 邨ｶ蟇ｾ蠎ｧ讓吶↓謌ｻ縺・
    return boundaryStart + snappedRelative;
  };

  // 隍・焚驕ｸ謚樊凾縺ｮ蟾ｦ荳翫ユ繝ｼ繝悶Ν繧貞愛螳壹☆繧矩未謨ｰ
  const getLeadTableId = (tables: TableObject[], selectedIds: string[]): string => {
    const selectedTables = tables.filter(table => selectedIds.includes(table.id));
    if (selectedTables.length === 0) return '';
    
    // 蟾ｦ荳願ｧ偵・蠎ｧ讓吶ｒ險育ｮ励＠縺ｦ繧ｽ繝ｼ繝・
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
    
    // Y蠎ｧ讓吶′譛蟆上∵ｬ｡縺ｫX蠎ｧ讓吶′譛蟆上・繝・・繝悶Ν繧帝∈謚・
    tablesWithTopLeft.sort((a, b) => {
      if (Math.abs(a.leftTopY - b.leftTopY) < 1) {
        return a.leftTopX - b.leftTopX;
      }
      return a.leftTopY - b.leftTopY;
    });
    
    return tablesWithTopLeft[0].table.id;
  };

  // 繧ｺ繝ｼ繝繝ｻ繝代Φ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ繝上Φ繝峨Λ繝ｼ
  const handleScaleChange = (newScale: number) => {
    setUserScale(newScale);
  };

  const handleResetView = () => {
    setUserScale(1.0);
    setPanX(0);
    setPanY(0);
  };

  // マウスイベントハンドラー・亥｢・阜繧ｨ繝ｪ繧｢險ｭ螳壹→繧ｷ繝輔ヨ+繝峨Λ繝・げ繝代Φ・・
  const handleStageMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    
    // 繧ｷ繝輔ヨ+繝峨Λ繝・げ縺ｧ繝代Φ謫堺ｽ・
    if (e.evt.shiftKey) {
      setIsPanning(true);
      setPanStartPos({ x: pos.x, y: pos.y });
      setPanStartOffset({ x: panX, y: panY });
      e.target.getStage().container().style.cursor = 'grabbing';
      return;
    }
    
    // 蠅・阜繧ｨ繝ｪ繧｢險ｭ螳壹Δ繝ｼ繝・
    if (!isBoundarySettingMode) return;
    
    // 荳ｭ螟ｮ驟咲ｽｮ繧ｪ繝輔そ繝・ヨ繧定・・縺励◆蠎ｧ讓吝､画鋤
    const x = (pos.x - centerOffsetX - panX) / finalScale;
    const y = (pos.y - centerOffsetY - panY) / finalScale;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleStageMouseMove = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    
    // 繧ｷ繝輔ヨ+繝峨Λ繝・げ繝代Φ蜃ｦ逅・
    if (isPanning) {
      const deltaX = pos.x - panStartPos.x;
      const deltaY = pos.y - panStartPos.y;
      setPanX(panStartOffset.x + deltaX);
      setPanY(panStartOffset.y + deltaY);
      return;
    }
    
    // カーソル変更・医す繝輔ヨ繧ｭ繝ｼ謚ｼ荳区凾・・
    if (e.evt.shiftKey) {
      e.target.getStage().container().style.cursor = 'grab';
    } else {
      e.target.getStage().container().style.cursor = 'default';
    }
    
    // 蠅・阜繧ｨ繝ｪ繧｢險ｭ螳壼・逅・
    if (!isBoundarySettingMode || !isDrawing || !startPoint) return;
    
    // 荳ｭ螟ｮ驟咲ｽｮ繧ｪ繝輔そ繝・ヨ繧定・・縺励◆蠎ｧ讓吝､画鋤
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
    // パン操作終了・
    if (isPanning) {
      setIsPanning(false);
      e.target.getStage().container().style.cursor = e.evt.shiftKey ? 'grab' : 'default';
      return;
    }
    
    // 蠅・阜繧ｨ繝ｪ繧｢險ｭ螳壼・逅・
    if (!isBoundarySettingMode || !isDrawing || !currentRect) return;
    
    setIsDrawing(false);
    
    if (currentRect.width > 10 && currentRect.height > 10) {
      onBoundaryAreaSet?.(currentRect);
    }
    
    setStartPoint(null);
    setCurrentRect(null);
  };

  // 蜿ｳ繧ｯ繝ｪ繝・け繝｡繝九Η繝ｼ繝上Φ繝峨Λ繝ｼ
  const handleTableRightClick = (e: any, tableId: string) => {
    e.evt.preventDefault();
    
    // 蜿ｳ繧ｯ繝ｪ繝・け縺励◆螳滄圀縺ｮ菴咲ｽｮ繧貞叙蠕・
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    // 繧ｹ繝・・繧ｸ縺ｮDOM隕∫ｴ縺ｮ菴咲ｽｮ繧貞叙蠕・
    const stageContainer = stage.container();
    const rect = stageContainer.getBoundingClientRect();
    
    // 繝壹・繧ｸ荳翫・邨ｶ蟇ｾ蠎ｧ讓吶ｒ險育ｮ・
    let absoluteX = rect.left + pointerPosition.x;
    let absoluteY = rect.top + pointerPosition.y;
    
    // 繝｡繝九Η繝ｼ縺檎判髱｢螟悶↓蜃ｺ縺ｪ縺・ｈ縺・↓隱ｿ謨ｴ
    const menuWidth = 150; // ContextMenu縺ｮ譛蟆丞ｹ・
    const menuHeight = 80; // ContextMenuの推定高さ
    
    // 蜿ｳ遶ｯ繝√ぉ繝・け
    if (absoluteX + menuWidth > window.innerWidth) {
      absoluteX = window.innerWidth - menuWidth - 10;
    }
    
    // 荳狗ｫｯ繝√ぉ繝・け
    if (absoluteY + menuHeight > window.innerHeight) {
      absoluteY = window.innerHeight - menuHeight - 10;
    }
    
    // 蟾ｦ遶ｯ繝ｻ荳顔ｫｯ繝√ぉ繝・け
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

  // 繧ｰ繝ｪ繝・ラ邱壹・逕滓・
  const generateGridLines = () => {
    if (!gridVisible) return [];
    
    const lines = [];
    const bounds = boundaryArea || { x: 0, y: 0, width: svgData.width, height: svgData.height };
    
    // 蠅・阜遽・峇蜀・・縺ｿ縺ｫ繧ｰ繝ｪ繝・ラ邱壹ｒ陦ｨ遉ｺ
    // 蠅・阜遽・峇縺ｮ(0,0)繧貞渕貅悶↓縺励※繧ｰ繝ｪ繝・ラ邱壹ｒ險育ｮ・
    
    // 蠅・阜遽・峇蜀・〒縺ｮ繧ｰ繝ｪ繝・ラ邱壹・髢句ｧ狗せ縺ｨ邨ゆｺ・せ繧定ｨ育ｮ・
    const startX = bounds.x;
    const endX = bounds.x + bounds.width;
    const startY = bounds.y;
    const endY = bounds.y + bounds.height;
    
    // 垂直線夲ｼ壼｢・阜遽・峇縺ｮ蟾ｦ遶ｯ縺九ｉgridSize髢馴囈縺ｧ謠冗判
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
    
    // 水平線夲ｼ壼｢・阜遽・峇縺ｮ荳顔ｫｯ縺九ｉgridSize髢馴囈縺ｧ謠冗判
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
        <h4>莨壼ｴ繝ｬ繧､繧｢繧ｦ繝・/h4>
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
          {/* SVG閭梧勹逕ｻ蜒上・陦ｨ遉ｺ */}
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

          {/* 繧ｰ繝ｪ繝・ラ邱壹・陦ｨ遉ｺ */}
          {generateGridLines()}

          {/* 險ｭ螳壹＆繧後◆蠅・阜繧ｨ繝ｪ繧｢縺ｮ陦ｨ遉ｺ */}
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
          
          {/* 蠅・阜繧ｨ繝ｪ繧｢險ｭ螳壻ｸｭ縺ｮ陦ｨ遉ｺ */}
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



          {/* 繝・・繝悶Ν縺ｮ謠冗判 */}
          {tables.map((table) => {
            const isSelected = selectedTableIds.includes(table.id);
            const x = table.position.x;
            const y = table.position.y;
            
            // 繝峨Λ繝・げ荳ｭ縺ｮ蝣ｴ蜷医・螳滄圀縺ｮKonva隕∫ｴ縺ｮ菴咲ｽｮ繧剃ｽｿ逕ｨ縲√◎縺・〒縺ｪ縺代ｌ縺ｰ險育ｮ嶺ｽ咲ｽｮ繧剃ｽｿ逕ｨ
            const draggingPos = draggingPositions[table.id];
            const displayX = draggingPos ? draggingPos.x : (x * finalScale) + centerOffsetX + panX;
            const displayY = draggingPos ? draggingPos.y : (y * finalScale) + centerOffsetY + panY;

            // 隍・焚驕ｸ謚樊凾縺ｮ蟾ｦ荳翫ユ繝ｼ繝悶Ν蛻､螳・
            const isLeadTable = selectedTableIds.length > 1 ? 
              getLeadTableId(tables, selectedTableIds) === table.id : true;

            // 蠅・阜蛻ｶ邏・・險育ｮ鈴未謨ｰ・亥ｷｦ荳願ｧ偵・繝ｼ繧ｹ・・
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

                // 蟾ｦ荳願ｧ偵・蛻ｶ邏・
                constrainedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - props.width, leftTopX));
                constrainedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - props.height, leftTopY));
              } else if (table.type === 'circle') {
                const props = table.properties as { radius: number };
                const diameter = props.radius * 2;

                // 蟾ｦ荳願ｧ偵・蛻ｶ邏・ｼ亥・縺ｮ蝣ｴ蜷医・逶ｴ蠕・・繧定・・・・
                constrainedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - diameter, leftTopX));
                constrainedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - diameter, leftTopY));
              } else if (table.type === 'svg') {
                const props = table.properties as any;

                // SVG繝・・繝悶Ν縺ｮ蟾ｦ荳願ｧ貞宛邏・
                constrainedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - props.width, leftTopX));
                constrainedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - props.height, leftTopY));
              }

              // 蟾ｦ荳願ｧ偵°繧我ｸｭ蠢・ｽ咲ｽｮ縺ｫ螟画鋤縺励※霑斐☆・域里蟄倥・position邂｡逅・→縺ｮ莠呈鋤諤ｧ縺ｮ縺溘ａ・・
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
              // 蜊倅ｸ驕ｸ謚樊凾縺ｾ縺溘・隍・焚驕ｸ謚樊凾縺ｧ繧る壼ｸｸ縺ｮ繝峨Λ繝・げ蜃ｦ逅・
              // 繝峨Λ繝・げ荳ｭ縺ｯ1縺､縺ｮ繝・・繝悶Ν縺ｮ縺ｿ遘ｻ蜍・

              // 繝ｪ繧｢繝ｫ繧ｿ繧､繝縺ｧ縺ｮ蠅・阜蛻ｶ邏・
              let leftTopX: number;
              let leftTopY: number;

              if (table.type === 'rectangle' || table.type === 'svg') {
                // 髟ｷ譁ｹ蠖｢繝ｻSVG繝・・繝悶Ν縺ｮ蝣ｴ蜷茨ｼ壼ｷｦ荳願ｧ偵・蠎ｧ讓吶ｒ蜿門ｾ・
                leftTopX = (e.target.x() - centerOffsetX - panX) / finalScale;
                leftTopY = (e.target.y() - centerOffsetY - panY) / finalScale;
              } else {
                // 蜀・ｽ｢縺ｮ蝣ｴ蜷茨ｼ壻ｸｭ蠢・°繧牙ｷｦ荳願ｧ堤嶌蠖薙・菴咲ｽｮ繧定ｨ育ｮ・
                const props = table.properties as { radius: number };
                leftTopX = ((e.target.x() - centerOffsetX - panX) / finalScale) - props.radius;
                leftTopY = ((e.target.y() - centerOffsetY - panY) / finalScale) - props.radius;
              }

              // 左上角をスナップ暦ｼ亥｢・阜遽・峇蜀・・繧ｰ繝ｪ繝・ラ邱壹↓・・
              let snappedX = snapEnabled ? snapToGrid(leftTopX, true) : leftTopX;
              let snappedY = snapEnabled ? snapToGrid(leftTopY, false) : leftTopY;

              // 蠅・阜蛻ｶ邏・ｒ驕ｩ逕ｨ・亥ｷｦ荳願ｧ偵・繝ｼ繧ｹ・・
              const constrained = constrainPosition(snappedX, snappedY);
              
              // 荳ｭ蠢・ｽ咲ｽｮ縺九ｉ陦ｨ遉ｺ菴咲ｽｮ繧定ｨ育ｮ・
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

              // 繝峨Λ繝・げ荳ｭ縺ｮ菴咲ｽｮ繧呈峩譁ｰ・磯∈謚樊棧縺ｮ霑ｽ蠕薙・縺溘ａ・・
              // 荳ｭ蠢・ｺｧ讓吶→縺励※菫晏ｭ・
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
                // 蜀・ｽ｢縺ｮ蝣ｴ蜷医・譌｢縺ｫ荳ｭ蠢・ｺｧ讓・
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
                // 髟ｷ譁ｹ蠖｢繝ｻSVG繝・・繝悶Ν縺ｮ蝣ｴ蜷茨ｼ壼ｷｦ荳願ｧ偵・蠎ｧ讓吶ｒ蜿門ｾ・
                leftTopX = (e.target.x() - centerOffsetX - panX) / finalScale;
                leftTopY = (e.target.y() - centerOffsetY - panY) / finalScale;
              } else {
                // 蜀・ｽ｢縺ｮ蝣ｴ蜷茨ｼ壻ｸｭ蠢・°繧牙ｷｦ荳願ｧ堤嶌蠖薙・菴咲ｽｮ繧定ｨ育ｮ・
                const props = table.properties as { radius: number };
                leftTopX = ((e.target.x() - centerOffsetX - panX) / finalScale) - props.radius;
                leftTopY = ((e.target.y() - centerOffsetY - panY) / finalScale) - props.radius;
              }

              // 左上角をスナップ暦ｼ亥｢・阜遽・峇蜀・・繧ｰ繝ｪ繝・ラ邱壹↓・・
              let snappedX = snapEnabled ? snapToGrid(leftTopX, true) : leftTopX;
              let snappedY = snapEnabled ? snapToGrid(leftTopY, false) : leftTopY;

              // 蠅・阜蛻ｶ邏・ｒ驕ｩ逕ｨ・亥ｷｦ荳願ｧ偵・繝ｼ繧ｹ・・
              const constrained = constrainPosition(snappedX, snappedY);
              
              // App.tsx縺ｮhandleMultipleTableMove縺ｫ蜃ｦ逅・ｒ蟋碑ｭｲ
              // 隍・焚驕ｸ謚槭・蝣ｴ蜷医・逶ｸ蟇ｾ遘ｻ蜍募・逅・・App.tsx側で実行される
              onTableMove?.(table.id, constrained);

              // 繝峨Λ繝・げ邨ゆｺ・凾縺ｫ繝峨Λ繝・げ荳ｭ縺ｮ菴咲ｽｮ繧偵け繝ｪ繧｢
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
                    onTap={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, false)}
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
                    onTap={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, false)}
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
                // SVG逕ｻ蜒上′隱ｭ縺ｿ霎ｼ縺ｾ繧後※縺・↑縺・ｴ蜷医・莉ｮ縺ｮ遏ｩ蠖｢繧定｡ｨ遉ｺ
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
                    onTap={(e) => !isBoundarySettingMode && onTableSelect?.(table.id, false)}
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

        {/* 蜿ｳ繧ｯ繝ｪ繝・け繝｡繝九Η繝ｼ */}
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



















