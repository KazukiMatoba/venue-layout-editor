import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import type { VenueCanvasProps } from '../types/components';
import type { Position, TableObject } from '../types';
import { useErrorHandler } from '../hooks/useErrorHandler';
import ErrorDisplay from './ErrorDisplay';
import { 
  getDisplayScale, 
  mmToPx, 
  clampScale, 
  zoomIn, 
  zoomOut,
  formatMeasurement,
  getScalePercentage
} from '../utils/scale';
import { 
  processDragOperation, 
  isIntentionalDrag, 
  generateDragLog,
  roundPositionToPrecision,
  calculateDragDistance
} from '../utils/dragUtils';
import {
  calculateTableBounds,
  checkBoundaryConstraints,
  constrainPositionToBounds,
  checkDragBoundaries,
  checkBoundaryProximity,
  enforceRealTimeBoundaryLimits,
  preventOutOfBoundsPlacement,
  getDragLimitDetails,
  performIntegratedBoundaryCheck,
  DEFAULT_BOUNDARY_CONSTRAINTS
} from '../utils/boundaryUtils';
import {
  createBoundaryConstraintFeedback,
  performSnapBack,
  createProximityWarning,
  createDragRestrictionFeedback,
  boundaryFeedbackManager,
  type VisualFeedback
} from '../utils/boundaryFeedback';
import {
  validateTablePosition,
  validateTableObject,
  validateTableOverlap,
  validateCoordinatePrecision,
  type ValidationResult
} from '../utils/validation';
import RectangleTable from './tables/RectangleTable';
import CircleTable from './tables/CircleTable';
import BoundaryFeedbackDisplay from './BoundaryFeedbackDisplay';
import styles from './VenueCanvas.module.css';

// キャンバスのデフォルトサイズ（1px=1mmスケール）
const DEFAULT_CANVAS_WIDTH = 800; // 800mm = 80cm
const DEFAULT_CANVAS_HEIGHT = 600; // 600mm = 60cm

// ズーム操作の倍率
const ZOOM_FACTOR = 1.2;

// キャンバスの最小サイズ
const MIN_CANVAS_WIDTH = 400;
const MIN_CANVAS_HEIGHT = 300;

/**
 * React Konva Stageのラッパーコンポーネント
 * キャンバスの描画とイベント処理を管理
 * 要件1.1, 1.2, 5.1, 3.1, 3.2, 3.3, 3.4に対応
 */
