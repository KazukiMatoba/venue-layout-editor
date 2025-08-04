/**
 * 包括的エラーハンドリングユーティリティ
 * 要件1.4, 6.4に対応
 */

import type { SVGLoadError } from '../types/svg';
import type { TableObject, Position } from '../types';

/**
 * エラーの種類を定義
 */
export type ErrorType = 
  | 'svg_load'
  | 'svg_parse'
  | 'svg_size'
  | 'svg_format'
  | 'table_operation'
  | 'boundary_constraint'
  | 'validation'
  | 'system'
  | 'network';

/**
 * エラーの重要度レベル
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 統一エラーオブジェクト
 */
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  code?: string;
  timestamp: number;
  context?: Record<string, any>;
  userFriendlyMessage: string;
  suggestions?: string[];
  recoverable: boolean;
}

/**
 * エラーハンドリング結果
 */
export interface ErrorHandlingResult {
  handled: boolean;
  displayMessage: string;
  shouldRetry: boolean;
  fallbackAction?: () => void;
  logLevel: 'info' | 'warn' | 'error';
}

/**
 * SVG読み込みエラーを統一エラー形式に変換
 */
export const createSVGLoadError = (
  originalError: SVGLoadError | Error | string,
  context?: Record<string, any>
): AppError => {
  let type: ErrorType = 'svg_load';
  let message = 'SVGファイルの読み込みに失敗しました';
  let details = '';
  let code = '';
  let severity: ErrorSeverity = 'medium';
  let userFriendlyMessage = '';
  let suggestions: string[] = [];

  if (typeof originalError === 'string') {
    message = originalError;
    userFriendlyMessage = originalError;
  } else if (originalError instanceof Error) {
    message = originalError.message;
    details = originalError.stack || '';
    userFriendlyMessage = 'SVGファイルの処理中にエラーが発生しました';
  } else {
    // SVGLoadError の場合
    type = originalError.type === 'parse' ? 'svg_parse' : 
          originalError.type === 'size' ? 'svg_size' :
          originalError.type === 'format' ? 'svg_format' : 'svg_load';
    message = originalError.message;
    details = originalError.details || '';
    code = originalError.code || '';
  }

  // エラータイプ別の詳細設定
  switch (type) {
    case 'svg_parse':
      severity = 'high';
      userFriendlyMessage = 'SVGファイルの形式が正しくありません';
      suggestions = [
        'SVGファイルが破損していないか確認してください',
        '別のSVGエディタで保存し直してみてください',
        'ファイルサイズが適切か確認してください'
      ];
      break;
    
    case 'svg_size':
      severity = 'medium';
      userFriendlyMessage = 'SVGファイルのサイズが大きすぎます';
      suggestions = [
        '10MB以下のファイルを選択してください',
        'SVGを最適化してファイルサイズを削減してください',
        '不要な要素を削除してください'
      ];
      break;
    
    case 'svg_format':
      severity = 'medium';
      userFriendlyMessage = 'サポートされていないファイル形式です';
      suggestions = [
        '.svg拡張子のファイルを選択してください',
        'ファイルがSVG形式で保存されているか確認してください'
      ];
      break;
    
    default:
      severity = 'medium';
      userFriendlyMessage = 'SVGファイルの読み込みに失敗しました';
      suggestions = [
        'ファイルが破損していないか確認してください',
        '別のSVGファイルを試してください',
        'ブラウザを再読み込みしてください'
      ];
  }

  return {
    type,
    severity,
    message,
    details,
    code,
    timestamp: Date.now(),
    context,
    userFriendlyMessage,
    suggestions,
    recoverable: true
  };
};

/**
 * テーブル操作エラーを作成
 */
export const createTableOperationError = (
  operation: 'create' | 'move' | 'update' | 'delete',
  tableId: string,
  originalError: Error | string,
  context?: Record<string, any>
): AppError => {
  const message = typeof originalError === 'string' ? originalError : originalError.message;
  const details = originalError instanceof Error ? originalError.stack || '' : '';
  
  const operationText = {
    create: '作成',
    move: '移動',
    update: '更新',
    delete: '削除'
  }[operation];

  return {
    type: 'table_operation',
    severity: 'medium',
    message: `テーブル${operationText}エラー: ${message}`,
    details,
    timestamp: Date.now(),
    context: { ...context, tableId, operation },
    userFriendlyMessage: `テーブルの${operationText}に失敗しました`,
    suggestions: [
      '操作を再試行してください',
      'テーブルの設定を確認してください',
      '他のテーブルとの重複がないか確認してください'
    ],
    recoverable: true
  };
};

/**
 * 境界制約エラーを作成
 */
export const createBoundaryConstraintError = (
  table: TableObject,
  attemptedPosition: Position,
  boundaryInfo: any,
  context?: Record<string, any>
): AppError => {
  return {
    type: 'boundary_constraint',
    severity: 'low',
    message: `境界制約違反: テーブル ${table.id} を位置 (${attemptedPosition.x}, ${attemptedPosition.y}) に配置できません`,
    timestamp: Date.now(),
    context: { ...context, table, attemptedPosition, boundaryInfo },
    userFriendlyMessage: 'テーブルを会場境界外に配置することはできません',
    suggestions: [
      '会場境界内の位置に配置してください',
      'テーブルサイズを小さくしてください',
      'SVG会場図のサイズを確認してください'
    ],
    recoverable: true
  };
};

/**
 * バリデーションエラーを作成
 */
