/**
 * 状態管理の型定義
 * useReducerを使用した統合状態管理のための型定義
 */

import type { SVGData, TableObject, Position } from '../types';

// アプリケーション全体の状態
export interface AppState {
  // SVGデータ
  svgData: SVGData | null;
  
  // テーブル管理
  tables: TableObject[];
  selectedTableId: string | null;
  
  // ドラッグ状態
  dragState: DragState | null;
  
  // ビューポート状態
  viewport: ViewportState;
  
  // UI状態
  ui: UIState;
  
  // エラー状態
  error: string | null;
  
  // 配置モード
  placementMode: PlacementMode | null;
}

// ドラッグ状態
export interface DragState {
  tableId: string;
  startPosition: Position;
  currentPosition: Position;
  isValid: boolean;
  isDragging: boolean;
  startTime: number;
}

// ビューポート状態
export interface ViewportState {
  scale: number;
  offset: Position;
  canvasSize: {
    width: number;
    height: number;
  };
}

// UI状態
export interface UIState {
  isLoading: boolean;
  showGrid: boolean;
  showMeasurements: boolean;
  theme: 'light' | 'dark';
}

// 配置モード
export interface PlacementMode {
  active: boolean;
  tableType: 'rectangle' | 'circle';
  tableProps: any;
}

// 履歴管理のための状態スナップショット
export interface StateSnapshot {
  tables: TableObject[];
  selectedTableId: string | null;
  timestamp: number;
  description: string;
}

// 履歴管理状態
export interface HistoryState {
  past: StateSnapshot[];
  present: StateSnapshot;
  future: StateSnapshot[];
  maxHistorySize: number;
}

// アクション型定義
export type AppAction =
  // SVG関連
  | { type: 'SET_SVG_DATA'; payload: SVGData }
  | { type: 'CLEAR_SVG_DATA' }
  | { type: 'SET_SVG_ERROR'; payload: string }
  
  // テーブル関連
  | { type: 'ADD_TABLE'; payload: TableObject }
  | { type: 'UPDATE_TABLE'; payload: { id: string; updates: Partial<TableObject> } }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'SELECT_TABLE'; payload: string | null }
  | { type: 'MOVE_TABLE'; payload: { id: string; position: Position } }
  
  // ドラッグ関連
  | { type: 'START_DRAG'; payload: { tableId: string; startPosition: Position } }
  | { type: 'UPDATE_DRAG'; payload: { currentPosition: Position; isValid: boolean } }
  | { type: 'END_DRAG'; payload: { finalPosition?: Position } }
  | { type: 'CANCEL_DRAG' }
  
  // ビューポート関連
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_OFFSET'; payload: Position }
  | { type: 'SET_CANVAS_SIZE'; payload: { width: number; height: number } }
  | { type: 'RESET_VIEWPORT' }
  
  // UI関連
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_MEASUREMENTS' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  
  // 配置モード関連
  | { type: 'SET_PLACEMENT_MODE'; payload: PlacementMode | null }
  | { type: 'CLEAR_PLACEMENT_MODE' }
  
  // エラー関連
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  
  // 履歴管理関連
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_SNAPSHOT'; payload: { description: string } }
  | { type: 'CLEAR_HISTORY' }
  
  // 複合アクション
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };

// アクションクリエーター用の型
export interface ActionCreators {
  // SVG関連
  setSVGData: (data: SVGData) => AppAction;
  clearSVGData: () => AppAction;
  setSVGError: (error: string) => AppAction;
  
  // テーブル関連
  addTable: (table: TableObject) => AppAction;
  updateTable: (id: string, updates: Partial<TableObject>) => AppAction;
  deleteTable: (id: string) => AppAction;
  selectTable: (id: string | null) => AppAction;
  moveTable: (id: string, position: Position) => AppAction;
  
  // ドラッグ関連
  startDrag: (tableId: string, startPosition: Position) => AppAction;
  updateDrag: (currentPosition: Position, isValid: boolean) => AppAction;
  endDrag: (finalPosition?: Position) => AppAction;
  cancelDrag: () => AppAction;
  
  // ビューポート関連
  setScale: (scale: number) => AppAction;
  setOffset: (offset: Position) => AppAction;
  setCanvasSize: (size: { width: number; height: number }) => AppAction;
  resetViewport: () => AppAction;
  
  // UI関連
  setLoading: (loading: boolean) => AppAction;
  toggleGrid: () => AppAction;
  toggleMeasurements: () => AppAction;
  setTheme: (theme: 'light' | 'dark') => AppAction;
  
  // 配置モード関連
  setPlacementMode: (mode: PlacementMode | null) => AppAction;
  clearPlacementMode: () => AppAction;
  
  // エラー関連
  setError: (error: string) => AppAction;
  clearError: () => AppAction;
  
  // 履歴管理関連
  undo: () => AppAction;
  redo: () => AppAction;
  saveSnapshot: (description: string) => AppAction;
  clearHistory: () => AppAction;
  
  // 複合アクション
  resetState: () => AppAction;
  loadState: (state: Partial<AppState>) => AppAction;
}