/**
 * アクションクリエーター
 * 状態管理のアクションを生成する関数群
 */

import type { AppAction, ActionCreators, PlacementMode } from './types';
import type { SVGData, TableObject, Position } from '../types';

// アクションクリエーター実装
export const actionCreators: ActionCreators = {
  // SVG関連
  setSVGData: (data: SVGData): AppAction => ({
    type: 'SET_SVG_DATA',
    payload: data
  }),
  
  clearSVGData: (): AppAction => ({
    type: 'CLEAR_SVG_DATA'
  }),
  
  setSVGError: (error: string): AppAction => ({
    type: 'SET_SVG_ERROR',
    payload: error
  }),

  // テーブル関連
  addTable: (table: TableObject): AppAction => ({
    type: 'ADD_TABLE',
    payload: table
  }),
  
  updateTable: (id: string, updates: Partial<TableObject>): AppAction => ({
    type: 'UPDATE_TABLE',
    payload: { id, updates }
  }),
  
  deleteTable: (id: string): AppAction => ({
    type: 'DELETE_TABLE',
    payload: id
  }),
  
  selectTable: (id: string | null): AppAction => ({
    type: 'SELECT_TABLE',
    payload: id
  }),
  
  moveTable: (id: string, position: Position): AppAction => ({
    type: 'MOVE_TABLE',
    payload: { id, position }
  }),

  // ドラッグ関連
  startDrag: (tableId: string, startPosition: Position): AppAction => ({
    type: 'START_DRAG',
    payload: { tableId, startPosition }
  }),
  
  updateDrag: (currentPosition: Position, isValid: boolean): AppAction => ({
    type: 'UPDATE_DRAG',
    payload: { currentPosition, isValid }
  }),
  
  endDrag: (finalPosition?: Position): AppAction => ({
    type: 'END_DRAG',
    payload: { finalPosition }
  }),
  
  cancelDrag: (): AppAction => ({
    type: 'CANCEL_DRAG'
  }),

  // ビューポート関連
  setScale: (scale: number): AppAction => ({
    type: 'SET_SCALE',
    payload: scale
  }),
  
  setOffset: (offset: Position): AppAction => ({
    type: 'SET_OFFSET',
    payload: offset
  }),
  
  setCanvasSize: (size: { width: number; height: number }): AppAction => ({
    type: 'SET_CANVAS_SIZE',
    payload: size
  }),
  
  resetViewport: (): AppAction => ({
    type: 'RESET_VIEWPORT'
  }),

  // UI関連
  setLoading: (loading: boolean): AppAction => ({
    type: 'SET_LOADING',
    payload: loading
  }),
  
  toggleGrid: (): AppAction => ({
    type: 'TOGGLE_GRID'
  }),
  
  toggleMeasurements: (): AppAction => ({
    type: 'TOGGLE_MEASUREMENTS'
  }),
  
  setTheme: (theme: 'light' | 'dark'): AppAction => ({
    type: 'SET_THEME',
    payload: theme
  }),

  // 配置モード関連
  setPlacementMode: (mode: PlacementMode | null): AppAction => ({
    type: 'SET_PLACEMENT_MODE',
    payload: mode
  }),
  
  clearPlacementMode: (): AppAction => ({
    type: 'CLEAR_PLACEMENT_MODE'
  }),

  // エラー関連
  setError: (error: string): AppAction => ({
    type: 'SET_ERROR',
    payload: error
  }),
  
  clearError: (): AppAction => ({
    type: 'CLEAR_ERROR'
  }),

  // 履歴管理関連
  undo: (): AppAction => ({
    type: 'UNDO'
  }),
  
  redo: (): AppAction => ({
    type: 'REDO'
  }),
  
  saveSnapshot: (description: string): AppAction => ({
    type: 'SAVE_SNAPSHOT',
    payload: { description }
  }),
  
  clearHistory: (): AppAction => ({
    type: 'CLEAR_HISTORY'
  }),

  // 複合アクション
  resetState: (): AppAction => ({
    type: 'RESET_STATE'
  }),
  
  loadState: (state: Partial<any>): AppAction => ({
    type: 'LOAD_STATE',
    payload: state
  })
};

// 便利な複合アクション関数
export const complexActions = {
  /**
   * テーブルを追加してスナップショットを保存
   */
  addTableWithHistory: (table: TableObject) => [
    actionCreators.addTable(table),
    actionCreators.saveSnapshot(`${table.type}テーブル「${table.id}」を追加`)
  ],
  
  /**
   * テーブルを削除してスナップショットを保存
   */
  deleteTableWithHistory: (id: string, tableType: string) => [
    actionCreators.deleteTable(id),
    actionCreators.saveSnapshot(`${tableType}テーブル「${id}」を削除`)
  ],
  
  /**
   * テーブルを移動してスナップショットを保存
   */
  moveTableWithHistory: (id: string, position: Position) => [
    actionCreators.moveTable(id, position),
    actionCreators.saveSnapshot(`テーブル「${id}」を移動`)
  ],
  
  /**
   * SVGデータを設定してエラーをクリア
   */
  setSVGDataSafely: (data: SVGData) => [
    actionCreators.clearError(),
    actionCreators.setSVGData(data)
  ],
  
  /**
   * 状態をリセットして履歴をクリア
   */
  resetAll: () => [
    actionCreators.resetState(),
    actionCreators.clearHistory()
  ]
};

// フック用のアクションディスパッチャー
export const createActionDispatchers = (dispatch: React.Dispatch<AppAction>) => ({
  // 基本アクション
  ...Object.fromEntries(
    Object.entries(actionCreators).map(([key, actionCreator]) => [
      key,
      (...args: any[]) => dispatch(actionCreator(...args))
    ])
  ),
  
  // 複合アクション
  addTableWithHistory: (table: TableObject) => {
    complexActions.addTableWithHistory(table).forEach(dispatch);
  },
  
  deleteTableWithHistory: (id: string, tableType: string) => {
    complexActions.deleteTableWithHistory(id, tableType).forEach(dispatch);
  },
  
  moveTableWithHistory: (id: string, position: Position) => {
    complexActions.moveTableWithHistory(id, position).forEach(dispatch);
  },
  
  setSVGDataSafely: (data: SVGData) => {
    complexActions.setSVGDataSafely(data).forEach(dispatch);
  },
  
  resetAll: () => {
    complexActions.resetAll().forEach(dispatch);
  }
});