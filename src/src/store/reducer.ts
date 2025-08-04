/**
 * アプリケーション状態のReducer
 * useReducerを使用した統合状態管理の実装
 */

import type { AppState, AppAction, StateSnapshot, HistoryState } from './types';
import { DEFAULT_SCALE } from '../utils/scale';

// 初期状態
export const initialState: AppState = {
  svgData: null,
  tables: [],
  selectedTableId: null,
  dragState: null,
  viewport: {
    scale: DEFAULT_SCALE,
    offset: { x: 0, y: 0 },
    canvasSize: { width: 800, height: 600 }
  },
  ui: {
    isLoading: false,
    showGrid: true,
    showMeasurements: true,
    theme: 'light'
  },
  error: null,
  placementMode: null
};

// 履歴管理の初期状態
export const createInitialHistoryState = (state: AppState): HistoryState => ({
  past: [],
  present: {
    tables: state.tables,
    selectedTableId: state.selectedTableId,
    timestamp: Date.now(),
    description: '初期状態'
  },
  future: [],
  maxHistorySize: 50
});

// 状態スナップショットを作成
const createSnapshot = (state: AppState, description: string): StateSnapshot => ({
  tables: [...state.tables],
  selectedTableId: state.selectedTableId,
  timestamp: Date.now(),
  description
});

// 履歴管理のヘルパー関数
const addToHistory = (history: HistoryState, snapshot: StateSnapshot): HistoryState => {
  const newPast = [...history.past, history.present];
  
  // 履歴サイズの制限
  if (newPast.length > history.maxHistorySize) {
    newPast.shift();
  }
  
  return {
    ...history,
    past: newPast,
    present: snapshot,
    future: [] // 新しいアクションで未来の履歴をクリア
  };
};

// Undo操作
const performUndo = (history: HistoryState): HistoryState => {
  if (history.past.length === 0) {
    return history;
  }
  
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  
  return {
    ...history,
    past: newPast,
    present: previous,
    future: [history.present, ...history.future]
  };
};

// Redo操作
const performRedo = (history: HistoryState): HistoryState => {
  if (history.future.length === 0) {
    return history;
  }
  
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  
  return {
    ...history,
    past: [...history.past, history.present],
    present: next,
    future: newFuture
  };
};

