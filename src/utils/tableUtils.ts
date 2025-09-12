import type { TableObject, TextBoxProps } from '../types';

/**
 * テーブルの高さを取得する
 */
export const getTableHeight = (table: TableObject): number => {
  if (table.type === 'rectangle') {
    const props = table.properties as { width: number; height: number };
    return props.height;
  } else if (table.type === 'circle') {
    const props = table.properties as { radius: number };
    return props.radius * 2; // 直径
  } else if (table.type === 'svg') {
    const props = table.properties as any;
    return props.height;
  } else if (table.type === 'textbox') {
    const props = table.properties as TextBoxProps;
    return props.height;
  }
  return 0;
};

/**
 * テーブルの幅を取得する
 */
export const getTableWidth = (table: TableObject): number => {
  if (table.type === 'rectangle') {
    const props = table.properties as { width: number; height: number };
    return props.width;
  } else if (table.type === 'circle') {
    const props = table.properties as { radius: number };
    return props.radius * 2; // 直径
  } else if (table.type === 'svg') {
    const props = table.properties as any;
    return props.width;
  } else if (table.type === 'textbox') {
    const props = table.properties as TextBoxProps;
    return props.width;
  }
  return 0;
};

/**
 * テーブルの左上角座標を取得する
 */
export const getTableTopLeft = (table: TableObject): { x: number; y: number } => {
  const width = getTableWidth(table);
  const height = getTableHeight(table);
  
  if (table.type === 'circle') {
    const props = table.properties as { radius: number };
    return {
      x: table.position.x - props.radius,
      y: table.position.y - props.radius
    };
  } else {
    return {
      x: table.position.x - width / 2,
      y: table.position.y - height / 2
    };
  }
};