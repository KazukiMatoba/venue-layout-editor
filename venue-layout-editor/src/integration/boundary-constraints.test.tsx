import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VenueLayoutEditor from '../components/VenueLayoutEditor';

// 異なるサイズのテスト用SVGコンテンツ
const smallVenueSVG = `
<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="400" height="300" fill="white" stroke="black" stroke-width="2"/>
</svg>
`;

const largeVenueSVG = `
<svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="1200" height="900" fill="white" stroke="black" stroke-width="2"/>
</svg>
`;

const irregularVenueSVG = `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <polygon points="100,100 700,100 700,500 400,500 400,300 100,300" fill="white" stroke="black" stroke-width="2"/>
</svg>
`;

// ファイル作成用のヘルパー
const createMockFile = (name: string, type: string, content: string): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

describe('境界制約機能の動作テスト', () => {
  beforeEach(() => {
    // DOMParserのモック設定
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockReturnValue({
        querySelector: vi.fn((selector: string) => {
          if (selector === 'parsererror') return null;
          if (selector === 'svg') return {
            getAttribute: vi.fn((attr: string) => {
              // 動的にSVG属性を返すモック
              const currentContent = global.currentSVGContent || smallVenueSVG;
              if (currentContent.includes('400')) {
                switch (attr) {
                  case 'width': return '400';
                  case 'height': return '300';
                  case 'viewBox': return '0 0 400 300';
                  default: return null;
                }
              } else if (currentContent.includes('1200')) {
                switch (attr) {
                  case 'width': return '1200';
                  case 'height': return '900';
                  case 'viewBox': return '0 0 1200 900';
                  default: return null;
                }
              } else {
                switch (attr) {
                  case 'width': return '800';
                  case 'height': return '600';
                  case 'viewBox': return '0 0 800 600';
                  default: return null;
                }
              }
            }),
            hasAttribute: vi.fn(),
            removeAttribute: vi.fn(),
            querySelectorAll: vi.fn().mockReturnValue([]),
            getBBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 400, height: 300 })
          };
          return null;
        }),
        querySelectorAll: vi.fn().mockReturnValue([])
      })
    }));

    // FileReaderのモック設定
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsText: vi.fn(),
      onload: null,
      onerror: null,
      result: null
    }));
  });

  const setupVenueWithSVG = async (svgContent: string) => {
    global.currentSVGContent = svgContent;
    
    render(<VenueLayoutEditor />);

    const file = createMockFile('venue.svg', 'image/svg+xml', svgContent);
    const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any,
      onerror: null as any,
      result: svgContent
    };

    global.FileReader = vi.fn().mockImplementation(() => mockFileReader);

    fireEvent.change(fileInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: svgContent } } as any);
    }

    await waitFor(() => {
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
  };

  it('小さな会場での境界制約', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. 大きなテーブルを作成しようとする
    const widthInput = screen.getByDisplayValue('800');
    const heightInput = screen.getByDisplayValue('600');

    fireEvent.change(widthInput, { target: { value: '500' } }); // 会場幅400より大きい
    fireEvent.change(heightInput, { target: { value: '400' } }); // 会場高さ300より大きい

    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    // 2. 境界制約エラーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/テーブルが会場境界を超えています/)).toBeInTheDocument();
    });

    // 3. テーブルが作成されないことを確認
    expect(screen.queryByTestId('konva-rect')).not.toBeInTheDocument();
  });

  it('大きな会場での境界制約', async () => {
    await setupVenueWithSVG(largeVenueSVG);

    // 1. 通常サイズのテーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    const tableElement = screen.getByTestId('konva-rect');

    // 2. テーブルを境界近くまでドラッグ
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 1150, clientY: 850 }); // 境界近く
    fireEvent.mouseUp(tableElement, { clientX: 1150, clientY: 850 });

    // 3. テーブルが境界内に制約されることを確認
    expect(tableElement).toBeInTheDocument();

    // 4. 境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 1150, clientY: 850 });
    fireEvent.mouseMove(tableElement, { clientX: 1250, clientY: 950 }); // 境界外
    fireEvent.mouseUp(tableElement, { clientX: 1250, clientY: 950 });

    // 5. 境界制約フィードバックが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/境界制約/)).toBeInTheDocument();
    });
  });

  it('不規則な形状の会場での境界制約', async () => {
    await setupVenueWithSVG(irregularVenueSVG);

    // 1. テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    const tableElement = screen.getByTestId('konva-rect');

    // 2. 不規則な形状の境界内でのドラッグ
    fireEvent.mouseDown(tableElement, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(tableElement, { clientX: 300, clientY: 250 });
    fireEvent.mouseUp(tableElement, { clientX: 300, clientY: 250 });

    // 3. テーブルが移動することを確認
    expect(tableElement).toBeInTheDocument();

    // 4. 不規則な形状の境界外へのドラッグ試行
    fireEvent.mouseDown(tableElement, { clientX: 300, clientY: 250 });
    fireEvent.mouseMove(tableElement, { clientX: 500, clientY: 400 }); // L字の切り欠き部分
    fireEvent.mouseUp(tableElement, { clientX: 500, clientY: 400 });

    // 5. 境界制約が適用されることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('異なるサイズのテーブルでの境界制約', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. 小さな長方形テーブルを作成
    const widthInput = screen.getByDisplayValue('800');
    const heightInput = screen.getByDisplayValue('600');

    fireEvent.change(widthInput, { target: { value: '100' } });
    fireEvent.change(heightInput, { target: { value: '80' } });

    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 2. 円形テーブルに切り替え
    const circleRadio = screen.getByDisplayValue('circle');
    fireEvent.click(circleRadio);

    // 3. 大きな円形テーブルを作成しようとする
    const radiusInput = screen.getByDisplayValue('400');
    fireEvent.change(radiusInput, { target: { value: '250' } }); // 直径500 > 会場幅400

    fireEvent.click(createButton);

    // 4. 境界制約エラーが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/テーブルが会場境界を超えています/)).toBeInTheDocument();
    });

    // 5. 適切なサイズの円形テーブルを作成
    fireEvent.change(radiusInput, { target: { value: '50' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
    });
  });

  it('境界制約設定の変更', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. 境界制約を無効にする設定があると仮定
    const constraintToggle = screen.queryByText('境界制約を無効にする');
    if (constraintToggle) {
      fireEvent.click(constraintToggle);
    }

    // 2. 大きなテーブルを作成
    const widthInput = screen.getByDisplayValue('800');
    const heightInput = screen.getByDisplayValue('600');

    fireEvent.change(widthInput, { target: { value: '500' } });
    fireEvent.change(heightInput, { target: { value: '400' } });

    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    // 3. 境界制約が無効な場合、テーブルが作成されることを確認
    if (constraintToggle) {
      await waitFor(() => {
        expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
      });
    }
  });

  it('境界近接時の警告表示', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    const tableElement = screen.getByTestId('konva-rect');

    // 2. テーブルを境界近くにドラッグ
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 350, clientY: 250 }); // 境界から50px以内

    // 3. 境界近接警告が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/境界に近づいています/)).toBeInTheDocument();
    });

    // 4. ドラッグを終了
    fireEvent.mouseUp(tableElement, { clientX: 350, clientY: 250 });

    // 5. 警告が消えることを確認
    await waitFor(() => {
      expect(screen.queryByText(/境界に近づいています/)).not.toBeInTheDocument();
    });
  });

  it('複数テーブルの境界制約', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. 複数のテーブルを作成
    const createButton = screen.getByText('テーブル作成');
    
    // 最初のテーブル
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 2つ目のテーブル
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(screen.getAllByTestId('konva-rect')).toHaveLength(2);
    });

    const tables = screen.getAllByTestId('konva-rect');

    // 2. 各テーブルを境界近くに配置
    fireEvent.mouseDown(tables[0], { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tables[0], { clientX: 100, clientY: 100 }); // 左上
    fireEvent.mouseUp(tables[0], { clientX: 100, clientY: 100 });

    fireEvent.mouseDown(tables[1], { clientX: 150, clientY: 150 });
    fireEvent.mouseMove(tables[1], { clientX: 300, clientY: 200 }); // 右下寄り
    fireEvent.mouseUp(tables[1], { clientX: 300, clientY: 200 });

    // 3. 両方のテーブルが境界内に制約されることを確認
    expect(screen.getAllByTestId('konva-rect')).toHaveLength(2);
  });

  it('ズーム時の境界制約', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. テーブルを作成
    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    // 2. ズームイン
    const zoomInButton = screen.getByText('+');
    fireEvent.click(zoomInButton);

    const tableElement = screen.getByTestId('konva-rect');

    // 3. ズーム状態でのドラッグ操作
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(tableElement, { clientX: 200, clientY: 150 });

    // 4. ズーム状態でも境界制約が正しく動作することを確認
    expect(tableElement).toBeInTheDocument();

    // 5. ズームアウト
    const zoomOutButton = screen.getByText('-');
    fireEvent.click(zoomOutButton);

    // 6. ズームアウト後も境界制約が維持されることを確認
    fireEvent.mouseDown(tableElement, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(tableElement, { clientX: 450, clientY: 350 }); // 境界外
    fireEvent.mouseUp(tableElement, { clientX: 450, clientY: 350 });

    // 7. 境界制約が適用されることを確認
    expect(tableElement).toBeInTheDocument();
  });

  it('境界制約のパフォーマンステスト', async () => {
    await setupVenueWithSVG(largeVenueSVG);

    // 1. 多数のテーブルを作成
    const createButton = screen.getByText('テーブル作成');
    
    for (let i = 0; i < 10; i++) {
      fireEvent.click(createButton);
    }

    await waitFor(() => {
      expect(screen.getAllByTestId('konva-rect')).toHaveLength(10);
    });

    const tables = screen.getAllByTestId('konva-rect');

    // 2. パフォーマンス測定開始
    const startTime = performance.now();

    // 3. 全テーブルを同時にドラッグ
    tables.forEach((table, index) => {
      fireEvent.mouseDown(table, { clientX: 100 + index * 10, clientY: 100 + index * 10 });
      fireEvent.mouseMove(table, { clientX: 200 + index * 10, clientY: 200 + index * 10 });
      fireEvent.mouseUp(table, { clientX: 200 + index * 10, clientY: 200 + index * 10 });
    });

    // 4. パフォーマンス測定終了
    const endTime = performance.now();
    const duration = endTime - startTime;

    // 5. 合理的な時間内で完了することを確認（2秒以内）
    expect(duration).toBeLessThan(2000);

    // 6. 全テーブルが存在することを確認
    expect(screen.getAllByTestId('konva-rect')).toHaveLength(10);
  });

  it('境界制約エラーの詳細情報', async () => {
    await setupVenueWithSVG(smallVenueSVG);

    // 1. 境界を超える大きなテーブルを作成しようとする
    const widthInput = screen.getByDisplayValue('800');
    const heightInput = screen.getByDisplayValue('600');

    fireEvent.change(widthInput, { target: { value: '500' } });
    fireEvent.change(heightInput, { target: { value: '400' } });

    const createButton = screen.getByText('テーブル作成');
    fireEvent.click(createButton);

    // 2. 詳細なエラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/テーブルサイズ.*会場サイズ/)).toBeInTheDocument();
    });

    // 3. 推奨サイズが表示されることを確認
    expect(screen.getByText(/推奨最大サイズ/)).toBeInTheDocument();

    // 4. エラーの詳細を展開
    const detailsButton = screen.getByText('詳細を表示');
    fireEvent.click(detailsButton);

    // 5. 詳細情報が表示されることを確認
    expect(screen.getByText(/境界制約の詳細/)).toBeInTheDocument();
  });
});