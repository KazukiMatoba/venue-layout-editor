import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SVGLoader from './SVGLoader';

// モックファイル作成用のヘルパー
const createMockFile = (name: string, type: string, content: string): File => {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  return file;
};

// 有効なSVGコンテンツ
const validSVGContent = `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="80" fill="blue"/>
</svg>
`;

// 無効なSVGコンテンツ
const invalidSVGContent = '<invalid>not svg</invalid>';

describe('SVGLoader', () => {
  const mockOnSVGLoad = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態で正しくレンダリングされる', () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    expect(screen.getByText('SVG会場図を読み込み')).toBeInTheDocument();
    expect(screen.getByText(/SVGファイルをドラッグ&ドロップするか/)).toBeInTheDocument();
    expect(screen.getByText('対応形式: .svg | 最大サイズ: 10MB')).toBeInTheDocument();
  });

  it('ファイル選択ボタンをクリックするとファイル入力がトリガーされる', () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    const dropZone = screen.getByText('SVG会場図を読み込み').closest('div');
    fireEvent.click(dropZone!);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('有効なSVGファイルが選択されたときにonSVGLoadが呼ばれる', async () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    const file = createMockFile('test.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    // FileReaderのモック
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // FileReaderのonloadを手動で実行
    mockFileReader.onload({ target: { result: validSVGContent } } as any);
    
    await waitFor(() => {
      expect(mockOnSVGLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          content: validSVGContent,
          width: 100,
          height: 100,
          viewBox: expect.objectContaining({
            x: 0,
            y: 0,
            width: 100,
            height: 100
          })
        })
      );
    });
  });

  it('無効なファイル形式の場合にonErrorが呼ばれる', async () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    const file = createMockFile('test.txt', 'text/plain', 'not svg');
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('SVGファイルを選択してください。対応形式: .svg');
    });
  });

  it('ファイルサイズが大きすぎる場合にonErrorが呼ばれる', async () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    // 11MBのファイルを模擬
    const largeContent = 'x'.repeat(11 * 1024 * 1024);
    const file = createMockFile('large.svg', 'image/svg+xml', largeContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
    });
  });

  it('ドラッグオーバー時にスタイルが変更される', () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    const dropZone = screen.getByText('SVG会場図を読み込み').closest('div')!;
    
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('svg-loader__drop-zone--drag-over');
    
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('svg-loader__drop-zone--drag-over');
  });

  it('ドロップ時にファイルが処理される', async () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    const file = createMockFile('test.svg', 'image/svg+xml', validSVGContent);
    const dropZone = screen.getByText('SVG会場図を読み込み').closest('div')!;
    
    // FileReaderのモック
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file]
      }
    });
    
    // FileReaderのonloadを手動で実行
    mockFileReader.onload({ target: { result: validSVGContent } } as any);
    
    await waitFor(() => {
      expect(mockOnSVGLoad).toHaveBeenCalled();
    });
  });

  it('読み込み中にローディング状態が表示される', async () => {
    render(<SVGLoader onSVGLoad={mockOnSVGLoad} onError={mockOnError} />);
    
    const file = createMockFile('test.svg', 'image/svg+xml', validSVGContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    // FileReaderのモック（onloadを遅延実行）
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: validSVGContent
    };
    
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // ローディング状態を確認
    expect(screen.getByText('SVGファイルを読み込み中...')).toBeInTheDocument();
    
    // FileReaderのonloadを実行してローディング終了
    mockFileReader.onload({ target: { result: validSVGContent } } as any);
    
    await waitFor(() => {
      expect(screen.queryByText('SVGファイルを読み込み中...')).not.toBeInTheDocument();
    });
  });
});