const VenueCanvas: React.FC<VenueCanvasProps> = ({
  svgData,
  tables,
  selectedTableId,
  onTableSelect,
  onTableMove,
  onTableAdd,
  scale,
  onScaleChange,
  placementMode: externalPlacementMode,
  onPlacementModeChange,
}) => {
  // エラーハンドリング（要件1.4, 6.4対応）
  const { 
    currentError, 
    handleTableOperationError, 
    handleBoundaryConstraintError,
    handleSystemError,
    handleValidationError,
    dismissError, 
    safeSync,
    safeAsync,
    hasRecentError
  } = useErrorHandler();

  // キャンバスの状態管理（要件5.1対応）
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
  });
  
  // テーブル配置機能の状態管理（要件3.1, 3.2対応）
  // 外部から制御される場合は外部の状態を使用、そうでなければ内部状態を使用
  const [internalPlacementMode, setInternalPlacementMode] = useState<{
    active: boolean;
    tableType: 'rectangle' | 'circle';
    tableProps: any;
  } | null>(null);
  
  const placementMode = externalPlacementMode !== undefined ? externalPlacementMode : internalPlacementMode;
  
  // ドラッグ状態の管理（要件4.1, 4.2対応）
  const [dragState, setDragState] = useState<{
    tableId: string;
    startPosition: Position;
    currentPosition: Position;
    isValid: boolean;
    isDragging: boolean;
  } | null>(null);
  
  // SVG背景画像の状態（要件1.1, 1.2対応）
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const stageRef = useRef<any>(null);

  // ビューポートサイズの監視（レスポンシブ対応）
  useEffect(() => {
    const updateViewportSize = () => {
      const containerWidth = Math.max(MIN_CANVAS_WIDTH, window.innerWidth - 100);
      const containerHeight = Math.max(MIN_CANVAS_HEIGHT, window.innerHeight - 200);
      
      setViewportSize({
        width: containerWidth,
        height: containerHeight,
      });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    
    return () => {
      window.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  // キーボードショートカットによるズーム操作（要件5.4対応）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            if (onScaleChange) {
              const newScale = zoomIn(scale, ZOOM_FACTOR);
              onScaleChange(newScale);
            }
            break;
          case '-':
            e.preventDefault();
            if (onScaleChange) {
              const newScale = zoomOut(scale, ZOOM_FACTOR);
              onScaleChange(newScale);
            }
            break;
          case '0':
            e.preventDefault();
            if (onScaleChange) {
              onScaleChange(1.0); // 100%にリセット
            }
            break;
          case 'f':
          case 'F':
            e.preventDefault();
            if (svgData && onScaleChange) {
              // フィットズーム機能は後で実装
              onScaleChange(1.0);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scale, svgData, onScaleChange]);

  // SVGデータが変更された時の処理（要件1.1, 1.2対応）
  useEffect(() => {
    setImageLoadError(null);
    setIsImageLoading(false);
    
    if (!svgData) {
      setBackgroundImage(null);
      return;
    }

    setIsImageLoading(true);

    // SVGをImageオブジェクトに変換
    const img = new Image();
    
    img.onload = () => {
      setBackgroundImage(img);
      setImageLoadError(null);
      setIsImageLoading(false);
      
      // 1px=1mmスケールでキャンバスサイズを設定（要件5.1対応）
      const svgWidthPx = mmToPx(svgData.width);
      const svgHeightPx = mmToPx(svgData.height);
      
      // 初期スケールを計算（SVGが表示領域より大きい場合は縮小）
      // ビューポートサイズを使用してより正確な初期スケールを計算
      const scaleX = viewportSize.width / svgWidthPx;
      const scaleY = viewportSize.height / svgHeightPx;
      const initialScale = Math.min(1, Math.min(scaleX, scaleY));
      
      // スケールを制限内にクランプ
      const clampedInitialScale = clampScale(initialScale);
      if (onScaleChange) {
        onScaleChange(clampedInitialScale);
      }
      
      // 初期位置を中央に設定
      const centerX = (viewportSize.width - svgWidthPx * clampedInitialScale) / 2;
      const centerY = (viewportSize.height - svgHeightPx * clampedInitialScale) / 2;
      setStagePos({ 
        x: Math.max(0, centerX), 
        y: Math.max(0, centerY) 
      });
    };
    
    img.onerror = (error) => {
      console.error('SVG画像の読み込みに失敗しました:', error);
      const errorMessage = 'SVG画像の読み込みに失敗しました。ファイル形式を確認してください。';
      setImageLoadError(errorMessage);
      setBackgroundImage(null);
      setIsImageLoading(false);
    };

    try {
      // SVGをData URLに変換（要件1.1対応）
      const svgBlob = new Blob([svgData.content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;

      // クリーンアップ関数でURLを解放
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('SVGデータの処理中にエラーが発生しました:', error);
      setImageLoadError('SVGデータの処理中にエラーが発生しました。');
      setIsImageLoading(false);
    }
  }, [svgData, viewportSize]);

  // ズーム処理（要件5.1対応 - スケール関係維持）
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    // 新しいスケールユーティリティを使用（要件5.1, 5.4対応）
    const newScale = e.evt.deltaY > 0 ? zoomOut(oldScale, ZOOM_FACTOR) : zoomIn(oldScale, ZOOM_FACTOR);
    const clampedScale = clampScale(newScale);
    
    if (onScaleChange) {
      onScaleChange(clampedScale);
    }
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  // ステージドラッグ処理（パン機能）
  const handleStageDragEnd = useCallback((e: any) => {
    setStagePos({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, []);

  // 配置フィードバック状態の管理（要件3.4対応）
  const [placementFeedback, setPlacementFeedback] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
    position: Position;
  } | null>(null);

  // 境界近接警告の状態管理（要件6.3, 6.4, 6.5対応）
  const [boundaryWarning, setBoundaryWarning] = useState<{
    show: boolean;
    message: string;
    tableId: string;
    nearestSide: string;
    distance: number;
  } | null>(null);

  // 境界制約フィードバックの状態管理（要件6.1, 6.2対応）
  const [boundaryConstraintFeedback, setBoundaryConstraintFeedback] = useState<{
    show: boolean;
    message: string;
    type: 'warning' | 'error' | 'info';
    position: Position;
    violations: any[];
  } | null>(null);

  // 配置フィードバックの自動非表示
  useEffect(() => {
    if (placementFeedback) {
      const timer = setTimeout(() => {
        setPlacementFeedback(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [placementFeedback]);

  // 境界近接警告の自動非表示（要件6.3, 6.4, 6.5対応）
  useEffect(() => {
    if (boundaryWarning) {
      const timer = setTimeout(() => {
        setBoundaryWarning(null);
      }, 3000); // 警告は少し長めに表示
      return () => clearTimeout(timer);
    }
  }, [boundaryWarning]);

  // 境界制約フィードバックの自動非表示（要件6.1, 6.2対応）
  useEffect(() => {
    if (boundaryConstraintFeedback) {
      const timer = setTimeout(() => {
        setBoundaryConstraintFeedback(null);
      }, 4000); // 制約フィードバックは長めに表示
      return () => clearTimeout(timer);
    }
  }, [boundaryConstraintFeedback]);

  // キャンバスクリック処理（テーブル配置・選択解除）（要件3.1, 3.2対応）
  const handleStageClick = useCallback((e: any) => {
    // 背景をクリックした場合の処理
    if (e.target === e.target.getStage()) {
      // 配置モードがアクティブな場合、テーブルを配置
      if (placementMode?.active && svgData) {
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        
        if (pointer) {
          // ステージ座標をワールド座標に変換（座標精度の向上）（要件3.2対応）
          // 高精度座標変換：0.1mm精度で座標を計算
          const rawWorldPos = {
            x: (pointer.x - stagePos.x) / scale,
            y: (pointer.y - stagePos.y) / scale,
          };
          
          // 座標を0.1mm精度に丸める（要件3.2対応）
          const worldPos = {
            x: Math.round(rawWorldPos.x * 10) / 10,
            y: Math.round(rawWorldPos.y * 10) / 10,
          };
          
          // 位置バリデーション実行（要件2.2, 2.3対応）
          const positionValidation = validateTablePosition(
            worldPos,
            { width: svgData.width, height: svgData.height }
          );
          
          // 座標精度バリデーション（要件5.1対応）
          const precisionValidation = validateCoordinatePrecision(worldPos, 0.1);
          
          // 境界外配置防止ロジックを使用（要件6.1, 6.2対応）
          const tempTable: TableObject = {
            id: 'temp',
            type: placementMode.tableType,
            position: worldPos,
            properties: placementMode.tableProps,
            style: { fill: '', stroke: '', strokeWidth: 0, opacity: 0 }
          };
          
          // テーブル重複チェック（要件2.2, 2.3対応）
          const overlapValidation = validateTableOverlap(tempTable, tables);
          
          // SVG境界情報を変換
          const svgBounds = {
            minX: 0,
            minY: 0,
            maxX: svgData.width,
            maxY: svgData.height
          };
          
          // 統合境界チェック実行（要件6.1, 6.2対応）
          const boundaryCheck = performIntegratedBoundaryCheck(
            tempTable,
            worldPos,
            svgBounds,
            'placement',
            DEFAULT_BOUNDARY_CONSTRAINTS
          );
          
          // 総合的な位置妥当性チェック
          const isValidPosition = positionValidation.isValid && 
                                 boundaryCheck.isValid && 
                                 overlapValidation.isValid;
          
          // バリデーションエラーの処理
          if (!positionValidation.isValid) {
            handleValidationError(
              'table_position',
              worldPos,
              'テーブル配置時の位置検証',
              {
                validationErrors: positionValidation.errors,
                validationWarnings: positionValidation.warnings,
                tableType: placementMode.tableType,
                position: worldPos
              }
            );
            return;
          }
          
          // 重複エラーの処理
          if (!overlapValidation.isValid) {
            handleValidationError(
              'table_overlap',
              tempTable,
              'テーブル配置時の重複検証',
              {
                validationErrors: overlapValidation.errors,
                validationWarnings: overlapValidation.warnings,
                overlappingTables: tables.filter(t => 
                  overlapValidation.errors.some(e => e.value?.overlappingTableId === t.id)
                )
              }
            );
            return;
          }
          
          // 警告の表示（エラーではないが注意が必要）
          const allWarnings = [
            ...positionValidation.warnings,
            ...precisionValidation.warnings,
            ...overlapValidation.warnings
          ];
          
          if (allWarnings.length > 0) {
            console.warn('テーブル配置時の警告:', allWarnings);
            // 警告は表示するが配置は続行
          }
          
          if (isValidPosition) {
            // 一意ID生成の改善（要件3.4対応）
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 11);
            const tableId = `table_${placementMode.tableType}_${timestamp}_${randomId}`;
            
            // テーブルオブジェクトを作成して配置（要件3.4対応）
            const newTable: TableObject = {
              id: tableId,
              type: placementMode.tableType,
              position: worldPos,
              properties: placementMode.tableProps,
              style: {
                fill: placementMode.tableType === 'rectangle' ? '#e8f4f8' : '#fff3e0',
                stroke: placementMode.tableType === 'rectangle' ? '#2196f3' : '#ff9800',
                strokeWidth: 2,
                opacity: 0.8,
              },
            };
            
            // テーブル追加処理
            onTableAdd(newTable);
            
            // 配置成功の視覚的フィードバック（要件3.4対応）
            const tableTypeText = placementMode.tableType === 'rectangle' ? '長方形' : '円形';
            const sizeText = placementMode.tableType === 'rectangle' 
              ? `${placementMode.tableProps.width}×${placementMode.tableProps.height}mm`
              : `半径${placementMode.tableProps.radius}mm`;
            
            setPlacementFeedback({
              show: true,
              message: `${tableTypeText}テーブル (${sizeText}) を配置しました`,
              type: 'success',
              position: { x: pointer.x, y: pointer.y },
            });
            
            // デバッグログ出力（座標精度確認用）
            console.log('テーブル配置成功:', {
              id: tableId,
              type: placementMode.tableType,
              position: worldPos,
              screenPosition: pointer,
              placementCheck: placementCheck,
              properties: placementMode.tableProps
            });
          } else {
            // 境界外配置の警告（要件6.1, 6.2対応）
            // 包括的エラーハンドリングシステムを使用
            const tempTable: TableObject = {
              id: 'temp-boundary-check',
              type: placementMode.tableType,
              position: worldPos,
              properties: placementMode.tableProps,
              style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 1, opacity: 0.7 }
            };
            
            const boundaryError = handleBoundaryConstraintError(
              tempTable,
              worldPos,
              {
                svgBounds,
                boundaryCheck,
                violations: boundaryCheck.violations,
                feedback: boundaryCheck.feedback
              },
              {
                operation: 'table_placement',
                placementMode: placementMode.tableType,
                timestamp: Date.now()
              }
            );
            
            // 統合境界チェック結果に基づくフィードバック表示
            setBoundaryConstraintFeedback({
              show: true,
              message: boundaryError.userFriendlyMessage,
              type: boundaryCheck.feedback.severity === 'error' ? 'error' : 'warning',
              position: { x: pointer.x, y: pointer.y },
              violations: boundaryCheck.violations
            });
            
            // 提案位置がある場合は追加情報を表示
            if (boundaryCheck.finalPosition && boundaryCheck.wasConstrained) {
              const suggestedScreenPos = {
                x: (boundaryCheck.finalPosition.x * scale) + stagePos.x,
                y: (boundaryCheck.finalPosition.y * scale) + stagePos.y
              };
              
              setTimeout(() => {
                setBoundaryConstraintFeedback({
                  show: true,
                  message: `推奨位置: (${boundaryCheck.finalPosition.x.toFixed(1)}, ${boundaryCheck.finalPosition.y.toFixed(1)})`,
                  type: 'info',
                  position: suggestedScreenPos,
                  violations: []
                });
              }, 1000);
              
              // 提案がある場合の追加フィードバック
              if (boundaryError.suggestions && boundaryError.suggestions.length > 0) {
                setTimeout(() => {
                  setBoundaryConstraintFeedback({
                    show: true,
                    message: boundaryError.suggestions!.join(', '),
                    type: 'info',
                    position: suggestedScreenPos,
                    violations: []
                  });
                }, 2000);
              }
            }
          }
        }
      } else {
        // 通常モードではテーブル選択を解除
        onTableSelect(null);
      }
    }
  }, [placementMode, svgData, stagePos, scale, onTableAdd, onTableSelect]);

  // 複数テーブル管理の状態（要件3.3対応）
  const [tableStates, setTableStates] = useState<Map<string, {
    isHovered: boolean;
    lastInteraction: number;
    renderPriority: number;
  }>>(new Map());

  // テーブル選択処理（要件3.3対応 - アクティブ状態管理強化）
  const handleTableSelect = useCallback((tableId: string) => {
    // 選択状態の更新
    onTableSelect(tableId);
    
    // テーブル状態の更新（最後のインタラクション時間を記録）
    setTableStates(prev => {
      const newStates = new Map(prev);
      newStates.set(tableId, {
        isHovered: false,
        lastInteraction: Date.now(),
        renderPriority: 1, // 選択されたテーブルは高優先度
      });
      return newStates;
    });
    
    console.log('テーブル選択:', tableId);
  }, [onTableSelect]);

  // テーブルホバー状態管理（要件3.3対応）
  const handleTableHover = useCallback((tableId: string, isHovered: boolean) => {
    setTableStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(tableId) || {
        isHovered: false,
        lastInteraction: 0,
        renderPriority: 0,
      };
      
      newStates.set(tableId, {
        ...currentState,
        isHovered,
        lastInteraction: isHovered ? Date.now() : currentState.lastInteraction,
      });
      
      return newStates;
    });
  }, []);

  // テーブルドラッグ開始処理（要件4.1対応 - Konvaドラッグイベントハンドリング）
  const handleTableDragStart = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      // ドラッグ状態管理とカーソル追従機能の初期化
      setDragState({
        tableId,
        startPosition: table.position,
        currentPosition: table.position,
        isValid: true,
        isDragging: true,
      });
      
      // ドラッグ開始時の状態更新
      setTableStates(prev => {
        const newStates = new Map(prev);
        newStates.set(tableId, {
          isHovered: false,
          lastInteraction: Date.now(),
          renderPriority: 2, // ドラッグ中は最高優先度
        });
        return newStates;
      });
      
      // ドラッグ開始のログ出力（デバッグ用）
      console.log('ドラッグ開始:', {
        tableId,
        startPosition: table.position,
        timestamp: Date.now()
      });
    }
  }, [tables]);

  // テーブルドラッグ移動処理（要件4.2対応 - リアルタイム位置更新とビジュアルフィードバック）
  const handleTableDragMove = useCallback((tableId: string, position: Position) => {
    if (dragState && dragState.tableId === tableId && svgData) {
      // テーブルサイズを考慮した境界チェック
      const table = tables.find(t => t.id === tableId);
      if (!table) return;
      
      // 位置バリデーション実行（要件2.2, 2.3対応）
      const positionValidation = validateTablePosition(
        position,
        { width: svgData.width, height: svgData.height }
      );
      
      // 座標精度バリデーション（要件5.1対応）
      const precisionValidation = validateCoordinatePrecision(position, 0.1);
      
      // 他のテーブルとの重複チェック（要件2.2, 2.3対応）
      const tempTable: TableObject = { ...table, position };
      const otherTables = tables.filter(t => t.id !== tableId);
      const overlapValidation = validateTableOverlap(tempTable, otherTables);
      
      // SVG境界情報を変換
      const svgBounds = {
        minX: 0,
        minY: 0,
        maxX: svgData.width,
        maxY: svgData.height
      };
      
      // リアルタイム境界制限機能を使用（要件6.1, 6.2対応）
      const boundaryLimitResult = enforceRealTimeBoundaryLimits(
        table,
        position,
        svgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );
      
      const finalPosition = boundaryLimitResult.limitedPosition;
      const wasLimited = boundaryLimitResult.wasLimited;
      
      // 総合的な位置妥当性チェック
      const isValid = positionValidation.isValid && 
                     !wasLimited && 
                     overlapValidation.isValid;
      
      // バリデーション警告の処理（ドラッグ中は警告のみ表示）
      const allWarnings = [
        ...positionValidation.warnings,
        ...precisionValidation.warnings,
        ...overlapValidation.warnings
      ];
      
      if (allWarnings.length > 0) {
        // 重複警告の表示
        const overlapWarnings = overlapValidation.warnings.filter(w => w.code === 'MINOR_OVERLAP');
        if (overlapWarnings.length > 0) {
          setBoundaryWarning({
            show: true,
            message: `他のテーブルと重複しています: ${overlapWarnings[0].value?.overlappingTableId}`,
            tableId,
            nearestSide: 'overlap',
            distance: overlapWarnings[0].value?.overlapPercentage || 0
          });
        }
      }

      // ドラッグ制限の詳細情報を取得（要件6.1, 6.2対応）
      const dragLimitDetails = getDragLimitDetails(
        table,
        position,
        svgBounds,
        DEFAULT_BOUNDARY_CONSTRAINTS
      );
      
      // ドラッグ状態の更新（リアルタイム位置更新）
      setDragState(prev => prev ? { 
        ...prev, 
        currentPosition: finalPosition,
        isValid 
      } : null);
      
      // リアルタイム位置更新（カーソル追従機能）
      // 境界制限が適用された位置を使用
      onTableMove(tableId, finalPosition);
      
      // 境界制限が適用された場合のフィードバック（要件6.3, 6.4, 6.5対応）
      if (wasLimited && boundaryLimitResult.limitedAxes.length > 0) {
        // ドラッグ制限フィードバックを作成
        const dragRestrictionFeedback = createDragRestrictionFeedback(
          table,
          position,
          svgBounds,
          boundaryLimitResult.limitedAxes,
          DEFAULT_BOUNDARY_CONSTRAINTS
        );
        
        setBoundaryWarning({
          show: true,
          message: dragRestrictionFeedback.message,
          tableId,
          nearestSide: boundaryLimitResult.violations[0]?.side || 'unknown',
          distance: 0
        });
        
        // 境界制約フィードバックも表示
        setBoundaryConstraintFeedback({
          show: true,
          message: `制限適用: ${dragRestrictionFeedback.restrictedDirections?.join('・')}方向`,
          type: 'warning',
          position: { x: (finalPosition.x * scale) + stagePos.x, y: (finalPosition.y * scale) + stagePos.y },
          violations: boundaryLimitResult.violations
        });
      } else {
        // 境界近接チェック（要件6.3, 6.4, 6.5対応）
        const proximityCheck = checkBoundaryProximity(
          table,
          finalPosition,
          svgBounds,
          30 // 30px以内で警告表示
        );
        
        if (proximityCheck.isNearBoundary && proximityCheck.nearestSide && proximityCheck.distance !== undefined) {
          // 境界近接時の警告表示システム
          const sideText = {
            'top': '上',
            'right': '右', 
            'bottom': '下',
            'left': '左'
          }[proximityCheck.nearestSide] || proximityCheck.nearestSide;
          
          setBoundaryWarning({
            show: true,
            message: `境界まで${Math.round(proximityCheck.distance)}px (${sideText}側)`,
            tableId,
            nearestSide: proximityCheck.nearestSide,
            distance: proximityCheck.distance
          });
        } else {
          // 境界から離れた場合は警告をクリア
          setBoundaryWarning(null);
        }
      }
      
      // ドラッグ中のビジュアルフィードバック（デバッグログ）
      if (wasLimited) {
        console.log('リアルタイム境界制限適用:', {
          tableId,
          originalPosition: position,
          limitedPosition: finalPosition,
          limitedAxes: boundaryLimitResult.limitedAxes,
          violations: boundaryLimitResult.violations
        });
      }
    }
  }, [dragState, svgData, onTableMove, tables]);

  // テーブルドラッグ終了処理（要件4.3, 4.4対応 - ドラッグ完了処理の実装）
  const handleTableDragEnd = useCallback((tableId: string) => {
    if (!dragState || !svgData) {
      // ドラッグ状態が無効な場合は早期リターン
      console.warn('ドラッグ終了処理: 無効な状態', { tableId, dragState: !!dragState, svgData: !!svgData });
      setDragState(null);
      return;
    }

    const table = tables.find(t => t.id === tableId);
    if (!table) {
      console.error('ドラッグ終了処理: テーブルが見つかりません', tableId);
      setDragState(null);
      return;
    }

    try {
      // テーブルサイズを考慮した境界計算
      const tableHalfWidth = table.type === 'rectangle' 
        ? (table.properties as any).width / 2 
        : (table.properties as any).radius;
      const tableHalfHeight = table.type === 'rectangle' 
        ? (table.properties as any).height / 2 
        : (table.properties as any).radius;
      
      const bounds = {
        minX: tableHalfWidth,
        minY: tableHalfHeight,
        maxX: svgData.width - tableHalfWidth,
        maxY: svgData.height - tableHalfHeight,
      };
      
      // ドロップ位置の確定（要件4.3対応）
      // 位置を0.1mm精度に丸める（要件5.1対応）
      const preciseCurrentPosition = roundPositionToPrecision(dragState.currentPosition);
      
      // 意図的なドラッグかどうかを判定
      const isIntentional = isIntentionalDrag(dragState.startPosition, preciseCurrentPosition);
      
      if (!isIntentional) {
        // 意図的でないドラッグの場合は元の位置を維持（要件4.4対応）
        console.log('意図的でないドラッグを検出、位置を維持:', {
          tableId,
          startPosition: dragState.startPosition,
          endPosition: preciseCurrentPosition,
          distance: calculateDragDistance(dragState.startPosition, preciseCurrentPosition)
        });
        
        // 元の位置を確実に復元
        onTableMove(tableId, dragState.startPosition);
        setDragState(null);
        return;
      }
      
      // 最終位置の包括的バリデーション（要件2.2, 2.3対応）
      const finalPositionValidation = validateTablePosition(
        preciseCurrentPosition,
        { width: svgData.width, height: svgData.height }
      );
      
      // 他のテーブルとの重複チェック（要件2.2, 2.3対応）
      const tempTable: TableObject = { ...table, position: preciseCurrentPosition };
      const otherTables = tables.filter(t => t.id !== tableId);
      const overlapValidation = validateTableOverlap(tempTable, otherTables);
      
      // テーブルオブジェクト全体の妥当性チェック
      const tableValidation = validateTableObject(
        tempTable,
        { width: svgData.width, height: svgData.height }
      );
      
      // ドラッグ操作を処理（要件4.3, 4.4対応）
      const dragResult = processDragOperation(
        table,
        dragState.startPosition,
        preciseCurrentPosition,
        bounds
      );
      
      // バリデーションエラーがある場合は元の位置に戻す（要件4.4対応）
      if (!finalPositionValidation.isValid || !tableValidation.isValid) {
        console.warn('ドラッグ終了時のバリデーションエラー:', {
          positionErrors: finalPositionValidation.errors,
          tableErrors: tableValidation.errors
        });
        
        // 無効位置での元位置復帰機能（要件4.4対応）
        onTableMove(tableId, dragState.startPosition);
        
        // エラーフィードバック表示
        handleValidationError(
          'table_drag_end',
          preciseCurrentPosition,
          'ドラッグ終了時の位置検証',
          {
            validationErrors: [...finalPositionValidation.errors, ...tableValidation.errors],
            tableId,
            originalPosition: dragState.startPosition,
            attemptedPosition: preciseCurrentPosition
          }
        );
        
        setDragState(null);
        return;
      }
      
      // 重複エラーがある場合も元の位置に戻す
      if (!overlapValidation.isValid) {
        console.warn('ドラッグ終了時の重複エラー:', overlapValidation.errors);
        
        onTableMove(tableId, dragState.startPosition);
        
        handleValidationError(
          'table_overlap',
          tempTable,
          'ドラッグ終了時の重複検証',
          {
            validationErrors: overlapValidation.errors,
            overlappingTables: otherTables.filter(t => 
              overlapValidation.errors.some(e => e.value?.overlappingTableId === t.id)
            )
          }
        );
        
        setDragState(null);
        return;
      }
      
      // ドラッグ結果に基づく処理
      if (dragResult.success) {
        // ドラッグ操作のコミット処理（要件4.3対応）
        // テーブル位置更新の確定
        onTableMove(tableId, dragResult.finalPosition);
        
        // 警告の表示（エラーではないが注意が必要）
        const allWarnings = [
          ...finalPositionValidation.warnings,
          ...overlapValidation.warnings,
          ...tableValidation.warnings
        ];
        
        if (allWarnings.length > 0) {
          console.warn('ドラッグ終了時の警告:', allWarnings);
        }
        
        // 成功フィードバック（移動距離が十分大きい場合のみ表示）
        if (dragResult.distance && dragResult.distance > 10) {
          const screenPosition = {
            x: (dragResult.finalPosition.x * scale) + stagePos.x,
            y: (dragResult.finalPosition.y * scale) + stagePos.y
          };
          
          setPlacementFeedback({
            show: true,
            message: `テーブルを移動しました（移動距離: ${dragResult.distance.toFixed(1)}px）`,
            type: 'success',
            position: screenPosition,
          });
        }
        
        // 成功ログ出力
        console.log('ドラッグ操作成功:', {
          tableId,
          startPosition: dragState.startPosition,
          finalPosition: dragResult.finalPosition,
          distance: dragResult.distance,
          timestamp: Date.now()
        });
        
      } else {
        // ドラッグ操作のロールバック処理（要件4.4対応）
        // 無効位置でのスナップバック機能を使用
        const svgBounds = {
          minX: 0,
          minY: 0,
          maxX: svgData.width,
          maxY: svgData.height
        };
        
        const snapBackResult = performSnapBack(
          table,
          preciseCurrentPosition,
          dragState.startPosition,
          svgBounds,
          DEFAULT_BOUNDARY_CONSTRAINTS
        );
        
        // スナップバック結果に基づいて位置を更新
        onTableMove(tableId, snapBackResult.snapBackPosition);
        
        // スナップバックフィードバックを表示（要件6.4, 6.5対応）
        const screenPosition = {
          x: (snapBackResult.snapBackPosition.x * scale) + stagePos.x,
          y: (snapBackResult.snapBackPosition.y * scale) + stagePos.y
        };
        
        setBoundaryConstraintFeedback({
          show: true,
          message: snapBackResult.reason,
          type: snapBackResult.shouldSnapBack ? 'warning' : 'info',
          position: screenPosition,
          violations: []
        });
        
        // 提案位置がある場合は追加で表示
        if (snapBackResult.feedback.suggestedPosition && !snapBackResult.shouldSnapBack) {
          const suggestedScreenPos = {
            x: (snapBackResult.feedback.suggestedPosition.x * scale) + stagePos.x,
            y: (snapBackResult.feedback.suggestedPosition.y * scale) + stagePos.y
          };
          
          setTimeout(() => {
            setBoundaryConstraintFeedback({
              show: true,
              message: `制約適用位置: (${snapBackResult.feedback.suggestedPosition!.x.toFixed(1)}, ${snapBackResult.feedback.suggestedPosition!.y.toFixed(1)})`,
              type: 'info',
              position: suggestedScreenPos,
              violations: []
            });
          }, 1500);
        }
        
        // エラーログ出力
        console.warn('ドラッグ操作失敗:', {
          tableId,
          startPosition: dragState.startPosition,
          attemptedPosition: preciseCurrentPosition,
          reason: dragResult.reason,
          bounds,
          timestamp: Date.now()
        });
      }
      
      // ドラッグ操作のログ出力
      const logMessage = generateDragLog(dragResult, tableId);
      if (dragResult.success) {
        console.log(logMessage);
      } else {
        console.warn(logMessage);
      }
      
    } catch (error) {
      // 包括的エラーハンドリングシステムを使用
      const appError = handleTableOperationError(
        'move',
        tableId,
        error instanceof Error ? error : new Error(String(error)),
        {
          dragState,
          table,
          operation: 'drag_end',
          timestamp: Date.now()
        }
      );
      
      // エラー時は元の位置に復帰
      if (dragState.startPosition) {
        onTableMove(tableId, dragState.startPosition);
      }
      
      // エラーフィードバック
      setPlacementFeedback({
        show: true,
        message: appError.userFriendlyMessage,
        type: 'error',
        position: { x: 400, y: 300 }, // デフォルト位置
      });
    }
    
    // ドラッグ状態のクリーンアップ（必ず実行）
    setDragState(null);
    
    // テーブル状態の更新（ドラッグ終了後の優先度リセット）
    setTableStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(tableId) || {
        isHovered: false,
        lastInteraction: 0,
        renderPriority: 0,
      };
      
      newStates.set(tableId, {
        ...currentState,
        renderPriority: 0, // ドラッグ終了後は通常優先度に戻す
        lastInteraction: Date.now(),
      });
      
      return newStates;
    });
    
  }, [dragState, tables, svgData, onTableMove, scale, stagePos, setPlacementFeedback, setTableStates]);

  // 配置モード設定用の関数（外部から呼び出し可能）
  const setTablePlacementMode = useCallback((
    tableType: 'rectangle' | 'circle',
    tableProps: any
  ) => {
    const newMode = {
      active: true,
      tableType,
      tableProps,
    };
    
    if (onPlacementModeChange) {
      onPlacementModeChange(newMode);
    } else {
      setInternalPlacementMode(newMode);
    }
  }, [onPlacementModeChange]);

  // 配置モード解除
  const clearPlacementMode = useCallback(() => {
    if (onPlacementModeChange) {
      onPlacementModeChange(null);
    } else {
      setInternalPlacementMode(null);
    }
  }, [onPlacementModeChange]);

  // 表示スケールを取得
  const displayScale = getDisplayScale(scale);

  return (
    <div className="venue-canvas" style={{ border: '1px solid #ccc', overflow: 'hidden', width: '100%', height: '100%' }}>
      {/* ステータスバー - スケール情報とSVG情報を表示（要件5.3対応） */}
      <div style={{ 
        marginBottom: '10px', 
        padding: '8px 12px', 
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px'
      }}>
        <div>
          <span>スケール: {getScalePercentage(displayScale)}</span>
          {svgData && (
            <span style={{ marginLeft: '20px' }}>
              SVGサイズ: {formatMeasurement(svgData.width)} × {formatMeasurement(svgData.height)} (1px=1mm)
            </span>
          )}
        </div>
        <div style={{ color: '#666', fontSize: '12px' }}>
          {isImageLoading && 'SVG読み込み中...'}
          {backgroundImage && !isImageLoading && 'SVG読み込み完了'}
        </div>
      </div>
      
      {/* エラー表示 */}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {currentError && (
        <ErrorDisplay
          error={currentError}
          onDismiss={dismissError}
          onRetry={() => {
            dismissError();
            // エラータイプに応じた再試行処理
            if (currentError.type === 'table_operation' && currentError.context?.operation === 'move') {
              // テーブル移動エラーの場合は最後の有効な位置に復帰
              const tableId = currentError.context.tableId;
              const table = tables.find(t => t.id === tableId);
              if (table && dragState?.startPosition) {
                onTableMove(tableId, dragState.startPosition);
              }
            }
          }}
        />
      )}
      {imageLoadError && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          border: '1px solid #ef5350',
          margin: '10px',
          borderRadius: '4px'
        }}>
          <strong>エラー:</strong> {imageLoadError}
        </div>
      )}
      
      {/* ローディング表示 */}
      {isImageLoading && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e3f2fd', 
          color: '#1976d2', 
          border: '1px solid #2196f3',
          margin: '10px',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          SVG画像を読み込んでいます...
        </div>
      )}
      
      {/* メインキャンバス領域 */}
      <div style={{ 
        width: '100%', 
        height: 'calc(100% - 80px)', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        <Stage
          ref={stageRef}
          width={viewportSize.width}
          height={viewportSize.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          draggable
          onDragEnd={handleStageDragEnd}
          onClick={handleStageClick}
        >
          {/* 背景レイヤー（要件1.1, 1.2対応） */}
          <Layer>
            {backgroundImage && svgData && (
              <KonvaImage
                image={backgroundImage}
                width={svgData.width}
                height={svgData.height}
                x={0}
                y={0}
                listening={false} // 背景画像はイベントを受け取らない
              />
            )}
          </Layer>
          
          {/* テーブルレイヤー（要件3.3対応 - レイヤー管理最適化） */}
          <Layer>
            {tables
              .sort((a, b) => {
                // レイヤー順序管理（要件3.3対応）
                // 1. 選択されたテーブルを最前面に
                if (selectedTableId === a.id) return 1;
                if (selectedTableId === b.id) return -1;
                
                // 2. ドラッグ中のテーブルを最前面に
                if (dragState?.tableId === a.id) return 1;
                if (dragState?.tableId === b.id) return -1;
                
                // 3. 作成順序を維持（IDに含まれるタイムスタンプで判定）
                const aTimestamp = parseInt(a.id.split('_')[2] || '0');
                const bTimestamp = parseInt(b.id.split('_')[2] || '0');
                return aTimestamp - bTimestamp;
              })
              .map((table, index) => {
                const isSelected = selectedTableId === table.id;
                const isDragging = dragState?.tableId === table.id && dragState?.isDragging;
                
                // レンダリング最適化：画面外のテーブルをスキップ
                // （将来の最適化として、現在は全て描画）
                const shouldRender = true; // 後で視野範囲チェックを実装
                
                if (!shouldRender) return null;
                
                // 共通のテーブルプロパティ
                const tableProps = {
                  key: table.id,
                  table: {
                    ...table,
                    // 視覚的競合防止：重なり防止のためのz-index調整
                    style: {
                      ...table.style,
                      // 選択されたテーブルの強調表示
                      strokeWidth: isSelected ? 3 : table.style.strokeWidth,
                      opacity: isDragging ? 0.7 : table.style.opacity,
                    }
                  },
                  isSelected,
                  isDragging,
                  onSelect: () => handleTableSelect(table.id),
                  onDragStart: () => handleTableDragStart(table.id),
                  onDragMove: (position: Position) => handleTableDragMove(table.id, position),
                  onDragEnd: () => handleTableDragEnd(table.id),
                };
                
                // テーブルタイプに応じたコンポーネント描画
                if (table.type === 'rectangle') {
                  return (
                    <RectangleTable 
                      {...tableProps} 
                      onHover={(isHovered) => handleTableHover(table.id, isHovered)}
                    />
                  );
                } else if (table.type === 'circle') {
                  return (
                    <CircleTable 
                      {...tableProps} 
                      onHover={(isHovered) => handleTableHover(table.id, isHovered)}
                    />
                  );
                }
                
                // 未知のテーブルタイプの場合は警告ログ
                console.warn('未知のテーブルタイプ:', table.type, table.id);
                return null;
              })}
          </Layer>
        </Stage>
        
        {/* 配置フィードバック表示（要件3.4対応） */}
        {placementFeedback && (
          <div 
            className={`${styles.placementFeedback} ${
              placementFeedback.type === 'success' 
                ? styles.placementFeedbackSuccess 
                : styles.placementFeedbackError
            }`}
            style={{
              left: placementFeedback.position.x - 100,
              top: placementFeedback.position.y - 40,
            }}
          >
            {placementFeedback.message}
          </div>
        )}

        {/* 境界近接警告表示（要件6.3, 6.4, 6.5対応） */}
        {boundaryWarning && (
          <div 
            style={{
              position: 'absolute',
              left: '50%',
              top: '20px',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 152, 0, 0.9)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              zIndex: 1000,
              pointerEvents: 'none',
              border: '2px solid #ff9800'
            }}
          >
            ⚠️ {boundaryWarning.message}
          </div>
        )}

        {/* 境界制約フィードバック表示（要件6.1, 6.2対応） */}
        {boundaryConstraintFeedback && (
          <div 
            style={{
              position: 'absolute',
              left: boundaryConstraintFeedback.position.x - 150,
              top: boundaryConstraintFeedback.position.y - 60,
              backgroundColor: boundaryConstraintFeedback.type === 'error' 
                ? 'rgba(244, 67, 54, 0.95)' 
                : boundaryConstraintFeedback.type === 'warning'
                ? 'rgba(255, 152, 0, 0.95)'
                : 'rgba(33, 150, 243, 0.95)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              zIndex: 1001,
              pointerEvents: 'none',
              border: `2px solid ${
                boundaryConstraintFeedback.type === 'error' 
                  ? '#f44336' 
                  : boundaryConstraintFeedback.type === 'warning'
                  ? '#ff9800'
                  : '#2196f3'
              }`,
              maxWidth: '300px',
              wordWrap: 'break-word'
            }}
          >
            {boundaryConstraintFeedback.type === 'error' && '🚫 '}
            {boundaryConstraintFeedback.type === 'warning' && '⚠️ '}
            {boundaryConstraintFeedback.type === 'info' && 'ℹ️ '}
            {boundaryConstraintFeedback.message}
            {boundaryConstraintFeedback.violations.length > 0 && (
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                違反箇所: {boundaryConstraintFeedback.violations.length}件
              </div>
            )}
          </div>
        )}

        {/* キャンバス操作ヘルプ */}
        {svgData && !isImageLoading && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none'
          }}>
            マウスホイール: ズーム | ドラッグ: パン
            {placementMode?.active && (
              <>
                <br />
                クリック: テーブル配置
              </>
            )}
          </div>
        )}
      </div>
      
      {/* 初期状態の表示 */}
      {!svgData && !imageLoadError && !isImageLoading && (
        <div style={{ 
          padding: '60px 40px', 
          textAlign: 'center', 
          color: '#666',
          backgroundColor: '#f9f9f9',
          height: 'calc(100% - 80px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            会場レイアウトエディター
          </div>
          <div style={{ fontSize: '14px' }}>
            SVGファイルを読み込んで会場図を表示してください
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueCanvas;