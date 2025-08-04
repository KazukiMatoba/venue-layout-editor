/**
 * テスト実行とレポート生成のためのユーティリティ
 */

import { describe, it, expect } from 'vitest';

// テストスイートの分類
export const TEST_CATEGORIES = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  E2E: 'e2e'
} as const;

// テスト結果の型定義
export interface TestResult {
  category: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

// テストレポートの型定義
export interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  categories: {
    [key: string]: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  };
  results: TestResult[];
}

// テスト実行時間の測定
export const measureTestTime = <T>(testFn: () => T): { result: T; duration: number } => {
  const startTime = performance.now();
  const result = testFn();
  const endTime = performance.now();
  
  return {
    result,
    duration: endTime - startTime
  };
};

// テストレポートの生成
export const generateTestReport = (results: TestResult[]): TestReport => {
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration: results.reduce((sum, r) => sum + r.duration, 0)
  };

  const categories: { [key: string]: any } = {};
  
  Object.values(TEST_CATEGORIES).forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    categories[category] = {
      total: categoryResults.length,
      passed: categoryResults.filter(r => r.status === 'passed').length,
      failed: categoryResults.filter(r => r.status === 'failed').length,
      skipped: categoryResults.filter(r => r.status === 'skipped').length,
    };
  });

  return {
    summary,
    categories,
    results
  };
};

// テストレポートの表示
export const displayTestReport = (report: TestReport): void => {
  console.log('\n=== テスト実行結果 ===');
  console.log(`総テスト数: ${report.summary.total}`);
  console.log(`成功: ${report.summary.passed}`);
  console.log(`失敗: ${report.summary.failed}`);
  console.log(`スキップ: ${report.summary.skipped}`);
  console.log(`実行時間: ${(report.summary.duration / 1000).toFixed(2)}秒`);
  
  console.log('\n=== カテゴリ別結果 ===');
  Object.entries(report.categories).forEach(([category, stats]) => {
    if (stats.total > 0) {
      console.log(`${category.toUpperCase()}: ${stats.passed}/${stats.total} 成功`);
    }
  });

  if (report.summary.failed > 0) {
    console.log('\n=== 失敗したテスト ===');
    report.results
      .filter(r => r.status === 'failed')
      .forEach(result => {
        console.log(`❌ ${result.category}/${result.name}: ${result.error}`);
      });
  }
};

// パフォーマンステストのベンチマーク
export const benchmarkTest = (name: string, testFn: () => void, iterations: number = 100): void => {
  describe(`Performance: ${name}`, () => {
    it(`should complete ${iterations} iterations within reasonable time`, () => {
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const { duration } = measureTestTime(testFn);
        times.push(duration);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`\nパフォーマンス結果 - ${name}:`);
      console.log(`平均実行時間: ${avgTime.toFixed(2)}ms`);
      console.log(`最大実行時間: ${maxTime.toFixed(2)}ms`);
      console.log(`最小実行時間: ${minTime.toFixed(2)}ms`);
      
      // パフォーマンス基準（平均100ms以内）
      expect(avgTime).toBeLessThan(100);
      
      // 一貫性の確認（最大時間が平均の3倍以内）
      expect(maxTime).toBeLessThan(avgTime * 3);
    });
  });
};

// メモリ使用量の測定（ブラウザ環境での概算）
export const measureMemoryUsage = (): number => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0; // メモリ情報が利用できない場合
};

