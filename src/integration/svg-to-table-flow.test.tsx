import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueLayoutEditor from '../components/VenueLayoutEditor';

// テスト用のSVGコンテンツ
const testSVGContent = `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="600" fill="white" stroke="black" stroke-width="2"/>
  <text x="400" y="300" text-anchor="middle" font-size="24">テスト会場</text>
</svg>
`;

// ファイル作成用のヘルパー
const createMockFile = (name: string, type: string, content: string): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

describe('SVG読み込みからテーブル配置までの統合テスト', () => {
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

  it('SVGファイル読み込みからテーブル作成までの完全フロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. 初期状態の確認
    expect(screen.getByText('会場レイアウトエディター')).toBeInTheDocument();
    expect(screen.getByText('SVG会場図を読み込み')).toBeInTheDocument();

    // 2. SVGファイルを読み込む
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

    // FileReaderのonloadを実行
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: testSVGContent } } as any);
    }

    // 3. キャンバスが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // 4. 測定値が表示されることを確認
    expect(screen.getByText(/800.*600/)).toBeInTheDocument();

    // 5. テーブル作成ツールバーが表示されることを確認
    expect(screen.getByText('テーブル作成')).toBeInTheDocument();
    expect(screen.getByText('長方形')).toBeInTheDocument();
    expect(screen.getByText('円形')).toBeInTheDocument();

    // 6. 長方形テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    // 7. テーブルがキャンバスに追加されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 8. 円形テーブルに切り替えて作成
    const circleRadio = screen.getByDisplayValue('circle');
    fireEvent.click(circleRadio);

    fireEvent.click(createButton);

    // 9. 円形テーブルも追加されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
    });

    // 10. 複数のテーブルが存在することを確認
    expect(screen.getAllByTestId(/konva-(rect|circle)/)).toHaveLength(2);
  });

  it('SVG読み込みエラーハンドリングフロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. 無効なファイルを読み込む
    const invalidFile = createMockFile('invalid.txt', 'text/plain', 'not svg');
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // 2. エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/SVGファイルを選択してください/)).toBeInTheDocument();
    });

    // 3. キャンバスが表示されないことを確認
    expect(screen.queryByTestId('konva-stage')).not.toBeInTheDocument();

    // 4. エラーを閉じる
    const dismissButton = screen.getByRole('button', { name: /閉じる|×/ });
    fireEvent.click(dismissButton);

    // 5. エラーメッセージが消えることを確認
    await waitFor(() => {
      expect(screen.queryByText(/SVGファイルを選択してください/)).not.toBeInTheDocument();
    });
  });

  it('大きなSVGファイルの処理フロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. 大きなSVGファイルを作成（11MB）
    const largeContent = testSVGContent + 'x'.repeat(11 * 1024 * 1024);
    const largeFile = createMockFile('large.svg', 'image/svg+xml', largeContent);
    
    // ファイルサイズをモック
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // 2. ファイルサイズエラーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/ファイルサイズが大きすぎます/)).toBeInTheDocument();
    });
  });

  it('複数のSVGファイル読み込みフロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. 最初のSVGを読み込む
    const file1 = createMockFile('venue1.svg', 'image/svg+xml', testSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    let mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: testSVGContent
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file1] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: testSVGContent } } as any);
    }

    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    // 2. テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 3. 新しいSVGを読み込む（既存のテーブルは削除される）
    const newSVGContent = testSVGContent.replace('800', '1000').replace('600', '800');
    const file2 = createMockFile('venue2.svg', 'image/svg+xml', newSVGContent);

    mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: newSVGContent
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file2] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: newSVGContent } } as any);
    }

    // 4. 新しいSVGが読み込まれ、測定値が更新されることを確認
    await waitFor(() => {
      expect(screen.getByText(/1000.*800/)).toBeInTheDocument();
    });

    // 5. 既存のテーブルがクリアされることを確認
    expect(screen.queryByTestId('konva-rect')).not.toBeInTheDocument();
  });

  it('テーブル作成とプロパティ変更フロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. SVGを読み込む
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

    // 2. テーブルサイズを変更
    const widthInput = screen.getByDisplayValue('800');
    const heightInput = screen.getByDisplayValue('600');

    fireEvent.change(widthInput, { target: { value: '1000' } });
    fireEvent.change(heightInput, { target: { value: '800' } });

    // 3. テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 4. 作成されたテーブルのプロパティが正しいことを確認
    // （実際の実装では、テーブルのプロパティを確認する方法が必要）
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('800')).toBeInTheDocument();
  });

  it('キーボードショートカットを使用したフロー', async () => {
    render(<VenueLayoutEditor />);

    // 1. SVGを読み込む
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

    // 2. テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 3. Ctrl+Z（Undo）でテーブル削除
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(screen.queryByTestId('konva-rect')).not.toBeInTheDocument();
    });

    // 4. Ctrl+Y（Redo）でテーブル復元
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });
  });

  it('レスポンシブ表示での操作フロー', async () => {
    // モバイルサイズに変更
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<VenueLayoutEditor />);

    // 1. SVGを読み込む
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

    // 2. モバイル表示でもテーブル作成が動作することを確認
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 3. レスポンシブレイアウトが適用されていることを確認
    const container = screen.getByText('会場レイアウトエディター').closest('div');
    expect(container).toHaveClass('venue-layout-editor');
  });
});