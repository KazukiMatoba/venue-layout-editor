import React, { memo } from 'react';
import { Rect } from 'react-konva';
import type { TableObject, RectangleProps } from '../../types';
import { mmToPx } from '../../utils';

interface RectangleTableProps {
  table: TableObject;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragMove: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onHover?: (isHovered: boolean) => void; // ホバー状態管理（要件3.3対応）
}

// デフォルトスタイル定数（要件2.4対応）
const DEFAULT_STYLE = {
  fill: '#e8f4f8',
  stroke: '#2196f3',
  strokeWidth: 2,
  opacity: 0.8,
};

const SELECTED_STYLE = {
  fill: '#bbdefb',
  stroke: '#1976d2',
  strokeWidth: 3,
  opacity: 0.9,
};

const DRAGGING_STYLE = {
  fill: '#90caf9',
  stroke: '#1565c0',
  strokeWidth: 3,
  opacity: 0.7,
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowBlur: 10,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
};

/**
 * 長方形テーブルコンポーネント（Konva Rect使用）
 * 要件2.1, 2.2, 2.3, 2.4に対応
 * React.memoでレンダリング最適化（要件3.3対応）
 */
const RectangleTable: React.FC<RectangleTableProps> = memo(({
  table,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHover,
}) => {
  const props = table.properties as RectangleProps;
  const widthPx = mmToPx(props.width);
  const heightPx = mmToPx(props.height);

  // 状態に応じたスタイルを決定（要件2.4対応）
  const getStyle = () => {
    if (isDragging) return { ...table.style, ...DRAGGING_STYLE };
    if (isSelected) return { ...table.style, ...SELECTED_STYLE };
    return { ...DEFAULT_STYLE, ...table.style };
  };

  const currentStyle = getStyle();

  return (
    <Rect
      x={table.position.x - widthPx / 2}
      y={table.position.y - heightPx / 2}
      width={widthPx}
      height={heightPx}
      fill={currentStyle.fill}
      stroke={currentStyle.stroke}
      strokeWidth={currentStyle.strokeWidth}
      opacity={currentStyle.opacity}
      // ドラッグ中のビジュアルフィードバック（要件4.2対応）
      shadowColor={isDragging ? currentStyle.shadowColor : undefined}
      shadowBlur={isDragging ? currentStyle.shadowBlur : 0}
      shadowOffsetX={isDragging ? currentStyle.shadowOffsetX : 0}
      shadowOffsetY={isDragging ? currentStyle.shadowOffsetY : 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={(e) => {
        // ドラッグ開始時の詳細なイベントハンドリング（要件4.1対応）
        e.cancelBubble = true; // イベントバブリングを防止
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = 'grabbing';
          // ドラッグ中のキャンバス操作を無効化
          stage.draggable(false);
        }
        
        // ドラッグ状態管理の初期化
        onDragStart();
        
        // ドラッグ開始ログ（デバッグ用）
        console.log('RectangleTable ドラッグ開始:', {
          tableId: table.id,
          startPosition: table.position,
          timestamp: Date.now()
        });
      }}
      onDragMove={(e) => {
        // リアルタイム位置更新とビジュアルフィードバック（要件4.2対応）
        e.cancelBubble = true; // イベントバブリングを防止
        
        // カーソル追従機能：長方形の中心座標を正確に計算
        const newPosition = { 
          x: e.target.x() + widthPx / 2, 
          y: e.target.y() + heightPx / 2 
        };
        
        // リアルタイム位置更新
        onDragMove(newPosition);
        
        // ドラッグ中のビジュアルフィードバック強化
        const stage = e.target.getStage();
        if (stage) {
          // カーソルスタイルの維持
          stage.container().style.cursor = 'grabbing';
        }
      }}
      onDragEnd={(e) => {
        // ドラッグ終了時の処理（要件4.1対応）
        e.cancelBubble = true; // イベントバブリングを防止
        
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = 'grab';
        }
        
        // ドラッグ終了処理
        onDragEnd();
        
        // ドラッグ終了ログ（デバッグ用）
        console.log('RectangleTable ドラッグ終了:', {
          tableId: table.id,
          endPosition: { 
            x: e.target.x() + widthPx / 2, 
            y: e.target.y() + heightPx / 2 
          },
          timestamp: Date.now()
        });
      }}
      // ホバー効果の追加（要件2.4, 3.3対応）
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = isDragging ? 'grabbing' : 'grab';
        }
        // ホバー状態の通知
        if (onHover) {
          onHover(true);
        }
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) {
          stage.container().style.cursor = 'default';
        }
        // ホバー状態の通知
        if (onHover) {
          onHover(false);
        }
      }}
    />
  );
});

// React.memoの比較関数を追加してレンダリング最適化（要件3.3対応）
RectangleTable.displayName = 'RectangleTable';

export default RectangleTable;