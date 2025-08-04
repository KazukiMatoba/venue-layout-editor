/**
 * 状態管理用のカスタムフック
 * useReducerを使用した統合状態管理とUndo/Redo機能を提供
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { AppState, AppAction, HistoryState } from './types';
import { initialState, appReducerWithHistory, createInitialHistoryState } from './reducer';
import { createActionDispatchers } from './actions';

// 履歴管理付きの初期状態
const createInitialStateWithHistory = (): AppState & { history: HistoryState } => ({
  ...initialState,
  history: createInitialHistoryState(initialState)
});

/**
 * アプリケーション状態管理のメインフック
 * 統合状態管理、履歴管理、パフォーマンス最適化を提供
 */
export const useAppState = () => {
  // 履歴管理付きのReducer
  const [state, dispatch] = useReducer(
    appReducerWithHistory,
    createInitialStateWithHistory()
  );

  // アクションディスパッチャーをメモ化
  const actions = useMemo(
    () => createActionDispatchers(dispatch),
    [dispatch]
  );

  // 履歴管理の状態を分離
  const { history, ...appState } = state;

  // 履歴管理の便利な情報
  const historyInfo = useMemo(() => ({
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    currentDescription: history.present.description,
    historySize: history.past.length + history.future.length + 1
  }), [history]);

  // パフォーマンス最適化のためのセレクター
  const selectors = useMemo(() => ({
    // テーブル関連
    getTableById: (id: string) => appState.tables.find(table => table.id === id),
    getSelectedTable: () => appState.selectedTableId 
      ? appState.tables.find(table => table.id === appState.selectedTableId)
      : null,
    getTableCount: () => appState.tables.length,
    
    // ドラッグ状態
    isDragging: () => appState.dragState?.isDragging ?? false,
    getDraggedTable: () => appState.dragState?.tableId 
      ? appState.tables.find(table => table.id === appState.dragState!.tableId)
      : null,
    
    // UI状態
    isLoading: () => appState.ui.isLoading,
    hasError: () => appState.error !== null,
    
    // SVG状態
    hasSVG: () => appState.svgData !== null,
    getSVGBounds: () => appState.svgData?.bounds ?? null,
    
    // ビューポート状態
    getViewportTransform: () => ({
      scale: appState.viewport.scale,
      offset: appState.viewport.offset
    })
  }), [appState]);

  return {
    // 状態
    state: appState,
    
    // アクション
    actions,
    
    // セレクター
    selectors,
    
    // 履歴管理
    history: historyInfo,
    
    // 生のディスパッチ（高度な使用のため）
    dispatch
  };
};

/**
 * テーブル操作専用のフック
 * テーブル関連の操作を簡単にするためのヘルパー
 */
export const useTableOperations = () => {
  const { state, actions, selectors } = useAppState();

  const tableOperations = useMemo(() => ({
    // テーブル作成
    createTable: (type: 'rectangle' | 'circle', position: { x: number; y: number }, props: any) => {
      const table = {
        id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        position,
        properties: props,
        style: {
          fill: '#e3f2fd',
          stroke: '#1976d2',
          strokeWidth: 2,
          opacity: 0.8
        }
      };
      actions.addTableWithHistory(table);
      return table;
    },

    // テーブル複製
    duplicateTable: (tableId: string) => {
      const originalTable = selectors.getTableById(tableId);
      if (!originalTable) return null;

      const duplicatedTable = {
        ...originalTable,
        id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: originalTable.position.x + 50,
          y: originalTable.position.y + 50
        }
      };
      
      actions.addTableWithHistory(duplicatedTable);
      return duplicatedTable;
    },

    // 選択されたテーブルを削除
    deleteSelectedTable: () => {
      if (state.selectedTableId) {
        const table = selectors.getTableById(state.selectedTableId);
        if (table) {
          actions.deleteTableWithHistory(state.selectedTableId, table.type);
        }
      }
    },

    // すべてのテーブルを削除
    clearAllTables: () => {
      state.tables.forEach(table => {
        actions.deleteTable(table.id);
      });
      actions.saveSnapshot('すべてのテーブルを削除');
    },

    // テーブルの位置を調整
    alignTables: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (state.tables.length < 2) return;

      const bounds = state.tables.reduce((acc, table) => {
        const { x, y } = table.position;
        return {
          minX: Math.min(acc.minX, x),
          maxX: Math.max(acc.maxX, x),
          minY: Math.min(acc.minY, y),
          maxY: Math.max(acc.maxY, y)
        };
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

      state.tables.forEach(table => {
        let newPosition = { ...table.position };

        switch (alignment) {
          case 'left':
            newPosition.x = bounds.minX;
            break;
          case 'center':
            newPosition.x = (bounds.minX + bounds.maxX) / 2;
            break;
          case 'right':
            newPosition.x = bounds.maxX;
            break;
          case 'top':
            newPosition.y = bounds.minY;
            break;
          case 'middle':
            newPosition.y = (bounds.minY + bounds.maxY) / 2;
            break;
          case 'bottom':
            newPosition.y = bounds.maxY;
            break;
        }

        actions.moveTable(table.id, newPosition);
      });

      actions.saveSnapshot(`テーブルを${alignment}に整列`);
    }
  }), [state, actions, selectors]);

  return tableOperations;
};

