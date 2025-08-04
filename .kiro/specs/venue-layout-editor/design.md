# 設計ドキュメント

## 概要

会場レイアウトエディターは、React KonvaライブラリをベースとしたWebアプリケーションです。SVG会場図の読み込み、テーブルオブジェクトの作成・配置・移動機能を提供し、1px=1mmの精密なスケーリングと境界制約を実装します。

## アーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────┐
│           React Application             │
├─────────────────────────────────────────┤
│  VenueLayoutEditor (Main Component)     │
├─────────────────────────────────────────┤
│  ├─ SVGLoader                          │
│  ├─ TableToolbar                       │
│  ├─ VenueCanvas (Konva Stage)          │
│  │   ├─ BackgroundLayer (SVG)          │
│  │   └─ TableLayer                     │
│  │       ├─ RectangleTable             │
│  │       └─ CircleTable                │
│  └─ MeasurementDisplay                 │
├─────────────────────────────────────────┤
│           State Management              │
│  ├─ Venue State (SVG data, bounds)     │
│  ├─ Table State (positions, props)     │
│  └─ UI State (selected, dragging)      │
├─────────────────────────────────────────┤
│              Utilities                  │
│  ├─ SVG Parser                         │
│  ├─ Boundary Checker                   │
│  ├─ Scale Converter (px ↔ mm)          │
│  └─ Collision Detection                 │
└─────────────────────────────────────────┘
```

### 技術スタック

- **フロントエンド**: React 18+
- **キャンバスライブラリ**: React Konva 18+
- **状態管理**: React useState/useReducer
- **SVG処理**: DOMParser + SVG要素操作
- **スタイリング**: CSS Modules または Styled Components
- **型定義**: TypeScript

## コンポーネントとインターフェース

### 主要コンポーネント

#### VenueLayoutEditor
メインコンポーネント。全体の状態管理と子コンポーネントの統合を担当。

```typescript
interface VenueLayoutEditorProps {
  initialVenue?: VenueData;
  onSave?: (venueData: VenueData) => void;
  onExport?: (format: 'json' | 'svg') => void;
}
```

#### SVGLoader
SVGファイルの読み込みと解析を担当。

```typescript
interface SVGLoaderProps {
  onSVGLoad: (svgData: SVGData) => void;
  onError: (error: string) => void;
}
```

#### VenueCanvas
React Konva Stageのラッパー。キャンバスの描画とイベント処理を管理。

```typescript
interface VenueCanvasProps {
  svgData: SVGData | null;
  tables: TableObject[];
  selectedTableId: string | null;
  onTableSelect: (id: string | null) => void;
  onTableMove: (id: string, position: Position) => void;
  onTableAdd: (table: TableObject) => void;
}
```

#### TableToolbar
テーブル作成とプロパティ編集のUI。

```typescript
interface TableToolbarProps {
  onCreateTable: (type: 'rectangle' | 'circle', props: TableProps) => void;
  selectedTable: TableObject | null;
  onUpdateTable: (id: string, props: Partial<TableProps>) => void;
}
```

### コアインターフェース

#### SVGData
```typescript
interface SVGData {
  content: string;           // SVG文字列
  width: number;            // SVG幅（px）
  height: number;           // SVG高さ（px）
  viewBox: ViewBox;         // SVGビューボックス
  bounds: BoundingBox;      // 境界情報
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

#### TableObject
```typescript
interface TableObject {
  id: string;
  type: 'rectangle' | 'circle';
  position: Position;
  properties: RectangleProps | CircleProps;
  style: TableStyle;
}

interface Position {
  x: number;  // ピクセル単位
  y: number;  // ピクセル単位
}

interface RectangleProps {
  width: number;   // mm単位
  height: number;  // mm単位
}

interface CircleProps {
  radius: number;  // mm単位
}

interface TableStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}
```

## データモデル

### 状態構造

```typescript
interface VenueState {
  svgData: SVGData | null;
  tables: TableObject[];
  selectedTableId: string | null;
  dragState: DragState | null;
  scale: number;  // ズームレベル
  offset: Position;  // パン位置
}

interface DragState {
  tableId: string;
  startPosition: Position;
  currentPosition: Position;
  isValid: boolean;  // 境界内かどうか
}
```

### スケール変換

1px = 1mmの関係を維持するため、以下の変換関数を実装：

```typescript
// mm → px変換
const mmToPx = (mm: number): number => mm;

// px → mm変換  
const pxToMm = (px: number): number => px;

// 表示用のスケール変換（ズーム考慮）
const getDisplayScale = (zoomLevel: number): number => zoomLevel;
```

## エラーハンドリング

### SVG読み込みエラー
- ファイル形式チェック
- SVG構文検証
- サイズ制限チェック
- ユーザーフレンドリーなエラーメッセージ

### 境界制約エラー
- リアルタイム境界チェック
- 無効な配置の視覚的フィードバック
- 自動位置補正

### パフォーマンスエラー
- 大きなSVGファイルの処理制限
- テーブル数の上限設定
- メモリ使用量の監視

## テスト戦略

### 単体テスト
- ユーティリティ関数（スケール変換、境界チェック）
- コンポーネントの個別機能
- 状態管理ロジック

### 統合テスト
- SVG読み込みフロー
- テーブル作成・移動フロー
- 境界制約の動作

### E2Eテスト
- 完全なユーザーワークフロー
- ブラウザ互換性
- パフォーマンステスト

### テストデータ
- 様々なサイズ・複雑さのSVGファイル
- 境界ケースのテーブル配置
- 異常なユーザー操作パターン

## パフォーマンス最適化

### レンダリング最適化
- React.memoによるコンポーネント最適化
- Konvaレイヤーの効率的な更新
- 不要な再描画の防止

### メモリ管理
- SVGデータの効率的な保存
- 未使用テーブルオブジェクトのクリーンアップ
- イベントリスナーの適切な削除

### ユーザビリティ
- ドラッグ操作の滑らかな応答
- リアルタイムフィードバック
- 直感的なUI操作