export const createValidationError = (
  field: string,
  value: any,
  rule: string,
  context?: Record<string, any>
): AppError => {
  return {
    type: 'validation',
    severity: 'medium',
    message: `バリデーションエラー: ${field} の値 "${value}" が ${rule} に違反しています`,
    timestamp: Date.now(),
    context: { ...context, field, value, rule },
    userFriendlyMessage: `入力値が正しくありません: ${field}`,
    suggestions: [
      '入力値を確認してください',
      '有効な範囲内の値を入力してください'
    ],
    recoverable: true
  };
};

/**
 * システムエラーを作成
 */
export const createSystemError = (
  originalError: Error,
  context?: Record<string, any>
): AppError => {
  return {
    type: 'system',
    severity: 'critical',
    message: `システムエラー: ${originalError.message}`,
    details: originalError.stack || '',
    timestamp: Date.now(),
    context,
    userFriendlyMessage: 'システムエラーが発生しました',
    suggestions: [
      'ページを再読み込みしてください',
      'ブラウザのキャッシュをクリアしてください',
      '問題が続く場合は管理者にお問い合わせください'
    ],
    recoverable: false
  };
};

/**
 * エラーを処理して適切な対応を決定
 */
export const handleError = (error: AppError): ErrorHandlingResult => {
  // ログレベルの決定
  const logLevel = error.severity === 'critical' ? 'error' : 
                  error.severity === 'high' ? 'error' :
                  error.severity === 'medium' ? 'warn' : 'info';

  // コンソールログ出力
  const logMessage = `[${error.type.toUpperCase()}] ${error.message}`;
  const logData = {
    error,
    timestamp: new Date(error.timestamp).toISOString(),
    context: error.context
  };

  switch (logLevel) {
    case 'error':
      console.error(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    default:
      console.info(logMessage, logData);
  }

  // 表示メッセージの決定
  let displayMessage = error.userFriendlyMessage;
  if (error.suggestions && error.suggestions.length > 0) {
    displayMessage += '\n\n推奨対応:\n• ' + error.suggestions.join('\n• ');
  }

  // リトライ可能性の判定
  const shouldRetry = error.recoverable && 
    ['svg_load', 'table_operation', 'network'].includes(error.type);

  // フォールバック処理の決定
  let fallbackAction: (() => void) | undefined;
  
  if (error.type === 'boundary_constraint') {
    fallbackAction = () => {
      console.log('境界制約エラーのフォールバック: 最後の有効な位置に復帰');
    };
  } else if (error.type === 'table_operation') {
    fallbackAction = () => {
      console.log('テーブル操作エラーのフォールバック: 操作をキャンセル');
    };
  }

  return {
    handled: true,
    displayMessage,
    shouldRetry,
    fallbackAction,
    logLevel
  };
};

/**
 * エラー回復処理
 */
export const attemptErrorRecovery = async (error: AppError): Promise<boolean> => {
  console.log(`エラー回復を試行中: ${error.type}`);
  
  try {
    switch (error.type) {
      case 'svg_load':
        // SVG読み込みエラーの回復
        return await recoverFromSVGLoadError(error);
      
      case 'table_operation':
        // テーブル操作エラーの回復
        return recoverFromTableOperationError(error);
      
      case 'boundary_constraint':
        // 境界制約エラーの回復
        return recoverFromBoundaryConstraintError(error);
      
      default:
        return false;
    }
  } catch (recoveryError) {
    console.error('エラー回復処理中にエラーが発生:', recoveryError);
    return false;
  }
};

/**
 * SVG読み込みエラーからの回復
 */
const recoverFromSVGLoadError = async (error: AppError): Promise<boolean> => {
  // SVGの再解析を試行
  if (error.context?.svgContent) {
    try {
      // 簡略化されたSVGパースを試行
      const parser = new DOMParser();
      const doc = parser.parseFromString(error.context.svgContent, 'text/xml');
      const parserError = doc.querySelector('parsererror');
      
      if (!parserError) {
        console.log('SVG再解析に成功');
        return true;
      }
    } catch (e) {
      console.log('SVG再解析に失敗');
    }
  }
  
  return false;
};

/**
 * テーブル操作エラーからの回復
 */
const recoverFromTableOperationError = (error: AppError): boolean => {
  // テーブル状態の整合性チェック
  if (error.context?.tableId && error.context?.operation) {
    console.log(`テーブル ${error.context.tableId} の ${error.context.operation} 操作を回復中`);
    // 実際の回復処理はコンポーネント側で実装
    return true;
  }
  
  return false;
};

/**
 * 境界制約エラーからの回復
 */
const recoverFromBoundaryConstraintError = (error: AppError): boolean => {
  // 最後の有効な位置への復帰
  if (error.context?.table && error.context?.lastValidPosition) {
    console.log(`テーブル ${error.context.table.id} を最後の有効な位置に復帰`);
    return true;
  }
  
  return false;
};

/**
 * エラー統計情報を収集
 */
export class ErrorStatistics {
  private static instance: ErrorStatistics;
  private errors: AppError[] = [];
  private readonly maxErrors = 100; // 最大保持エラー数

  static getInstance(): ErrorStatistics {
    if (!ErrorStatistics.instance) {
      ErrorStatistics.instance = new ErrorStatistics();
    }
    return ErrorStatistics.instance;
  }

  addError(error: AppError): void {
    this.errors.push(error);
    
    // 古いエラーを削除
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter(error => error.type === type);
  }

  getRecentErrors(minutes: number = 10): AppError[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errors.filter(error => error.timestamp > cutoff);
  }

  getErrorSummary(): Record<ErrorType, number> {
    const summary: Record<string, number> = {};
    this.errors.forEach(error => {
      summary[error.type] = (summary[error.type] || 0) + 1;
    });
    return summary as Record<ErrorType, number>;
  }

  clearErrors(): void {
    this.errors = [];
  }
}