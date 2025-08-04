/**
 * 境界チェックユーティリティ
 */

import type { Position, TableObject, BoundingBox, RectangleProps, CircleProps } from '../types';
import { mmToPx } from './scale';

/**
 * テーブルが境界内にあるかチェック
 * @param table テーブルオブジェクト
 * @param bounds 境界情報
 * @returns 境界内の場合true
 */
export const isTableWithinBounds = (table: TableObject, bounds: BoundingBox): boolean => {
  const { position, properties, type } = table;
  
  if (type === 'rectangle') {
    const props = properties as RectangleProps;
    const width = mmToPx(props.width);
    const height = mmToPx(props.height);
    
    return (
      position.x >= bounds.minX &&
      position.y >= bounds.minY &&
      position.x + width <= bounds.maxX &&
      position.y + height <= bounds.maxY
    );
  } else if (type === 'circle') {
    const props = properties as CircleProps;
    const radius = mmToPx(props.radius);
    
    return (
      position.x - radius >= bounds.minX &&
      position.y - radius >= bounds.minY &&
      position.x + radius <= bounds.maxX &&
      position.y + radius <= bounds.maxY
    );
  }
  
  return false;
};

/**
 * 位置が境界内にあるかチェック
 * @param position 位置
 * @param bounds 境界情報
 * @returns 境界内の場合true
 */
export const isPositionWithinBounds = (position: Position, bounds: BoundingBox): boolean => {
  return (
    position.x >= bounds.minX &&
    position.y >= bounds.minY &&
    position.x <= bounds.maxX &&
    position.y <= bounds.maxY
  );
};

/**
 * テーブルを境界内に制約する
 * @param table テーブルオブジェクト
 * @param bounds 境界情報
 * @returns 制約された位置
 */
export const constrainTableToBounds = (table: TableObject, bounds: BoundingBox): Position => {
  const { position, properties, type } = table;
  let constrainedX = position.x;
  let constrainedY = position.y;
  
  if (type === 'rectangle') {
    const props = properties as RectangleProps;
    const width = mmToPx(props.width);
    const height = mmToPx(props.height);
    
    constrainedX = Math.max(bounds.minX, Math.min(position.x, bounds.maxX - width));
    constrainedY = Math.max(bounds.minY, Math.min(position.y, bounds.maxY - height));
  } else if (type === 'circle') {
    const props = properties as CircleProps;
    const radius = mmToPx(props.radius);
    
    constrainedX = Math.max(bounds.minX + radius, Math.min(position.x, bounds.maxX - radius));
    constrainedY = Math.max(bounds.minY + radius, Math.min(position.y, bounds.maxY - radius));
  }
  
  return { x: constrainedX, y: constrainedY };
};