/**
 * ドラッグ操作専用のフック
 * ドラッグ&ドロップの状態管理を簡単にする
 */
export const useDragOperations = () => {
  const { state, actions, selectors } = useAppState();

  const dragOperations = useMemo(() => ({
    // ドラッグ開始
    startDrag: useCallback((tableId: string, startPosition: { x: number; y: number }) => {
      actions.startDrag(tableId, startPosition);
    }, [actions]),

    // ドラッグ更新
    updateDrag: useCallback((currentPosition: { x: number; y: number }, isValid: boolean) => {
      actions.updateDrag(currentPosition, isValid);
    }, [actions]),

    // ドラッグ終了
    endDrag: useCallback((finalPosition?: { x: number; y: number }) => {
      if (state.dragState) {
        actions.endDrag(finalPosition);
        actions.saveSnapshot(`テーブル「${state.dragState.tableId}」を移動`);
      }
    }, [actions, state.dragState]),

    // ドラッグキャンセル
    cancelDrag: useCallback(() => {
      actions.cancelDrag();
    }, [actions]),

    // ドラッグ状態の情報
    dragInfo: {
      isDragging: selectors.isDragging(),
      draggedTable: selectors.getDraggedTable(),
      isValidPosition: state.dragState?.isValid ?? true,
      dragDuration: state.dragState ? Date.now() - state.dragState.startTime : 0
    }
  }), [state, actions, selectors]);

  return dragOperations;
};

/**
 * ビューポート操作専用のフック
 * ズームとパンの操作を管理
 */
export const useViewportOperations = () => {
  const { state, actions } = useAppState();

  const viewportOperations = useMemo(() => ({
    // ズーム操作
    zoomIn: useCallback(() => {
      actions.setScale(state.viewport.scale * 1.2);
    }, [actions, state.viewport.scale]),

    zoomOut: useCallback(() => {
      actions.setScale(state.viewport.scale / 1.2);
    }, [actions, state.viewport.scale]),

    zoomToFit: useCallback(() => {
      if (!state.svgData || state.tables.length === 0) return;

      // すべてのテーブルを含む境界を計算
      const bounds = state.tables.reduce((acc, table) => {
        const { x, y } = table.position;
        return {
          minX: Math.min(acc.minX, x),
          maxX: Math.max(acc.maxX, x),
          minY: Math.min(acc.minY, y),
          maxY: Math.max(acc.maxY, y)
        };
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      const scaleX = state.viewport.canvasSize.width / width;
      const scaleY = state.viewport.canvasSize.height / height;
      const scale = Math.min(scaleX, scaleY) * 0.8; // 余白を考慮

      actions.setScale(scale);
      actions.setOffset({
        x: state.viewport.canvasSize.width / 2 - centerX * scale,
        y: state.viewport.canvasSize.height / 2 - centerY * scale
      });
    }, [actions, state.svgData, state.tables, state.viewport]),

    // パン操作
    pan: useCallback((deltaX: number, deltaY: number) => {
      actions.setOffset({
        x: state.viewport.offset.x + deltaX,
        y: state.viewport.offset.y + deltaY
      });
    }, [actions, state.viewport.offset]),

    // ビューポートリセット
    resetViewport: useCallback(() => {
      actions.resetViewport();
    }, [actions])
  }), [state, actions]);

  return viewportOperations;
};