// テストデータの生成ヘルパー
export const generateTestData = {
  // ランダムなテーブルデータ生成
  randomTable: (type: 'rectangle' | 'circle' = 'rectangle') => ({
    id: `test-table-${Math.random().toString(36).substr(2, 9)}`,
    type,
    position: {
      x: Math.floor(Math.random() * 800) + 100,
      y: Math.floor(Math.random() * 600) + 100
    },
    properties: type === 'rectangle' 
      ? {
          width: Math.floor(Math.random() * 200) + 50,
          height: Math.floor(Math.random() * 150) + 40
        }
      : {
          radius: Math.floor(Math.random() * 100) + 30
        },
    style: {
      fill: '#e3f2fd',
      stroke: '#1976d2',
      strokeWidth: 2,
      opacity: 0.8
    }
  }),

  // 複数のテーブルデータ生成
  multipleTable: (count: number) => {
    return Array.from({ length: count }, (_, i) => 
      generateTestData.randomTable(i % 2 === 0 ? 'rectangle' : 'circle')
    );
  },

  // テスト用SVGデータ生成
  testSVG: (width: number = 800, height: number = 600) => ({
    content: `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="white" stroke="black" stroke-width="2"/>
    </svg>`,
    width,
    height,
    viewBox: { x: 0, y: 0, width, height },
    bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
  })
};

// テストの前処理・後処理ヘルパー
export const testHelpers = {
  // DOM要素のクリーンアップ
  cleanupDOM: () => {
    document.body.innerHTML = '';
  },

  // モックのリセット
  resetMocks: () => {
    // グローバルモックのリセット処理
    if (global.FileReader) {
      (global.FileReader as any).mockClear?.();
    }
    if (global.DOMParser) {
      (global.DOMParser as any).mockClear?.();
    }
  },

  // テスト環境の初期化
  setupTestEnvironment: () => {
    testHelpers.cleanupDOM();
    testHelpers.resetMocks();
  },

  // テスト環境のクリーンアップ
  teardownTestEnvironment: () => {
    testHelpers.cleanupDOM();
  }
};

// カスタムマッチャーの定義
export const customMatchers = {
  // 位置の近似比較
  toBeNearPosition: (received: { x: number; y: number }, expected: { x: number; y: number }, tolerance: number = 5) => {
    const deltaX = Math.abs(received.x - expected.x);
    const deltaY = Math.abs(received.y - expected.y);
    
    return {
      pass: deltaX <= tolerance && deltaY <= tolerance,
      message: () => `Expected position (${received.x}, ${received.y}) to be near (${expected.x}, ${expected.y}) within ${tolerance}px`
    };
  },

  // 境界内の確認
  toBeWithinBounds: (received: { x: number; y: number }, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const withinBounds = received.x >= bounds.minX && 
                        received.x <= bounds.maxX && 
                        received.y >= bounds.minY && 
                        received.y <= bounds.maxY;
    
    return {
      pass: withinBounds,
      message: () => `Expected position (${received.x}, ${received.y}) to be within bounds (${bounds.minX}, ${bounds.minY}) to (${bounds.maxX}, ${bounds.maxY})`
    };
  }
};

// テスト実行の統計情報
export class TestStatistics {
  private startTime: number = 0;
  private testCounts: { [category: string]: number } = {};
  private memoryUsage: number[] = [];

  start() {
    this.startTime = performance.now();
    this.memoryUsage.push(measureMemoryUsage());
  }

  recordTest(category: string) {
    this.testCounts[category] = (this.testCounts[category] || 0) + 1;
    this.memoryUsage.push(measureMemoryUsage());
  }

  finish() {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;
    
    console.log('\n=== テスト統計情報 ===');
    console.log(`総実行時間: ${(totalDuration / 1000).toFixed(2)}秒`);
    
    Object.entries(this.testCounts).forEach(([category, count]) => {
      console.log(`${category}: ${count}テスト`);
    });
    
    if (this.memoryUsage.length > 1) {
      const memoryDelta = this.memoryUsage[this.memoryUsage.length - 1] - this.memoryUsage[0];
      console.log(`メモリ使用量変化: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
  }
}

export default {
  TEST_CATEGORIES,
  measureTestTime,
  generateTestReport,
  displayTestReport,
  benchmarkTest,
  measureMemoryUsage,
  generateTestData,
  testHelpers,
  customMatchers,
  TestStatistics
};