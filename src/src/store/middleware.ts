/**
 * 状態管理ミドルウェア
 * パフォーマンス最適化、ログ記録、デバッグ機能を提供
 */

import type { AppState, AppAction } from './types';

// ミドルウェア関数の型定義
export type Middleware = (
  state: AppState,
  action: AppAction,
  next: (action: AppAction) => AppState
) => AppState;

// アクション実行時間の測定
export const performanceMiddleware: Middleware = (state, action, next) => {
  const startTime = performance.now();
  const newState = next(action);
  const endTime = performance.now();
  
  // 時間のかかるアクションを警告
  const duration = endTime - startTime;
  if (duration > 16) { // 60fps基準で16ms以上
    console.warn(`Slow action detected: ${action.type} took ${duration.toFixed(2)}ms`);
  }
  
  return newState;
};

// アクションログ記録（開発環境のみ）
export const loggingMiddleware: Middleware = (state, action, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔄 Action: ${action.type}`);
    console.log('Previous State:', state);
    console.log('Action:', action);
    
    const newState = next(action);
    
    console.log('Next State:', newState);
    console.groupEnd();
    
    return newState;
  }
  
  return next(action);
};

// 状態の整合性チェック
export const validationMiddleware: Middleware = (state, action, next) => {
  const newState = next(action);
  
  // 基本的な整合性チェック
  const validationErrors: string[] = [];
  
  // 選択されたテーブルが存在するかチェック
  if (newState.selectedTableId && !newState.tables.find(t => t.id === newState.selectedTableId)) {
    validationErrors.push('Selected table does not exist');
  }
  
  // ドラッグ状態のテーブルが存在するかチェック
  if (newState.dragState && !newState.tables.find(t => t.id === newState.dragState!.tableId)) {
    validationErrors.push('Dragged table does not exist');
  }
  
  // テーブルIDの重複チェック
  const tableIds = newState.tables.map(t => t.id);
  const uniqueIds = new Set(tableIds);
  if (tableIds.length !== uniqueIds.size) {
    validationErrors.push('Duplicate table IDs detected');
  }
  
  // ビューポートの値チェック
  if (newState.viewport.scale <= 0 || newState.viewport.scale > 10) {
    validationErrors.push('Invalid viewport scale');
  }
  
  if (validationErrors.length > 0) {
    console.error('State validation errors:', validationErrors);
    console.error('Action:', action);
    console.error('State:', newState);
  }
  
  return newState;
};

// 状態の正規化
export const normalizationMiddleware: Middleware = (state, action, next) => {
  let newState = next(action);
  
  // テーブル位置の正規化（小数点以下を丸める）
  newState = {
    ...newState,
    tables: newState.tables.map(table => ({
      ...table,
      position: {
        x: Math.round(table.position.x * 100) / 100,
        y: Math.round(table.position.y * 100) / 100
      }
    }))
  };
  
  // ビューポートオフセットの正規化
  newState = {
    ...newState,
    viewport: {
      ...newState.viewport,
      offset: {
        x: Math.round(newState.viewport.offset.x * 100) / 100,
        y: Math.round(newState.viewport.offset.y * 100) / 100
      },
      scale: Math.round(newState.viewport.scale * 1000) / 1000
    }
  };
  
  return newState;
};

// 自動保存機能
export const autoSaveMiddleware: Middleware = (state, action, next) => {
  const newState = next(action);
  
  // 重要な変更があった場合に自動保存をトリガー
  const importantActions = [
    'ADD_TABLE',
    'DELETE_TABLE',
    'MOVE_TABLE',
    'UPDATE_TABLE',
    'SET_SVG_DATA'
  ];
  
  if (importantActions.includes(action.type)) {
    // 自動保存のイベントを発火（実際の保存処理は別途実装）
    window.dispatchEvent(new CustomEvent('venue-editor-auto-save', {
      detail: { state: newState, action }
    }));
  }
  
  return newState;
};

// エラー処理ミドルウェア
export const errorHandlingMiddleware: Middleware = (state, action, next) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Error in reducer:', error);
    console.error('Action:', action);
    console.error('State:', state);
    
    // エラー状態を設定
    return {
      ...state,
      error: `アクション実行中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// ミドルウェアを組み合わせる関数
export const composeMiddleware = (...middlewares: Middleware[]) => {
  return (state: AppState, action: AppAction, baseNext: (action: AppAction) => AppState): AppState => {
    let index = 0;
    
    const next = (currentAction: AppAction): AppState => {
      if (index >= middlewares.length) {
        return baseNext(currentAction);
      }
      
      const middleware = middlewares[index++];
      return middleware(state, currentAction, next);
    };
    
    return next(action);
  };
};

// デフォルトのミドルウェアスタック
export const defaultMiddleware = composeMiddleware(
  errorHandlingMiddleware,
  performanceMiddleware,
  validationMiddleware,
  normalizationMiddleware,
  autoSaveMiddleware,
  loggingMiddleware
);

// ミドルウェア付きのReducerを作成するヘルパー
export const createMiddlewareEnhancedReducer = (
  baseReducer: (state: AppState, action: AppAction) => AppState,
  middleware: Middleware = defaultMiddleware
) => {
  return (state: AppState, action: AppAction): AppState => {
    return middleware(state, action, (action) => baseReducer(state, action));
  };
};

// デバッグ用のミドルウェア（開発環境のみ）
export const debugMiddleware: Middleware = (state, action, next) => {
  if (process.env.NODE_ENV === 'development') {
    // Redux DevTools風の情報を出力
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${action.type}`, {
      action,
      prevState: state,
      nextState: next(action)
    });
  }
  
  return next(action);
};

// パフォーマンス監視用のミドルウェア
export const performanceMonitoringMiddleware: Middleware = (state, action, next) => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const newState = next(action);
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const metrics = {
    action: action.type,
    duration: endTime - startTime,
    memoryDelta: endMemory - startMemory,
    timestamp: Date.now()
  };
  
  // パフォーマンスメトリクスを記録
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('venue-editor-performance', {
      detail: metrics
    }));
  }
  
  return newState;
};