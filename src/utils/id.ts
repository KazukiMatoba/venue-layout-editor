/**
 * ID生成ユーティリティ
 */

// 一意のテーブルIDを生成
export const generateTableId = (): string => {
  return `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 短縮IDを生成（表示用）
export const generateShortId = (): string => {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
};