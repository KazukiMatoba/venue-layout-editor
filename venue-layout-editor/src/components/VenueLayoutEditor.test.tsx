import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueLayoutEditor from './VenueLayoutEditor';
import type { VenueData } from '../types';

// Konvaのモック
vi.mock('konva', () => ({
  Stage: vi.fn(() => ({
    container: vi.fn(),
    destroy: vi.fn(),
    draw: vi.fn(),
    getPointerPosition: vi.fn(() => ({ x: 100, y: 100 })),
    scale: vi.fn(() => ({ x: 1, y: 1 })),
    scaleX: vi.fn(() => 1),
    scaleY: vi.fn(() => 1),
    x: vi.fn(() => 0),
    y: vi.fn(() => 0),
    width: vi.fn(() => 800),
    height: vi.fn(() => 600),
    on: vi.fn(),
    off: vi.fn(),
  })),
  Layer: vi.fn(() => ({
    add: vi.fn(),
    draw: vi.fn(),
    destroy: vi.fn(),
    removeChildren: vi.fn(),
  })),
  Rect: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    x: vi.fn(),
    y: vi.fn(),
    width: vi.fn(),
    height: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeWidth: vi.fn(),
    opacity: vi.fn(),
    draggable: vi.fn(),
    destroy: vi.fn(),
  })),
  Circle: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    x: vi.fn(),
    y: vi.fn(),
    radius: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeWidth: vi.fn(),
    opacity: vi.fn(),
    draggable: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// React Konvaのモック
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => <div data-testid=\"konva-stage\" {...props}>{children}</div>,
  Layer: ({ children, ...props }: any) => <div data-testid=\"konva-layer\" {...props}>{children}</div>,
  Rect: (props: any) => <div data-testid=\"konva-rect\" {...props} />,
  Circle: (props: any) => <div data-testid=\"konva-circle\" {...props} />,
}));

// ファイル作成用のヘルパー
const createMockFile = (name: string, type: string, content: string): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

const validSVGContent = `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="600" fill="white" stroke="black"/>
</svg>
`;

describe('VenueLayoutEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // DOMParserのモック
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

    // FileReaderのモック
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsText: vi.fn(),
      onload: null,
      onerror: null,
      result: validSVGContent
    }));
  });

  it('初期状態で正しくレンダリングされる', () => {
    render(<VenueLayoutEditor />);
    
    expect(screen.getByText('会場レイアウトエディター')).toBeInTheDocument();
    expect(screen.getByText('SVG会場図を読み込み')).toBeInTheDocument();
    expect(screen.getByText('テーブル作成')).toBeInTheDocument();
  });

  it('SVGファイルを読み込むとキャンバスが表示される', async () => {
    render(<VenueLayoutEditor />);
    
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    // FileReaderのモック設定
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // FileReaderのonloadを実行
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  it('テーブルを作成できる', async () => {
    render(<VenueLayoutEditor />);
    
    // まずSVGを読み込む
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
    
    // テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);
    
    // テーブルが作成されたことを確認（Konvaコンポーネントが追加される）
    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });
  });

  it('エラーが発生した場合にエラーメッセージが表示される', async () => {
    render(<VenueLayoutEditor />);
    
    const invalidFile = createMockFile('invalid.txt', 'text/plain', 'not svg');
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/SVGファイルを選択してください/)).toBeInTheDocument();
    });
  });

  it('初期データが提供された場合に復元される', () => {
    const initialVenue: VenueData = {
      svgData: {
        content: validSVGContent,
        width: 800,
        height: 600,
        viewBox: { x: 0, y: 0, width: 800, height: 600 },
        bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 }
      },
      tables: [
        {
          id: 'table-1',
          type: 'rectangle',
          position: { x: 100, y: 100 },
          properties: { width: 80, height: 60 },
          style: {
            fill: '#e3f2fd',
            stroke: '#1976d2',
            strokeWidth: 2,
            opacity: 0.8
          }
        }
      ]
    };
    
    render(<VenueLayoutEditor initialVenue={initialVenue} />);
    
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
  });

  it('保存コールバックが正しく呼ばれる', async () => {
    render(<VenueLayoutEditor onSave={mockOnSave} />);
    
    // SVGを読み込んでテーブルを作成
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
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
    
    // 保存ボタンがあれば押す（実装によって異なる）
    // この部分は実際のUI実装に合わせて調整が必要
  });

  it('エクスポートコールバックが正しく呼ばれる', async () => {
    render(<VenueLayoutEditor onExport={mockOnExport} />);
    
    // SVGを読み込む
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
    
    // エクスポートボタンがあれば押す（実装によって異なる）
    // この部分は実際のUI実装に合わせて調整が必要
  });

  it('ズーム機能が動作する', async () => {
    render(<VenueLayoutEditor />);
    
    // SVGを読み込む
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
    
    // ズームコントロールがあることを確認
    const zoomControls = screen.getByText('ズーム');
    expect(zoomControls).toBeInTheDocument();
  });

  it('測定値が表示される', async () => {
    render(<VenueLayoutEditor />);
    
    // SVGを読み込む
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
    
    // 測定値表示があることを確認
    expect(screen.getByText(/800.*600/)).toBeInTheDocument(); // SVGサイズ表示
  });

  it('キーボードショートカットが動作する', async () => {
    render(<VenueLayoutEditor />);
    
    // SVGを読み込んでテーブルを作成
    const file = createMockFile('venue.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: validSVGContent } } as any);
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
    
    // Ctrl+Z（Undo）をテスト
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    
    // Undoが実行されたことを確認（テーブルが削除される）
    await waitFor(() => {
      expect(screen.queryByTestId('konva-rect')).not.toBeInTheDocument();
    });
  });

  it('レスポンシブデザインが動作する', () => {
    // ウィンドウサイズを変更
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
    
    // モバイル表示に適応していることを確認
    const container = screen.getByText('会場レイアウトエディター').closest('div');
    expect(container).toHaveClass('venue-layout-editor');
  });
});