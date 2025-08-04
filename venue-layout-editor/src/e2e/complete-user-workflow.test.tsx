import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueLayoutEditor from '../components/VenueLayoutEditor';
import type { VenueData } from '../types';

// 実際のユーザーワークフローをシミュレートするE2Eテスト

// テスト用のSVGコンテンツ
const realisticVenueSVG = `
<svg width="1000" height="800" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
  <!-- 会場の外壁 -->
  <rect x="50" y="50" width="900" height="700" fill="none" stroke="black" stroke-width="3"/>
  
  <!-- ステージエリア -->
  <rect x="100" y="100" width="800" height="150" fill="#f0f0f0" stroke="gray" stroke-width="2"/>
  <text x="500" y="180" text-anchor="middle" font-size="24" fill="black">ステージ</text>
  
  <!-- 柱 -->
  <circle cx="200" cy="400" r="20" fill="gray"/>
  <circle cx="800" cy="400" r="20" fill="gray"/>
  
  <!-- 出入口 -->
  <rect x="50" y="350" width="20" height="100" fill="white" stroke="black" stroke-width="2"/>
  <rect x="930" y="350" width="20" height="100" fill="white" stroke="black" stroke-width="2"/>
  
  <!-- 緊急出口 -->
  <rect x="450" y="50" width="100" height="20" fill="red" stroke="black" stroke-width="1"/>
  <text x="500" y="45" text-anchor="middle" font-size="12" fill="black">緊急出口</text>
</svg>
`;

// ファイル作成用のヘルパー
const createMockFile = (name: string, type: string, content: string): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

