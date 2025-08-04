/**
 * バリデーション関連のユーティリティ
 * 要件1.4, 2.2, 2.3, 6.1, 6.2対応
 */

import type { SVGData, TableObject, RectangleProps, CircleProps } from '../types';

// バリデーション結果の型定義
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * SVGファイルのバリデーション
 */
export const validateSVGFile = (file: File): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ファイル形式チェック
  if (!file.type.includes('svg') && !file.name.toLowerCase().endsWith('.svg')) {
    errors.push({
      field: 'file',
      message: 'SVGファイルを選択してください。対応形式: .svg',
      code: 'INVALID_FILE_TYPE',
      value: file.type
    });
  }

  // ファイルサイズチェック（10MB制限）
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: 'ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。',
      code: 'FILE_TOO_LARGE',
      value: file.size
    });
  }

  // 警告: 大きなファイル
  if (file.size > 5 * 1024 * 1024) {
    warnings.push({
      field: 'file',
      message: 'ファイルサイズが大きいため、読み込みに時間がかかる場合があります。',
      code: 'LARGE_FILE',
      value: file.size,
      suggestion: 'より小さなファイルの使用を検討してください'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * SVGデータのバリデーション
 */
export const validateSVGData = (svgData: SVGData): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 寸法チェック
  if (svgData.width <= 0 || svgData.height <= 0) {
    errors.push({
      field: 'dimensions',
      message: 'SVGの寸法が無効です',
      code: 'INVALID_DIMENSIONS',
      value: { width: svgData.width, height: svgData.height }
    });
  }

  // 最小サイズチェック
  if (svgData.width < 100 || svgData.height < 100) {
    warnings.push({
      field: 'dimensions',
      message: '会場サイズが小さすぎる可能性があります',
      code: 'SMALL_VENUE',
      value: { width: svgData.width, height: svgData.height },
      suggestion: 'より大きな会場サイズを検討してください'
    });
  }

  // 最大サイズチェック
  if (svgData.width > 10000 || svgData.height > 10000) {
    warnings.push({
      field: 'dimensions',
      message: '会場サイズが大きすぎる可能性があります',
      code: 'LARGE_VENUE',
      value: { width: svgData.width, height: svgData.height },
      suggestion: 'パフォーマンスの問題が発生する可能性があります'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * テーブルオブジェクトのバリデーション
 */
export const validateTableObject = (table: TableObject): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ID チェック
  if (!table.id || table.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'テーブルIDが必要です',
      code: 'MISSING_ID',
      value: table.id
    });
  }

  // 位置チェック
  if (typeof table.position.x !== 'number' || typeof table.position.y !== 'number') {
    errors.push({
      field: 'position',
      message: 'テーブル位置が無効です',
      code: 'INVALID_POSITION',
      value: table.position
    });
  }

  // タイプ別プロパティチェック
  if (table.type === 'rectangle') {
    const props = table.properties as RectangleProps;
    if (props.width <= 0 || props.height <= 0) {
      errors.push({
        field: 'properties',
        message: '長方形テーブルの寸法が無効です',
        code: 'INVALID_RECTANGLE_SIZE',
        value: props
      });
    }
  } else if (table.type === 'circle') {
    const props = table.properties as CircleProps;
    if (props.radius <= 0) {
      errors.push({
        field: 'properties',
        message: '円形テーブルの半径が無効です',
        code: 'INVALID_CIRCLE_SIZE',
        value: props
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * バリデーション結果をユーザーフレンドリーなメッセージに変換
 */
export const formatValidationMessage = (result: ValidationResult): string => {
  if (result.isValid) {
    return '入力値は有効です';
  }

  const messages: string[] = [];
  
  if (result.errors.length > 0) {
    messages.push('エラー:');
    result.errors.forEach(error => {
      messages.push(`• ${error.message}`);
    });
  }
  
  if (result.warnings.length > 0) {
    messages.push('警告:');
    result.warnings.forEach(warning => {
      messages.push(`• ${warning.message}`);
      if (warning.suggestion) {
        messages.push(`  推奨: ${warning.suggestion}`);
      }
    });
  }
  
  return messages.join('\n');
};