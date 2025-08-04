import React, { memo } from 'react';
import { Circle } from 'react-konva';
import type { TableObject, CircleProps } from '../../types';
import { mmToPx } from '../../utils';

interface CircleTableProps {
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
  fill: '#fff3e0',
  stroke: '#ff9800',
  strokeWidth: 2,
  opacity: 0.8,
};

const SELECTED_STYLE = {
  fill: '#ffe0b2',
  stroke: '#f57c00',
  strokeWidth: 3,
  opacity: 0.9,
};

const DRAGGING_STYLE = {
  fill: '#ffcc02',
  stroke: '#ef6c00',
  strokeWidth: 3,
  opacity: 0.7,
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowBlur: 10,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
};

/**
 * 円形テーブルコンポーネント（Konva Circle使用）
 * 要件2.1, 2.2, 2.3, 2.4に対応
 * React.memoでレンダリング最適化（要件3.3対応）
 */
const CircleTable: React.FC<CircleTableProps> = memo(({
  table,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHover,
}) => {
  const props = table.properties as CircleProps;
  const radiusPx = mmToPx(props.radius);

  // 状態に応じたスタイルを決定（要件2.4対応）
  const getStyle = () => {
    if (isDragging) return { ...table.style, ...DRAGGING_STYLE };
    if (isSelected) return { ...table.style, ...SELECTED_STYLE };
    return { ...DEFAULT_STYLE, ...table.style };
  };

  const currentStyle = getStyle();

  return (
    <Circle
      x={table.position.x}
      y={table.position.y}
      radius={radiusPx}
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
        console.log('CircleTable ドラッグ開始:', {
          tableId: table.id,
          startPosition: table.position,
          timestamp: Date.now()
        });
      }}
      onDragMove={(e) => {
        // リアルタイム位置更新とビジュアルフィードバック（要件4.2対応）
        e.cancelBubble = true; // イベントバブリングを防止
        
        // カーソル追従機能：正確な位置計算
        const newPosition = { x: e.target.x(), y: e.target.y() };
        
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
        console.log('CircleTable ドラッグ終了:', {
          tableId: table.id,
          endPosition: { x: e.target.x(), y: e.target.y() },
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
CircleTable.displayName = 'CircleTable';

export default CircleTable;