describe('完全なユーザーワークフローE2Eテスト', () => {
  beforeEach(() => {
    // リアルなDOMParserモック
    const mockSVGElement = {
      getAttribute: vi.fn((attr: string) => {
        switch (attr) {
          case 'width': return '1000';
          case 'height': return '800';
          case 'viewBox': return '0 0 1000 800';
          default: return null;
        }
      }),
      hasAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([
        { tagName: 'rect' },
        { tagName: 'circle' },
        { tagName: 'text' }
      ]),
      getBBox: vi.fn().mockReturnValue({ x: 50, y: 50, width: 900, height: 700 })
    };

    const mockDoc = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'parsererror') return null;
        if (selector === 'svg') return mockSVGElement;
        return null;
      }),
      querySelectorAll: vi.fn().mockReturnValue([])
    };

    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockReturnValue(mockDoc)
    }));

    // FileReaderのモック
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsText: vi.fn(),
      onload: null,
      onerror: null,
      result: realisticVenueSVG
    }));

    // LocalStorageのモック
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  it('新規ユーザーの完全なワークフロー', async () => {
    const mockOnSave = vi.fn();
    const mockOnExport = vi.fn();

    render(
      <VenueLayoutEditor 
        onSave={mockOnSave}
        onExport={mockOnExport}
      />
    );

    // === フェーズ1: アプリケーション起動と初期状態確認 ===
    
    // 1.1 初期画面の表示確認
    expect(screen.getByText('会場レイアウトエディター')).toBeInTheDocument();
    expect(screen.getByText('SVG会場図を読み込み')).toBeInTheDocument();
    expect(screen.getByText('対応形式: .svg | 最大サイズ: 10MB')).toBeInTheDocument();

    // 1.2 初期状態でテーブル作成ツールが無効であることを確認
    expect(screen.getByText('テーブル作成')).toBeDisabled();

    // === フェーズ2: SVG会場図の読み込み ===
    
    // 2.1 SVGファイルを選択
    const file = createMockFile('wedding-venue.svg', 'image/svg+xml', realisticVenueSVG);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: realisticVenueSVG
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    // 2.2 ファイル読み込み実行
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 2.3 読み込み中の状態確認
    expect(screen.getByText('SVGファイルを読み込み中...')).toBeInTheDocument();

    // 2.4 FileReaderのonloadを実行
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: realisticVenueSVG } } as any);
    }

    // 2.5 読み込み完了後の状態確認
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    expect(screen.queryByText('SVGファイルを読み込み中...')).not.toBeInTheDocument();
    expect(screen.getByText('1000 mm × 800 mm')).toBeInTheDocument();

    // === フェーズ3: テーブル作成とレイアウト設計 ===
    
    // 3.1 テーブル作成ツールが有効になったことを確認
    expect(screen.getByText('テーブル作成')).not.toBeDisabled();

    // 3.2 長方形テーブルを作成（ゲストテーブル用）
    const widthInput = screen.getByDisplayValue('800');
    const heightInput = screen.getByDisplayValue('600');

    fireEvent.change(widthInput, { target: { value: '1200' } }); // 8人用テーブル
    fireEvent.change(heightInput, { target: { value: '800' } });

    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 3.3 円形テーブルを作成（VIPテーブル用）
    const circleRadio = screen.getByDisplayValue('circle');
    fireEvent.click(circleRadio);

    const radiusInput = screen.getByDisplayValue('400');
    fireEvent.change(radiusInput, { target: { value: '600' } }); // 10人用円卓

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
    });

    // 3.4 複数のテーブルを追加作成
    fireEvent.click(createButton); // 2つ目の円卓
    fireEvent.click(createButton); // 3つ目の円卓

    await waitFor(() => {
      expect(screen.getAllByTestId('konva-circle')).toHaveLength(3);
    });

    // === フェーズ4: テーブル配置とレイアウト調整 ===
    
    const tables = [
      screen.getByTestId('konva-rect'),
      ...screen.getAllByTestId('konva-circle')
    ];

    // 4.1 メインテーブル（長方形）をステージ前に配置
    const mainTable = tables[0];
    fireEvent.mouseDown(mainTable, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(mainTable, { clientX: 500, clientY: 300 }); // ステージ前中央
    fireEvent.mouseUp(mainTable, { clientX: 500, clientY: 300 });

    // 4.2 円卓を会場の左右に配置
    const leftTable = tables[1];
    fireEvent.mouseDown(leftTable, { clientX: 150, clientY: 150 });
    fireEvent.mouseMove(leftTable, { clientX: 300, clientY: 500 }); // 左側
    fireEvent.mouseUp(leftTable, { clientX: 300, clientY: 500 });

    const rightTable = tables[2];
    fireEvent.mouseDown(rightTable, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(rightTable, { clientX: 700, clientY: 500 }); // 右側
    fireEvent.mouseUp(rightTable, { clientX: 700, clientY: 500 });

    const backTable = tables[3];
    fireEvent.mouseDown(backTable, { clientX: 250, clientY: 250 });
    fireEvent.mouseMove(backTable, { clientX: 500, clientY: 600 }); // 後方中央
    fireEvent.mouseUp(backTable, { clientX: 500, clientY: 600 });

    // === フェーズ5: レイアウトの微調整 ===
    
    // 5.1 ズーム機能を使用して詳細調整
    const zoomInButton = screen.getByText('+');
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomInButton); // 2倍ズーム

    // 5.2 ズーム状態でテーブル位置を微調整
    fireEvent.mouseDown(leftTable, { clientX: 300, clientY: 500 });
    fireEvent.mouseMove(leftTable, { clientX: 320, clientY: 480 }); // 微調整
    fireEvent.mouseUp(leftTable, { clientX: 320, clientY: 480 });

    // 5.3 ズームアウトして全体確認
    const zoomOutButton = screen.getByText('-');
    fireEvent.click(zoomOutButton);
    fireEvent.click(zoomOutButton);

    // === フェーズ6: 境界制約のテスト ===
    
    // 6.1 テーブルを境界外に移動しようとする
    fireEvent.mouseDown(rightTable, { clientX: 700, clientY: 500 });
    fireEvent.mouseMove(rightTable, { clientX: 1100, clientY: 500 }); // 右境界外
    fireEvent.mouseUp(rightTable, { clientX: 1100, clientY: 500 });

    // 6.2 境界制約フィードバックの確認
    await waitFor(() => {
      expect(screen.getByText(/境界制約/)).toBeInTheDocument();
    });

    // === フェーズ7: 操作の取り消しとやり直し ===
    
    // 7.1 最後の操作をUndo
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

    // 7.2 Undoが実行されたことを確認
    await waitFor(() => {
      expect(screen.queryByText(/境界制約/)).not.toBeInTheDocument();
    });

    // 7.3 操作をRedo
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true });

    // === フェーズ8: レイアウトの保存 ===
    
    // 8.1 保存ボタンをクリック（実装によって異なる）
    const saveButton = screen.queryByText('保存');
    if (saveButton) {
      fireEvent.click(saveButton);
      
      // 8.2 保存コールバックが呼ばれることを確認
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            svgData: expect.objectContaining({
              width: 1000,
              height: 800
            }),
            tables: expect.arrayContaining([
              expect.objectContaining({
                type: 'rectangle'
              }),
              expect.objectContaining({
                type: 'circle'
              })
            ])
          })
        );
      });
    }

    // === フェーズ9: エクスポート機能 ===
    
    // 9.1 エクスポートボタンをクリック
    const exportButton = screen.queryByText('エクスポート');
    if (exportButton) {
      fireEvent.click(exportButton);
      
      // 9.2 エクスポート形式選択
      const jsonExport = screen.queryByText('JSON');
      if (jsonExport) {
        fireEvent.click(jsonExport);
        
        // 9.3 エクスポートコールバックが呼ばれることを確認
        await waitFor(() => {
          expect(mockOnExport).toHaveBeenCalledWith('json');
        });
      }
    }

    // === フェーズ10: 最終状態の確認 ===
    
    // 10.1 全テーブルが存在することを確認
    expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    expect(screen.getAllByTestId('konva-circle')).toHaveLength(3);

    // 10.2 測定値が正しく表示されることを確認
    expect(screen.getByText('1000 mm × 800 mm')).toBeInTheDocument();

    // 10.3 統計情報が表示されることを確認
    expect(screen.getByText(/テーブル数: 4/)).toBeInTheDocument();
  });

  it('既存データの読み込みと編集ワークフロー', async () => {
    // 既存のレイアウトデータ
    const existingVenueData: VenueData = {
      svgData: {
        content: realisticVenueSVG,
        width: 1000,
        height: 800,
        viewBox: { x: 0, y: 0, width: 1000, height: 800 },
        bounds: { minX: 50, minY: 50, maxX: 950, maxY: 750 }
      },
      tables: [
        {
          id: 'existing-table-1',
          type: 'rectangle',
          position: { x: 500, y: 300 },
          properties: { width: 1200, height: 800 },
          style: {
            fill: '#e3f2fd',
            stroke: '#1976d2',
            strokeWidth: 2,
            opacity: 0.8
          }
        },
        {
          id: 'existing-table-2',
          type: 'circle',
          position: { x: 300, y: 500 },
          properties: { radius: 600 },
          style: {
            fill: '#e8f5e8',
            stroke: '#4caf50',
            strokeWidth: 2,
            opacity: 0.8
          }
        }
      ]
    };

    render(<VenueLayoutEditor initialVenue={existingVenueData} />);

    // 1. 既存データが正しく読み込まれることを確認
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    expect(screen.getByTestId('konva-circle')).toBeInTheDocument();

    // 2. 既存テーブルを選択して編集
    const existingTable = screen.getByTestId('konva-rect');
    fireEvent.click(existingTable);

    // 3. 選択されたテーブルの情報が表示されることを確認
    expect(screen.getByText('ID: existing-table-1')).toBeInTheDocument();
    expect(screen.getByText('サイズ: 1200 mm × 800 mm')).toBeInTheDocument();

    // 4. テーブルを移動
    fireEvent.mouseDown(existingTable, { clientX: 500, clientY: 300 });
    fireEvent.mouseMove(existingTable, { clientX: 600, clientY: 400 });
    fireEvent.mouseUp(existingTable, { clientX: 600, clientY: 400 });

    // 5. 新しいテーブルを追加
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getAllByTestId('konva-rect')).toHaveLength(2);
    });

    // 6. 編集後の状態確認
    expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
    expect(screen.getAllByTestId('konva-rect')).toHaveLength(2);
  });

  it('エラー回復ワークフロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. 無効なファイルを読み込んでエラー発生
    const invalidFile = createMockFile('invalid.txt', 'text/plain', 'not svg');
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // 2. エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/SVGファイルを選択してください/)).toBeInTheDocument();
    });

    // 3. エラーを閉じる
    const dismissButton = screen.getByRole('button', { name: /閉じる|×/ });
    fireEvent.click(dismissButton);

    // 4. エラーが消えることを確認
    await waitFor(() => {
      expect(screen.queryByText(/SVGファイルを選択してください/)).not.toBeInTheDocument();
    });

    // 5. 正しいファイルを読み込んで回復
    const validFile = createMockFile('venue.svg', 'image/svg+xml', realisticVenueSVG);

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: realisticVenueSVG
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: realisticVenueSVG } } as any);
    }

    // 6. 正常に読み込まれることを確認
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // 7. 通常の操作が可能であることを確認
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });
  });

  it('パフォーマンステスト - 大量テーブルでの操作', async () => {
    render(<VenueLayoutEditor />);

    // 1. SVGを読み込む
    const file = createMockFile('large-venue.svg', 'image/svg+xml', realisticVenueSVG);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: realisticVenueSVG
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: realisticVenueSVG } } as any);
    }

    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // 2. パフォーマンス測定開始
    const startTime = performance.now();

    // 3. 大量のテーブルを作成
    const createButton = screen.getByText('テーブル作成');
    
    for (let i = 0; i < 50; i++) {
      fireEvent.click(createButton);
    }

    // 4. 全テーブルが作成されるまで待機
    await waitFor(() => {
      expect(screen.getAllByTestId('konva-rect')).toHaveLength(50);
    }, { timeout: 10000 });

    // 5. パフォーマンス測定終了
    const endTime = performance.now();
    const duration = endTime - startTime;

    // 6. 合理的な時間内で完了することを確認（10秒以内）
    expect(duration).toBeLessThan(10000);

    // 7. 全テーブルが正しく表示されることを確認
    expect(screen.getAllByTestId('konva-rect')).toHaveLength(50);
  });

  it('アクセシビリティワークフロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. キーボードナビゲーションのテスト
    const fileInput = screen.getByRole('button', { hidden: true });
    
    // Tab キーでフォーカス移動
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(fileInput);

    // 2. スクリーンリーダー用のaria属性確認
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /測定値/ })).toBeInTheDocument();

    // 3. SVGを読み込んでアクセシビリティ確認
    const file = createMockFile('venue.svg', 'image/svg+xml', realisticVenueSVG);

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: realisticVenueSVG
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: realisticVenueSVG } } as any);
    }

    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // 4. キーボードでテーブル作成
    const createButton = screen.getByText('テーブル作成');
    createButton.focus();
    fireEvent.keyDown(createButton, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 5. キーボードでテーブル選択と移動
    const table = screen.getByTestId('konva-rect');
    fireEvent.click(table);
    
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // 6. アクセシビリティ情報が適切に更新されることを確認
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});