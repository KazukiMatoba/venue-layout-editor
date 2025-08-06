/**
 * テスト環境のセットアップファイル
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Konvaのcanvasモジュール問題を解決するためのモック
vi.mock('canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Array(4) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      isPointInPath: vi.fn(() => false),
    })),
    toBuffer: vi.fn(),
    toDataURL: vi.fn(),
  })),
  loadImage: vi.fn(),
}));

// Konvaのテスト環境での問題を解決
vi.mock('konva/lib/index-node', () => ({}));

// HTMLCanvasElementのモック
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    isPointInPath: vi.fn(() => false),
  }))
});

// ブラウザAPIのモック設定
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    readAsText: vi.fn(),
    onload: null,
    onerror: null,
    result: null
  }))
});

Object.defineProperty(window, 'DOMParser', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    parseFromString: vi.fn().mockReturnValue({
      querySelector: vi.fn().mockReturnValue({
        getAttribute: vi.fn(),
        hasAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        getBBox: vi.fn().mockReturnValue({
          x: 0,
          y: 0,
          width: 100,
          height: 100
        })
      })
    })
  }))
});

Object.defineProperty(window, 'XMLSerializer', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    serializeToString: vi.fn().mockReturnValue('<svg></svg>')
  }))
});

Object.defineProperty(window, 'Image', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    onload: null,
    onerror: null,
    src: ''
  }))
});

Object.defineProperty(window, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

Object.defineProperty(window, 'Blob', {
  writable: true,
  value: vi.fn().mockImplementation((content, options) => ({
    size: content[0]?.length || 0,
    type: options?.type || ''
  }))
});

// HTMLElementのgetBoundingClientRectをモック
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  writable: true,
  value: vi.fn().mockReturnValue({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0
  })
});