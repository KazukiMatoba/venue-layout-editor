import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorDisplay from './ErrorDisplay';

describe('ErrorDisplay', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('エラーメッセージが表示される', () => {
    const errorMessage = 'テストエラーメッセージ';
    
    render(
      <ErrorDisplay 
        message={errorMessage} 
        onDismiss={mockOnDismiss} 
      />
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('閉じるボタンをクリックするとonDismissが呼ばれる', () => {
    render(
      <ErrorDisplay 
        message="エラーメッセージ" 
        onDismiss={mockOnDismiss} 
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: /閉じる|×/ });
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('エラータイプに応じて適切なスタイルが適用される', () => {
    const { rerender } = render(
      <ErrorDisplay 
        message="エラーメッセージ" 
        type="error"
        onDismiss={mockOnDismiss} 
      />
    );
    
    let errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveClass('error-display--error');
    
    rerender(
      <ErrorDisplay 
        message="警告メッセージ" 
        type="warning"
        onDismiss={mockOnDismiss} 
      />
    );
    
    errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveClass('error-display--warning');
    
    rerender(
      <ErrorDisplay 
        message="情報メッセージ" 
        type="info"
        onDismiss={mockOnDismiss} 
      />
    );
    
    errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveClass('error-display--info');
  });

  it('デフォルトでerrorタイプが適用される', () => {
    render(
      <ErrorDisplay 
        message="デフォルトエラー" 
        onDismiss={mockOnDismiss} 
      />
    );
    
    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveClass('error-display--error');
  });

  it('自動消去が有効な場合に指定時間後にonDismissが呼ばれる', async () => {
    vi.useFakeTimers();
    
    render(
      <ErrorDisplay 
        message="自動消去エラー" 
        onDismiss={mockOnDismiss}
        autoDismiss={true}
        autoDismissDelay={3000}
      />
    );
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // 3秒経過
    vi.advanceTimersByTime(3000);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });

  it('自動消去のデフォルト時間は5秒', async () => {
    vi.useFakeTimers();
    
    render(
      <ErrorDisplay 
        message="デフォルト自動消去" 
        onDismiss={mockOnDismiss}
        autoDismiss={true}
      />
    );
    
    // 4秒経過（まだ消えない）
    vi.advanceTimersByTime(4000);
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // 5秒経過（消える）
    vi.advanceTimersByTime(1000);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });

  it('コンポーネントがアンマウントされるとタイマーがクリアされる', () => {
    vi.useFakeTimers();
    
    const { unmount } = render(
      <ErrorDisplay 
        message="アンマウントテスト" 
        onDismiss={mockOnDismiss}
        autoDismiss={true}
        autoDismissDelay={3000}
      />
    );
    
    // 1秒後にアンマウント
    vi.advanceTimersByTime(1000);
    unmount();
    
    // さらに3秒経過（合計4秒）
    vi.advanceTimersByTime(3000);
    
    // onDismissは呼ばれない（タイマーがクリアされている）
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('詳細情報が提供された場合に展開可能', () => {
    const details = 'エラーの詳細情報\nスタックトレース等';
    
    render(
      <ErrorDisplay 
        message="詳細付きエラー" 
        details={details}
        onDismiss={mockOnDismiss} 
      />
    );
    
    // 詳細表示ボタンがある
    const detailsButton = screen.getByText('詳細を表示');
    expect(detailsButton).toBeInTheDocument();
    
    // 初期状態では詳細は非表示
    expect(screen.queryByText(details)).not.toBeInTheDocument();
    
    // 詳細表示ボタンをクリック
    fireEvent.click(detailsButton);
    
    // 詳細が表示される
    expect(screen.getByText(details)).toBeInTheDocument();
    expect(screen.getByText('詳細を隠す')).toBeInTheDocument();
    
    // もう一度クリックすると隠れる
    fireEvent.click(screen.getByText('詳細を隠す'));
    expect(screen.queryByText(details)).not.toBeInTheDocument();
  });

  it('アクションボタンが提供された場合に表示される', () => {
    const mockAction = vi.fn();
    
    render(
      <ErrorDisplay 
        message="アクション付きエラー" 
        onDismiss={mockOnDismiss}
        actionLabel="再試行"
        onAction={mockAction}
      />
    );
    
    const actionButton = screen.getByText('再試行');
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('複数のエラーが同時に表示される場合の処理', () => {
    const { rerender } = render(
      <ErrorDisplay 
        message="最初のエラー" 
        onDismiss={mockOnDismiss} 
      />
    );
    
    expect(screen.getByText('最初のエラー')).toBeInTheDocument();
    
    // 新しいエラーで再レンダリング
    rerender(
      <ErrorDisplay 
        message="2番目のエラー" 
        onDismiss={mockOnDismiss} 
      />
    );
    
    expect(screen.getByText('2番目のエラー')).toBeInTheDocument();
    expect(screen.queryByText('最初のエラー')).not.toBeInTheDocument();
  });

  it('長いエラーメッセージが適切に表示される', () => {
    const longMessage = 'これは非常に長いエラーメッセージです。'.repeat(10);
    
    render(
      <ErrorDisplay 
        message={longMessage} 
        onDismiss={mockOnDismiss} 
      />
    );
    
    const errorElement = screen.getByText(longMessage);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('error-display__message');
  });

  it('HTMLエスケープが適切に処理される', () => {
    const messageWithHTML = '<script>alert("XSS")</script>安全なメッセージ';
    
    render(
      <ErrorDisplay 
        message={messageWithHTML} 
        onDismiss={mockOnDismiss} 
      />
    );
    
    // HTMLタグがエスケープされて表示される
    expect(screen.getByText(messageWithHTML)).toBeInTheDocument();
    
    // scriptタグは実行されない
    expect(document.querySelector('script')).toBeNull();
  });

  it('アクセシビリティ属性が適切に設定される', () => {
    render(
      <ErrorDisplay 
        message="アクセシビリティテスト" 
        onDismiss={mockOnDismiss} 
      />
    );
    
    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('aria-live', 'assertive');
    
    const dismissButton = screen.getByRole('button');
    expect(dismissButton).toHaveAttribute('aria-label');
  });

  it('キーボードナビゲーションが動作する', () => {
    render(
      <ErrorDisplay 
        message="キーボードテスト" 
        onDismiss={mockOnDismiss}
        actionLabel="アクション"
        onAction={vi.fn()}
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: /閉じる|×/ });
    const actionButton = screen.getByText('アクション');
    
    // Tabキーでフォーカス移動
    dismissButton.focus();
    expect(document.activeElement).toBe(dismissButton);
    
    fireEvent.keyDown(dismissButton, { key: 'Tab' });
    // 実際のフォーカス移動はブラウザが処理するため、ここでは要素の存在のみ確認
    expect(actionButton).toBeInTheDocument();
    
    // Enterキーで実行
    fireEvent.keyDown(dismissButton, { key: 'Enter' });
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('エラーアイコンが表示される', () => {
    render(
      <ErrorDisplay 
        message="アイコンテスト" 
        type="error"
        onDismiss={mockOnDismiss} 
      />
    );
    
    const icon = screen.getByTestId('error-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('error-display__icon--error');
  });

  it('警告アイコンが表示される', () => {
    render(
      <ErrorDisplay 
        message="警告テスト" 
        type="warning"
        onDismiss={mockOnDismiss} 
      />
    );
    
    const icon = screen.getByTestId('warning-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('error-display__icon--warning');
  });

  it('情報アイコンが表示される', () => {
    render(
      <ErrorDisplay 
        message="情報テスト" 
        type="info"
        onDismiss={mockOnDismiss} 
      />
    );
    
    const icon = screen.getByTestId('info-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('error-display__icon--info');
  });
});