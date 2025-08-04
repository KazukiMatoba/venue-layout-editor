import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MeasurementDisplay from './MeasurementDisplay';
import type { Position, TableObject } from '../types';

describe('MeasurementDisplay', () => {
  const mockSVGBounds = {
    minX: 0,
    minY: 0,
    maxX: 800,
    maxY: 600
  };

  const mockTable: TableObject = {
    id: 'test-table',
    type: 'rectangle',
    position: { x: 100, y: 100 },
    properties: { width: 80, height: 60 },
    style: {
      fill: '#e3f2fd',
      stroke: '#1976d2',
      strokeWidth: 2,
      opacity: 0.8
    }
  };

  it('SVG境界の測定値が表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
      />
    );
    
    expect(screen.getByText('会場サイズ')).toBeInTheDocument();
    expect(screen.getByText('800 mm × 600 mm')).toBeInTheDocument();
  });

  it('スケールが適用された測定値が表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={2.0}
      />
    );
    
    // スケール2.0の場合、実際のサイズは半分になる
    expect(screen.getByText('400 mm × 300 mm')).toBeInTheDocument();
  });

  it('選択されたテーブルの情報が表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={mockTable}
      />
    );
    
    expect(screen.getByText('選択中のテーブル')).toBeInTheDocument();
    expect(screen.getByText('ID: test-table')).toBeInTheDocument();
    expect(screen.getByText('位置: (100, 100) mm')).toBeInTheDocument();
    expect(screen.getByText('サイズ: 80 mm × 60 mm')).toBeInTheDocument();
  });

  it('円形テーブルの情報が正しく表示される', () => {
    const circleTable: TableObject = {
      id: 'circle-table',
      type: 'circle',
      position: { x: 150, y: 200 },
      properties: { radius: 40 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={circleTable}
      />
    );
    
    expect(screen.getByText('ID: circle-table')).toBeInTheDocument();
    expect(screen.getByText('位置: (150, 200) mm')).toBeInTheDocument();
    expect(screen.getByText('半径: 40 mm')).toBeInTheDocument();
  });

  it('マウス位置が表示される', () => {
    const mousePosition: Position = { x: 250, y: 300 };
    
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        mousePosition={mousePosition}
      />
    );
    
    expect(screen.getByText('マウス位置')).toBeInTheDocument();
    expect(screen.getByText('(250, 300) mm')).toBeInTheDocument();
  });

  it('ズームレベルが表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.5}
        zoomLevel={150}
      />
    );
    
    expect(screen.getByText('ズーム')).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('単位切り替えが動作する', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={mockTable}
      />
    );
    
    // 初期状態はmm
    expect(screen.getByText('800 mm × 600 mm')).toBeInTheDocument();
    
    // 単位切り替えボタンをクリック
    const unitButton = screen.getByText('mm');
    fireEvent.click(unitButton);
    
    // cmに切り替わる
    expect(screen.getByText('80.0 cm × 60.0 cm')).toBeInTheDocument();
    
    // もう一度クリック
    fireEvent.click(screen.getByText('cm'));
    
    // mに切り替わる
    expect(screen.getByText('0.80 m × 0.60 m')).toBeInTheDocument();
    
    // もう一度クリック
    fireEvent.click(screen.getByText('m'));
    
    // mmに戻る
    expect(screen.getByText('800 mm × 600 mm')).toBeInTheDocument();
  });

  it('精度設定が動作する', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        precision={1}
      />
    );
    
    // 小数点1桁で表示
    const table: TableObject = {
      id: 'precision-table',
      type: 'rectangle',
      position: { x: 123.456, y: 789.123 },
      properties: { width: 85.7, height: 65.3 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={table}
        precision={1}
      />
    );
    
    expect(screen.getByText('位置: (123.5, 789.1) mm')).toBeInTheDocument();
    expect(screen.getByText('サイズ: 85.7 mm × 65.3 mm')).toBeInTheDocument();
  });

  it('コンパクトモードが動作する', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        compact={true}
      />
    );
    
    const container = screen.getByText('会場サイズ').closest('div');
    expect(container).toHaveClass('measurement-display--compact');
  });

  it('表示/非表示の切り替えが動作する', () => {
    const { rerender } = render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        visible={true}
      />
    );
    
    expect(screen.getByText('会場サイズ')).toBeInTheDocument();
    
    rerender(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        visible={false}
      />
    );
    
    expect(screen.queryByText('会場サイズ')).not.toBeInTheDocument();
  });

  it('カスタムフォーマッターが動作する', () => {
    const customFormatter = (value: number, unit: string) => {
      return `${value.toFixed(3)} ${unit.toUpperCase()}`;
    };
    
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        formatter={customFormatter}
      />
    );
    
    expect(screen.getByText('800.000 MM × 600.000 MM')).toBeInTheDocument();
  });

  it('エラー状態が表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        error="測定値の計算でエラーが発生しました"
      />
    );
    
    expect(screen.getByText('測定値の計算でエラーが発生しました')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ローディング状態が表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        loading={true}
      />
    );
    
    expect(screen.getByText('測定値を計算中...')).toBeInTheDocument();
  });

  it('空の状態が表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={null}
        scale={1.0}
      />
    );
    
    expect(screen.getByText('会場図が読み込まれていません')).toBeInTheDocument();
  });

  it('統計情報が表示される', () => {
    const tables: TableObject[] = [
      mockTable,
      {
        id: 'table-2',
        type: 'circle',
        position: { x: 200, y: 200 },
        properties: { radius: 30 },
        style: {
          fill: '#e3f2fd',
          stroke: '#1976d2',
          strokeWidth: 2,
          opacity: 0.8
        }
      }
    ];
    
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        tables={tables}
        showStatistics={true}
      />
    );
    
    expect(screen.getByText('統計情報')).toBeInTheDocument();
    expect(screen.getByText('テーブル数: 2')).toBeInTheDocument();
    expect(screen.getByText('長方形: 1, 円形: 1')).toBeInTheDocument();
  });

  it('面積計算が正しく表示される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={mockTable}
        showArea={true}
      />
    );
    
    // 長方形の面積: 80 × 60 = 4800 mm²
    expect(screen.getByText('面積: 4800 mm²')).toBeInTheDocument();
  });

  it('円形テーブルの面積計算が正しく表示される', () => {
    const circleTable: TableObject = {
      id: 'circle-area',
      type: 'circle',
      position: { x: 100, y: 100 },
      properties: { radius: 10 },
      style: {
        fill: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
        opacity: 0.8
      }
    };
    
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={circleTable}
        showArea={true}
      />
    );
    
    // 円の面積: π × 10² ≈ 314.16 mm²
    expect(screen.getByText(/面積: 314\.\d+ mm²/)).toBeInTheDocument();
  });

  it('キーボードショートカットが動作する', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
      />
    );
    
    // Uキーで単位切り替え
    fireEvent.keyDown(document, { key: 'u' });
    
    // 単位が切り替わることを確認（実装によって異なる）
    // この部分は実際の実装に合わせて調整が必要
  });

  it('アクセシビリティ属性が適切に設定される', () => {
    render(
      <MeasurementDisplay 
        svgBounds={mockSVGBounds}
        scale={1.0}
        selectedTable={mockTable}
      />
    );
    
    const measurementRegion = screen.getByRole('region');
    expect(measurementRegion).toHaveAttribute('aria-label', '測定値表示');
    
    const tableInfo = screen.getByText('選択中のテーブル').closest('div');
    expect(tableInfo).toHaveAttribute('aria-live', 'polite');
  });
});