// メインのReducer
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    // SVG関連
    case 'SET_SVG_DATA':
      return {
        ...state,
        svgData: action.payload,
        error: null,
        // SVG読み込み時にビューポートをリセット
        viewport: {
          ...state.viewport,
          scale: DEFAULT_SCALE,
          offset: { x: 0, y: 0 }
        }
      };
      
    case 'CLEAR_SVG_DATA':
      return {
        ...state,
        svgData: null,
        tables: [], // SVGクリア時にテーブルもクリア
        selectedTableId: null,
        dragState: null,
        placementMode: null,
        error: null
      };
      
    case 'SET_SVG_ERROR':
      return {
        ...state,
        error: action.payload,
        svgData: null
      };

    // テーブル関連
    case 'ADD_TABLE':
      return {
        ...state,
        tables: [...state.tables, action.payload],
        selectedTableId: action.payload.id,
        placementMode: null // テーブル追加後は配置モードを解除
      };
      
    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map(table =>
          table.id === action.payload.id
            ? { ...table, ...action.payload.updates }
            : table
        )
      };
      
    case 'DELETE_TABLE':
      return {
        ...state,
        tables: state.tables.filter(table => table.id !== action.payload),
        selectedTableId: state.selectedTableId === action.payload ? null : state.selectedTableId,
        dragState: state.dragState?.tableId === action.payload ? null : state.dragState
      };
      
    case 'SELECT_TABLE':
      return {
        ...state,
        selectedTableId: action.payload
      };
      
    case 'MOVE_TABLE':
      return {
        ...state,
        tables: state.tables.map(table =>
          table.id === action.payload.id
            ? { ...table, position: action.payload.position }
            : table
        )
      };

    // ドラッグ関連
    case 'START_DRAG':
      return {
        ...state,
        dragState: {
          tableId: action.payload.tableId,
          startPosition: action.payload.startPosition,
          currentPosition: action.payload.startPosition,
          isValid: true,
          isDragging: true,
          startTime: Date.now()
        },
        selectedTableId: action.payload.tableId
      };
      
    case 'UPDATE_DRAG':
      if (!state.dragState) return state;
      
      return {
        ...state,
        dragState: {
          ...state.dragState,
          currentPosition: action.payload.currentPosition,
          isValid: action.payload.isValid
        }
      };
      
    case 'END_DRAG':
      if (!state.dragState) return state;
      
      const finalPosition = action.payload.finalPosition || state.dragState.currentPosition;
      
      return {
        ...state,
        tables: state.tables.map(table =>
          table.id === state.dragState!.tableId
            ? { ...table, position: finalPosition }
            : table
        ),
        dragState: null
      };
      
    case 'CANCEL_DRAG':
      return {
        ...state,
        dragState: null
      };

    // ビューポート関連
    case 'SET_SCALE':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          scale: Math.max(0.1, Math.min(5.0, action.payload)) // スケール制限
        }
      };
      
    case 'SET_OFFSET':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          offset: action.payload
        }
      };
      
    case 'SET_CANVAS_SIZE':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          canvasSize: action.payload
        }
      };
      
    case 'RESET_VIEWPORT':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          scale: DEFAULT_SCALE,
          offset: { x: 0, y: 0 }
        }
      };

    // UI関連
    case 'SET_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isLoading: action.payload
        }
      };
      
    case 'TOGGLE_GRID':
      return {
        ...state,
        ui: {
          ...state.ui,
          showGrid: !state.ui.showGrid
        }
      };
      
    case 'TOGGLE_MEASUREMENTS':
      return {
        ...state,
        ui: {
          ...state.ui,
          showMeasurements: !state.ui.showMeasurements
        }
      };
      
    case 'SET_THEME':
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload
        }
      };

    // 配置モード関連
    case 'SET_PLACEMENT_MODE':
      return {
        ...state,
        placementMode: action.payload
      };
      
    case 'CLEAR_PLACEMENT_MODE':
      return {
        ...state,
        placementMode: null
      };

    // エラー関連
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    // 複合アクション
    case 'RESET_STATE':
      return {
        ...initialState,
        ui: state.ui // UI設定は保持
      };
      
    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload
      };

    default:
      return state;
  }
};

// 履歴管理付きのReducer
export const appReducerWithHistory = (
  state: AppState & { history: HistoryState },
  action: AppAction
): AppState & { history: HistoryState } => {
  
  // 履歴管理対象のアクション
  const historyActions = [
    'ADD_TABLE',
    'DELETE_TABLE',
    'MOVE_TABLE',
    'UPDATE_TABLE'
  ];
  
  // 履歴管理専用のアクション
  if (action.type === 'UNDO') {
    const newHistory = performUndo(state.history);
    return {
      ...state,
      tables: newHistory.present.tables,
      selectedTableId: newHistory.present.selectedTableId,
      history: newHistory
    };
  }
  
  if (action.type === 'REDO') {
    const newHistory = performRedo(state.history);
    return {
      ...state,
      tables: newHistory.present.tables,
      selectedTableId: newHistory.present.selectedTableId,
      history: newHistory
    };
  }
  
  if (action.type === 'SAVE_SNAPSHOT') {
    const snapshot = createSnapshot(state, action.payload.description);
    return {
      ...state,
      history: addToHistory(state.history, snapshot)
    };
  }
  
  if (action.type === 'CLEAR_HISTORY') {
    return {
      ...state,
      history: createInitialHistoryState(state)
    };
  }
  
  // 通常のアクション処理
  const newState = appReducer(state, action);
  
  // 履歴管理対象のアクションの場合、スナップショットを保存
  if (historyActions.includes(action.type)) {
    const description = getActionDescription(action);
    const snapshot = createSnapshot(newState, description);
    
    return {
      ...newState,
      history: addToHistory(state.history, snapshot)
    };
  }
  
  return {
    ...newState,
    history: state.history
  };
};

// アクションの説明を生成
const getActionDescription = (action: AppAction): string => {
  switch (action.type) {
    case 'ADD_TABLE':
      return 'テーブルを追加';
    case 'DELETE_TABLE':
      return 'テーブルを削除';
    case 'MOVE_TABLE':
      return 'テーブルを移動';
    case 'UPDATE_TABLE':
      return 'テーブルを更新';
    default:
      return '操作';
  }
};