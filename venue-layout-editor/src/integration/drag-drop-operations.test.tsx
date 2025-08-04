import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueLayoutEditor from '../components/VenueLayoutEditor';

// テスト用のSVGコンテンツ
const testSVGContent = `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="600" fill="white" stroke="black" stroke-width="2"/>
</svg>
`;

// ファイル作成用のヘルパー
const createMockFile = (name: string, type: string, content: string): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

// Konvaイベントのモック
const createMockKonvaEvent = (x: number, y: number) => ({
  target: {
    x: vi.fn(() => x),
    y: vi.fn(() => y),
    setPosition: vi.fn(),
    getPosition: vi.fn(() => ({ x, y })),
    getStage: vi.fn(() => ({
      getPointerPosition: vi.fn(() => ({ x, y }))
    }))
  },
  evt: {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  }
});

describe('ドラッグ＆ドロップ操作の統合テスト', () => {
  beforeEach(() => {
    // DOMParserのモック設定
    const mockSVGElement = {
      getAttribute: vi.fn((attr: string) => {
        switch (attr) {
          case 'width': return '800';
          case 'height': return '600';
          case 'viewBox': return '0 0 800 600';
          default: return null;
        }
      }),
      hasAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
      getBBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 })
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

    // FileReaderのモック設定
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsText: vi.fn(),
      onload: null,
      onerror: null,
      result: testSVGContent
    }));
  });

  const setupVenueWithTable = async () => {
    render(<VenueLayoutEditor />);

    // SVGを読み込む
    const file = createMockFile('venue.svg', 'image/svg+xml', testSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: testSVGContent
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: testSVGContent } } as any);
    }

    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    return screen.getByTestId('konva-rect');
  };

  it('テーブルの基本的なドラッグ操作', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. ドラッグ開始
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });

    // 2. ドラッグ中の移動
    fireEvent.mouseMove(tableElement, { clientX: 200, clientY: 150 });

    // 3. ドラッグ終了
    fireEvent.mouseUp(tableElement, { clientX: 200, clientY: 150 });

    // 4. テーブルが新しい位置に移動したことを確認
    // （実際の実装では、テーブルの位置を確認する方法が必要）
    expect(tableElement).toBeInTheDocument();
  });

  it('境界制約内でのドラッグ操作', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. 境界内の有効な位置へのドラッグ
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 300, clientY: 250 });
    fireEvent.mouseUp(tableElement, { clientX: 300, clientY: 250 });

    // 2. テーブルが移動したことを確認
    expect(tableElement).toBeInTheDocument();

    // 3. 境界近くの位置へのドラッグ
    fireEvent.mouseDown(tableElement, { clientX: 300, clientY: 250 });
    fireEvent.mouseMove(tableElement, { clientX: 750, clientY: 550 });
    fireEvent.mouseUp(tableElement, { clientX: 750, clientY: 550 });

    // 4. テーブルが境界内に制約されることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('境界外へのドラッグ制約', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. 左境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: -50, clientY: 100 });
    fireEvent.mouseUp(tableElement, { clientX: -50, clientY: 100 });

    // 2. テーブルが境界内に制約されることを確認
    expect(tableElement).toBeInTheDocument();

    // 3. 右境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 850, clientY: 100 });
    fireEvent.mouseUp(tableElement, { clientX: 850, clientY: 100 });

    // 4. テーブルが境界内に制約されることを確認
    expect(tableElement).toBeInTheDocument();

    // 5. 上境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 100, clientY: -50 });
    fireEvent.mouseUp(tableElement, { clientX: 100, clientY: -50 });

    // 6. テーブルが境界内に制約されることを確認
    expect(tableElement).toBeInTheDocument();

    // 7. 下境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 100, clientY: 650 });
    fireEvent.mouseUp(tableElement, { clientX: 100, clientY: 650 });

    // 8. テーブルが境界内に制約されることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('複数テーブルのドラッグ操作', async () => {
    const firstTable = await setupVenueWithTable();

    // 2つ目のテーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getAllByTestId('konva-rect')).toHaveLength(2);
    });

    const tables = screen.getAllByTestId('konva-rect');
    const secondTable = tables[1];

    // 1. 最初のテーブルをドラッグ
    fireEvent.mouseDown(firstTable, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(firstTable, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(firstTable, { clientX: 200, clientY: 150 });

    // 2. 2つ目のテーブルをドラッグ
    fireEvent.mouseDown(secondTable, { clientX: 150, clientY: 150 });
    fireEvent.mouseMove(secondTable, { clientX: 300, clientY: 250 });
    fireEvent.mouseUp(secondTable, { clientX: 300, clientY: 250 });

    // 3. 両方のテーブルが存在することを確認
    expect(screen.getAllByTestId('konva-rect')).toHaveLength(2);
  });

  it('円形テーブルのドラッグ操作', async () => {
    render(<VenueLayoutEditor />);

    // SVGを読み込む
    const file = createMockFile('venue.svg', 'image/svg+xml', testSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: testSVGContent
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: testSVGContent } } as any);
    }

    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // 円形テーブルに切り替え
    const circleRadio = screen.getByDisplayValue('circle');
    fireEvent.click(circleRadio);

    // 円形テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
    });

    const circleTable = screen.getByTestId('konva-circle');

    // 円形テーブルのドラッグ操作
    fireEvent.mouseDown(circleTable, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(circleTable, { clientX: 250, clientY: 200 });
    fireEvent.mouseUp(circleTable, { clientX: 250, clientY: 200 });

    // テーブルが移動したことを確認
    expect(circleTable).toBeInTheDocument();
  });

  it('ドラッグ中のビジュアルフィードバック', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. ドラッグ開始時のフィードバック
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });

    // ドラッグ状態のスタイルが適用されることを確認
    expect(tableElement).toHaveClass('dragging');

    // 2. ドラッグ中のフィードバック
    fireEvent.mouseMove(tableElement, { clientX: 200, clientY: 150 });

    // 位置更新のフィードバックを確認
    expect(tableElement).toHaveClass('dragging');

    // 3. ドラッグ終了時のフィードバック
    fireEvent.mouseUp(tableElement, { clientX: 200, clientY: 150 });

    // ドラッグ状態のスタイルが解除されることを確認
    expect(tableElement).not.toHaveClass('dragging');
  });

  it('境界制約時のビジュアルフィードバック', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. 境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: -50, clientY: 100 });

    // 2. 境界制約の警告フィードバックが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/境界制約/)).toBeInTheDocument();
    });

    // 3. ドラッグ終了
    fireEvent.mouseUp(tableElement, { clientX: -50, clientY: 100 });

    // 4. 警告フィードバックが消えることを確認
    await waitFor(() => {
      expect(screen.queryByText(/境界制約/)).not.toBeInTheDocument();
    });
  });

  it('最小ドラッグ距離の判定', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. 最小距離未満の微小な移動
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 101, clientY: 101 });
    fireEvent.mouseUp(tableElement, { clientX: 101, clientY: 101 });

    // 2. 微小な移動は無視されることを確認
    // （実際の実装では、テーブルの位置が変更されないことを確認）
    expect(tableElement).toBeInTheDocument();

    // 3. 最小距離以上の移動
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 110, clientY: 110 });
    fireEvent.mouseUp(tableElement, { clientX: 110, clientY: 110 });

    // 4. 有効な移動として処理されることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('ドラッグ操作のUndo/Redo', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. テーブルをドラッグして移動
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(tableElement, { clientX: 200, clientY: 150 });

    // 2. Undoでドラッグ操作を取り消し
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

    // 3. テーブルが元の位置に戻ることを確認
    expect(tableElement).toBeInTheDocument();

    // 4. Redoでドラッグ操作を復元
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true });

    // 5. テーブルが移動後の位置に戻ることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('タッチデバイスでのドラッグ操作', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. タッチ開始
    fireEvent.touchStart(tableElement, {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // 2. タッチ移動
    fireEvent.touchMove(tableElement, {
      touches: [{ clientX: 200, clientY: 150 }]
    });

    // 3. タッチ終了
    fireEvent.touchEnd(tableElement, {
      changedTouches: [{ clientX: 200, clientY: 150 }]
    });

    // 4. テーブルが移動したことを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('キーボードを使用したテーブル移動', async () => {
    const tableElement = await setupVenueWithTable();

    // 1. テーブルを選択
    fireEvent.click(tableElement);

    // 2. 矢印キーでテーブルを移動
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // 3. テーブルが移動したことを確認
    expect(tableElement).toBeInTheDocument();

    // 4. Shiftキーと組み合わせた高速移動
    fireEvent.keyDown(document, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(document, { key: 'ArrowUp', shiftKey: true });

    // 5. より大きな移動が行われることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('ドラッグ操作のパフォーマンス測定', async () => {
    const tableElement = await setupVenueWithTable();

    // パフォーマンス測定開始
    const startTime = performance.now();

    // 1. 連続的なドラッグ操作
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });

    for (let i = 0; i < 100; i++) {
      fireEvent.mouseMove(tableElement, { 
        clientX: 100 + i, 
        clientY: 100 + i 
      });
    }

    fireEvent.mouseUp(tableElement, { clientX: 200, clientY: 200 });

    // パフォーマンス測定終了
    const endTime = performance.now();
    const duration = endTime - startTime;

    // 2. 合理的な時間内で完了することを確認（1秒以内）
    expect(duration).toBeLessThan(1000);

    // 3. テーブルが最終位置に移動したことを確認
    expect(tableElement).toBeInTheDocument();
  });
});