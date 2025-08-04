/**
 * 状態管理のエクスポートインデックス
 * 統合状態管理システムの公開API
 */

// 型定義
export type {
  AppState,
  AppAction,
  DragState,
  ViewportState,
  UIState,
  PlacementMode,
  StateSnapshot,
  HistoryState,
  ActionCreators
} from './types';

// Reducer
export {
  initialState,
  appReducer,
  appReducerWithHistory,
  createInitialHistoryState
} from './reducer';

// アクション
export {
  actionCreators,
  complexActions,
  createActionDispatchers
} from './actions';

// フック
export {
  useAppState,
  useTableOperations,
  useDragOperations,
  useViewportOperations
} from './hooks';

// データ管理フック
export {
  useDataExport,
  useDataImport,
  useLocalStorage,
  useAutoSave,
  useDataManager
} from './dataHooks';

// ミドルウェア
export {
  performanceMiddleware,
  loggingMiddleware,
  validationMiddleware,
  normalizationMiddleware,
  autoSaveMiddleware,
  errorHandlingMiddleware,
  composeMiddleware,
  defaultMiddleware,
  createMiddlewareEnhancedReducer,
  debugMiddleware,
  performanceMonitoringMiddleware
} from './middleware';

// 便利な再エクスポート
export type { Middleware } from './middleware';