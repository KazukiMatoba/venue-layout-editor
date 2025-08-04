import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import TableToolbar from './TableToolbar';
import type { TableObject } from '../types';

describe('TableToolbar', () => {
  const mockProps = {
    onCreateTable: vi.fn(),
    selectedTable: null,
    onUpdateTable: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('テーブルツールバーが正しくレンダリングされる', () => {
    render(<TableToolbar {...mockProps} />);
    expect(screen.getByText('テーブル作成')).toBeDefined();
    expect(screen.getByText('長方形')).toBeDefined();
    expect(screen.getByText('円形')).toBeDefined();
  });

  it('長方形テーブルの設定が表示される', () => {
    render(<TableToolbar {...mockProps} />);
    expect(screen.getByText('長方形テーブル設定')).toBeDefined();
    expect(screen.getByDisplayValue('800')).toBeDefined(); // デフォルト幅
    expect(screen.getByDisplayValue('600')).toBeDefined(); // デフォルト高さ
  });

  it('円形テーブルに切り替えると設定が変わる', () => {
    render(<TableToolbar {...mockProps} />);
    
    const circleRadio = screen.getByDisplayValue('circle');
    fireEvent.click(circleRadio);
    
    expect(screen.getByText('円形テーブル設定')).toBeDefined();
    expect(screen.getByDisplayValue('400')).toBeDefined(); // デフォルト半径
  });

  it('テーブル作成ボタンをクリックするとonCreateTableが呼ばれる', () => {
    render(<TableToolbar {...mockProps} />);
    
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);
    
    expect(mockProps.onCreateTable).toHaveBeenCalledWith(
      'rectangle',
      { width: 800, height: 600 }
    );
  });

  it('選択されたテーブルの情報が表示される', () => {
    const selectedTable: TableObject = {
      id: 'test-table-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      properties: { width: 1000, height: 800 },
      style: {
        fill: '#e8f4f8',
        stroke: '#2196f3',
        strokeWidth: 2,
        opacity: 0.8,
      },
    };

    render(<TableToolbar {...mockProps} selectedTable={selectedTable} />);
    
    expect(screen.getByText('選択中のテーブル')).toBeDefined();
    expect(screen.getByText('ID: test-table-1')).toBeDefined();
    expect(screen.getByText('タイプ: 長方形')).toBeDefined();
    expect(screen.getByText('サイズ: 1000mm × 800mm')).toBeDefined();
  });
});