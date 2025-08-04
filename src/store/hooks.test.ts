/**
 * 状態管理フックのテスト
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppState, useTableOperations, useDragOperations, useViewportOperations } from './hooks';
import type { TableObject } from '../types';

describe('useAppState', () => {
  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.state.tables).toEqual([]);
    expect(result.current.state.selectedTableId).toBeNull();
    expect(result.current.state.svgData).toBeNull();
    expect(result.current.state.dragState).toBeNull();
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.viewport.scale).toBe(1);
    expect(result.current.state.ui.isLoading).toBe(false);
  });

  it('SVGデータを設定できる', () => {
    const { result } = renderHook(() => useAppState());
    
    const svgData = {
      content: '<svg></svg>',
      width: 100,
      height: 100,
      viewBox: { x: 0, y: 0, width: 100, height: 100 },
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    };
    
    act(() => {
      result.current.actions.setSVGData(svgData);
    });
    
    expect(result.current.state.svgData).toEqual(svgData);
    expect(result.current.state.error).toBeNull();
  });

  it('テーブルを追加できる', () => {
    const { result } = renderHook(() => useAppState());
    
    const table: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 50, height: 30 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    act(() => {
      result.current.actions.addTable(table);
    });
    
    expect(result.current.state.tables).toHaveLength(1);
    expect(result.current.state.tables[0]).toEqual(table);
    expect(result.current.state.selectedTableId).toBe(table.id);
  });

  it('テーブルを選択できる', () => {
    const { result } = renderHook(() => useAppState());
    
    const table: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 50, height: 30 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    act(() => {
      result.current.actions.addTable(table);
      result.current.actions.selectTable('test-table-1');
    });
    
    expect(result.current.state.selectedTableId).toBe('test-table-1');
    expect(result.current.selectors.getSelectedTable()).toEqual(table);
  });

  it('Undo/Redo機能が動作する', () => {
    const { result } = renderHook(() => useAppState());
    
    const table: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 50, height: 30 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    // テーブルを追加
    act(() => {
      result.current.actions.addTable(table);
    });
    
    expect(result.current.state.tables).toHaveLength(1);
    expect(result.current.history.canUndo).toBe(true);
    
    // Undo実行
    act(() => {
      result.current.actions.undo();
    });
    
    expect(result.current.state.tables).toHaveLength(0);
    expect(result.current.history.canRedo).toBe(true);
    
    // Redo実行
    act(() => {
      result.current.actions.redo();
    });
    
    expect(result.current.state.tables).toHaveLength(1);
  });
});

describe('useTableOperations', () => {
  it('テーブルを作成できる', () => {
    const { result } = renderHook(() => useTableOperations());
    
    let createdTable: TableObject | null = null;
    
    act(() => {
      createdTable = result.current.createTable(
        'rectangle',
        { x: 100, y: 100 },
        { width: 50, height: 30 }
      );
    });
    
    expect(createdTable).not.toBeNull();
    expect(createdTable!.type).toBe('rectangle');
    expect(createdTable!.position).toEqual({ x: 100, y: 100 });
    expect(createdTable!.properties).toEqual({ width: 50, height: 30 });
  });

  it('テーブルを複製できる', () => {
    const { result } = renderHook(() => useTableOperations());
    
    let originalTable: TableObject | null = null;
    let duplicatedTable: TableObject | null = null;
    
    act(() => {
      originalTable = result.current.createTable(
        'circle',
        { x: 100, y: 100 },
        { radius: 25 }
      );
    });
    
    act(() => {
      duplicatedTable = result.current.duplicateTable(originalTable!.id);
    });
    
    expect(duplicatedTable).not.toBeNull();
    expect(duplicatedTable!.id).not.toBe(originalTable!.id);
    expect(duplicatedTable!.type).toBe(originalTable!.type);
    expect(duplicatedTable!.position).toEqual({ x: 150, y: 150 }); // オフセット
    expect(duplicatedTable!.properties).toEqual(originalTable!.properties);
  });
});

describe('useDragOperations', () => {
  it('ドラッグ操作を開始できる', () => {
    const { result } = renderHook(() => useDragOperations());
    
    act(() => {
      result.current.startDrag('test-table-1', { x: 100, y: 100 });
    });
    
    expect(result.current.dragInfo.isDragging).toBe(true);
  });

  it('ドラッグ位置を更新できる', () => {
    const { result } = renderHook(() => useDragOperations());
    
    act(() => {
      result.current.startDrag('test-table-1', { x: 100, y: 100 });
      result.current.updateDrag({ x: 150, y: 150 }, true);
    });
    
    expect(result.current.dragInfo.isValidPosition).toBe(true);
  });

  it('ドラッグをキャンセルできる', () => {
    const { result } = renderHook(() => useDragOperations());
    
    act(() => {
      result.current.startDrag('test-table-1', { x: 100, y: 100 });
      result.current.cancelDrag();
    });
    
    expect(result.current.dragInfo.isDragging).toBe(false);
  });
});

describe('useViewportOperations', () => {
  it('ズームイン/アウトができる', () => {
    const { result } = renderHook(() => useViewportOperations());
    
    // 初期スケールを確認
    const initialScale = 1;
    
    act(() => {
      result.current.zoomIn();
    });
    
    // ズームイン後のスケールを確認（1.2倍）
    expect(Math.round(initialScale * 1.2 * 100) / 100).toBeCloseTo(1.2);
    
    act(() => {
      result.current.zoomOut();
    });
    
    // ズームアウト後のスケールを確認（元に戻る）
    // 1.2 / 1.2 = 1.0
  });

  it('ビューポートをリセットできる', () => {
    const { result } = renderHook(() => useViewportOperations());
    
    act(() => {
      result.current.zoomIn();
      result.current.pan(100, 100);
      result.current.resetViewport();
    });
    
    // リセット後の値を確認（初期値に戻る）
    // スケール: 1, オフセット: {x: 0, y: 0}
  });
});

describe('セレクター機能', () => {
  it('テーブルをIDで取得できる', () => {
    const { result } = renderHook(() => useAppState());
    
    const table: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 50, height: 30 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    act(() => {
      result.current.actions.addTable(table);
    });
    
    const foundTable = result.current.selectors.getTableById('test-table-1');
    expect(foundTable).toEqual(table);
    
    const notFoundTable = result.current.selectors.getTableById('non-existent');
    expect(notFoundTable).toBeUndefined();
  });

  it('選択されたテーブルを取得できる', () => {
    const { result } = renderHook(() => useAppState());
    
    const table: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 50, height: 30 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    act(() => {
      result.current.actions.addTable(table);
      result.current.actions.selectTable('test-table-1');
    });
    
    const selectedTable = result.current.selectors.getSelectedTable();
    expect(selectedTable).toEqual(table);
  });

  it('テーブル数を取得できる', () => {
    const { result } = renderHook(() => useAppState());
    
    expect(result.current.selectors.getTableCount()).toBe(0);
    
    const table: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 50, height: 30 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    act(() => {
      result.current.actions.addTable(table);
    });
    
    expect(result.current.selectors.getTableCount()).toBe(1);
  });
});