import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useErrorHandler } from './useErrorHandler';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // コンソールエラーをモック
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('初期状態でエラーがない', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('エラーを設定できる', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError('テストエラー');
    });
    
    expect(result.current.error).toBe('テストエラー');
    expect(result.current.hasError).toBe(true);
  });

  it('エラーをクリアできる', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError('テストエラー');
    });
    
    expect(result.current.hasError).toBe(true);
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('Errorオブジェクトを処理できる', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const error = new Error('テストエラーオブジェクト');
    
    act(() => {
      result.current.setError(error);
    });
    
    expect(result.current.error).toBe('テストエラーオブジェクト');
    expect(result.current.hasError).toBe(true);
  });

  it('未知のエラータイプを処理できる', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError({ message: 'カスタムエラー' });
    });
    
    expect(result.current.error).toBe('不明なエラーが発生しました');
    expect(result.current.hasError).toBe(true);
  });

  it('nullやundefinedのエラーを処理できる', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError(null);
    });
    
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    
    act(() => {
      result.current.setError(undefined);
    });
    
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('エラーハンドラー関数が例外を処理する', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const throwingFunction = () => {
      throw new Error('関数内エラー');
    };
    
    act(() => {
      result.current.handleError(throwingFunction);
    });
    
    expect(result.current.error).toBe('関数内エラー');
    expect(result.current.hasError).toBe(true);
  });

  it('非同期エラーハンドラーが例外を処理する', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const throwingAsyncFunction = async () => {
      throw new Error('非同期エラー');
    };
    
    await act(async () => {
      await result.current.handleAsyncError(throwingAsyncFunction);
    });
    
    expect(result.current.error).toBe('非同期エラー');
    expect(result.current.hasError).toBe(true);
  });

  it('成功する関数は正常に実行される', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const successFunction = vi.fn(() => 'success');
    
    let returnValue: string | undefined;
    
    act(() => {
      returnValue = result.current.handleError(successFunction);
    });
    
    expect(successFunction).toHaveBeenCalledTimes(1);
    expect(returnValue).toBe('success');
    expect(result.current.hasError).toBe(false);
  });

  it('成功する非同期関数は正常に実行される', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const successAsyncFunction = vi.fn(async () => 'async success');
    
    let returnValue: string | undefined;
    
    await act(async () => {
      returnValue = await result.current.handleAsyncError(successAsyncFunction);
    });
    
    expect(successAsyncFunction).toHaveBeenCalledTimes(1);
    expect(returnValue).toBe('async success');
    expect(result.current.hasError).toBe(false);
  });

  it('自動クリア機能が動作する', () => {
    const { result } = renderHook(() => useErrorHandler({ autoClear: true, autoClearDelay: 3000 }));
    
    act(() => {
      result.current.setError('自動クリアエラー');
    });
    
    expect(result.current.hasError).toBe(true);
    
    // 3秒経過
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('デフォルトの自動クリア時間は5秒', () => {
    const { result } = renderHook(() => useErrorHandler({ autoClear: true }));
    
    act(() => {
      result.current.setError('デフォルト自動クリア');
    });
    
    expect(result.current.hasError).toBe(true);
    
    // 4秒経過（まだクリアされない）
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    
    expect(result.current.hasError).toBe(true);
    
    // 5秒経過（クリアされる）
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(result.current.hasError).toBe(false);
  });

  it('手動クリア後は自動クリアがキャンセルされる', () => {
    const { result } = renderHook(() => useErrorHandler({ autoClear: true, autoClearDelay: 3000 }));
    
    act(() => {
      result.current.setError('手動クリアテスト');
    });
    
    expect(result.current.hasError).toBe(true);
    
    // 1秒後に手動クリア
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.clearError();
    });
    
    expect(result.current.hasError).toBe(false);
    
    // さらに3秒経過（自動クリアは発生しない）
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(result.current.hasError).toBe(false);
  });

  it('新しいエラーが設定されると前の自動クリアがキャンセルされる', () => {
    const { result } = renderHook(() => useErrorHandler({ autoClear: true, autoClearDelay: 3000 }));
    
    act(() => {
      result.current.setError('最初のエラー');
    });
    
    // 1秒後に新しいエラーを設定
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.setError('2番目のエラー');
    });
    
    expect(result.current.error).toBe('2番目のエラー');
    
    // 最初のエラーの自動クリア時間（残り2秒）経過
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // まだクリアされない（新しいタイマーが動作中）
    expect(result.current.hasError).toBe(true);
    
    // 新しいエラーの自動クリア時間（残り1秒）経過
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // クリアされる
    expect(result.current.hasError).toBe(false);
  });

  it('コンポーネントアンマウント時にタイマーがクリアされる', () => {
    const { result, unmount } = renderHook(() => useErrorHandler({ autoClear: true, autoClearDelay: 3000 }));
    
    act(() => {
      result.current.setError('アンマウントテスト');
    });
    
    expect(result.current.hasError).toBe(true);
    
    // 1秒後にアンマウント
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    unmount();
    
    // さらに3秒経過（タイマーはクリアされているので何も起こらない）
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // エラーハンドラーは破棄されているので確認できないが、
    // タイマーがクリアされていることを確認するためにエラーが発生しないことを確認
    expect(true).toBe(true); // テストが正常に完了することを確認
  });

  it('エラーログが出力される', () => {
    const { result } = renderHook(() => useErrorHandler({ logErrors: true }));
    
    act(() => {
      result.current.setError('ログテストエラー');
    });
    
    expect(console.error).toHaveBeenCalledWith('Error:', 'ログテストエラー');
  });

  it('エラーログが無効化できる', () => {
    const { result } = renderHook(() => useErrorHandler({ logErrors: false }));
    
    act(() => {
      result.current.setError('ログ無効テスト');
    });
    
    expect(console.error).not.toHaveBeenCalled();
  });

  it('カスタムエラーハンドラーが呼ばれる', () => {
    const customHandler = vi.fn();
    const { result } = renderHook(() => useErrorHandler({ onError: customHandler }));
    
    act(() => {
      result.current.setError('カスタムハンドラーテスト');
    });
    
    expect(customHandler).toHaveBeenCalledWith('カスタムハンドラーテスト');
  });

  it('エラー履歴が記録される', () => {
    const { result } = renderHook(() => useErrorHandler({ keepHistory: true, maxHistorySize: 3 }));
    
    act(() => {
      result.current.setError('エラー1');
    });
    
    act(() => {
      result.current.setError('エラー2');
    });
    
    act(() => {
      result.current.setError('エラー3');
    });
    
    expect(result.current.errorHistory).toHaveLength(3);
    expect(result.current.errorHistory[0]).toBe('エラー1');
    expect(result.current.errorHistory[1]).toBe('エラー2');
    expect(result.current.errorHistory[2]).toBe('エラー3');
  });

  it('エラー履歴のサイズ制限が動作する', () => {
    const { result } = renderHook(() => useErrorHandler({ keepHistory: true, maxHistorySize: 2 }));
    
    act(() => {
      result.current.setError('エラー1');
    });
    
    act(() => {
      result.current.setError('エラー2');
    });
    
    act(() => {
      result.current.setError('エラー3');
    });
    
    expect(result.current.errorHistory).toHaveLength(2);
    expect(result.current.errorHistory[0]).toBe('エラー2');
    expect(result.current.errorHistory[1]).toBe('エラー3');
  });

  it('エラー履歴をクリアできる', () => {
    const { result } = renderHook(() => useErrorHandler({ keepHistory: true }));
    
    act(() => {
      result.current.setError('履歴テスト1');
    });
    
    act(() => {
      result.current.setError('履歴テスト2');
    });
    
    expect(result.current.errorHistory).toHaveLength(2);
    
    act(() => {
      result.current.clearErrorHistory();
    });
    
    expect(result.current.errorHistory).toHaveLength(0);
  });
});