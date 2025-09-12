import React from 'react';
import { Rect, Text, Group } from 'react-konva';
import type { TextBoxProps } from '../types';

interface TextBoxRendererProps {
  id: string;
  x: number;
  y: number;
  properties: TextBoxProps;
  scale: number;
  isSelected: boolean;
  isFirstSelected: boolean;
  draggable: boolean;
  onClick?: (e: any) => void;
  onTap?: (e: any) => void;
  onContextMenu?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onDoubleClick?: (id: string) => void;
}

const TextBoxRenderer: React.FC<TextBoxRendererProps> = ({
  id,
  x,
  y,
  properties,
  scale,
  isSelected,
  isFirstSelected,
  draggable,
  onClick,
  onTap,
  onContextMenu,
  onDragMove,
  onDragEnd,
  onDoubleClick
}) => {
  const {
    text,
    fontSize,
    fontFamily,
    width,
    height,
    textColor
  } = properties;

  // デフォルト値
  const backgroundColor = 'transparent';
  const borderColor = '#cccccc';
  const borderWidth = 0;
  const padding = 100; // mm

  // スケールを適用したサイズ
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledFontSize = fontSize * scale;
  const scaledBorderWidth = borderWidth * scale;
  const scaledPadding = padding * scale;

  // テキストボックスの左上角座標
  const boxX = x - scaledWidth / 2;
  const boxY = y - scaledHeight / 2;

  // テキストの位置（パディングを考慮）
  const textX = boxX + scaledPadding;
  const textY = boxY + scaledPadding;

  // テキストの表示幅（パディングを除いた幅）
  const textWidth = scaledWidth - (scaledPadding * 2);

  return (
    <Group>
      {/* 背景とボーダー */}
      <Rect
        x={boxX}
        y={boxY}
        width={scaledWidth}
        height={scaledHeight}
        fill={backgroundColor}
        stroke={borderColor}
        strokeWidth={scaledBorderWidth}
        draggable={draggable}
        onClick={onClick}
        onTap={onTap}
        onContextMenu={onContextMenu}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDblClick={() => onDoubleClick?.(id)}
      />
      
      {/* テキスト */}
      <Text
        x={textX}
        y={textY}
        text={text}
        fontSize={scaledFontSize}
        fontFamily={fontFamily}
        fill={textColor}
        width={textWidth}
        align="left"
        verticalAlign="top"
        wrap="word"
        listening={false}
      />
      
      {/* 選択状態の枠線 */}
      {isSelected && (
        <Rect
          x={boxX}
          y={boxY}
          width={scaledWidth}
          height={scaledHeight}
          fill="transparent"
          stroke={isFirstSelected ? "#f44336" : "#ff9800"}
          strokeWidth={2}
          listening={false}
        />
      )}
    </Group>
  );
};

export default TextBoxRenderer;