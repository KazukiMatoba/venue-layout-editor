import type {
  Position,
  TableObject,
  BoundingBox,
  BoundaryCheckResult,
  BoundaryViolation,
  TableBounds,
  BoundaryConstraints,
  RectangleProps,
  CircleProps
} from '../types';

/**
 * デフォルトの境界制約設定
 */
export const DEFAULT_BOUNDARY_CONSTRAINTS: BoundaryConstraints = {
  enabled: true,
  strictMode: true,
  tolerance: 5, // 5px許容範囲
  snapDistance: 10 // 10px以内でスナップ
};

/**
 * テーブルオブジェクトの境界を計算する
 * @param table テーブルオブジェクト
 * @returns テーブルの境界情報
 */
export const calculateTableBounds = (table: TableObject): TableBounds => {
  const { position, type, properties } = table;
  
  if (type === 'rectangle') {
    const props = properties as RectangleProps;
    // mm → px変換（1mm = 1px）
    const width = props.width;
    const height = props.height;
    
    return {
      minX: position.x - width / 2,
      minY: position.y - height / 2,
      maxX: position.x + width / 2,
      maxY: position.y + height / 2,
      centerX: position.x,
      centerY: position.y
    };
  } else {
    const props = properties as CircleProps;
    // mm → px変換（1mm = 1px）
    const radius = props.radius;
    
    return {
      minX: position.x - radius,
      minY: position.y - radius,
      maxX: position.x + radius,
      maxY: position.y + radius,
      centerX: position.x,
      centerY: position.y
    };
  }
};

/**
 * 指定位置でのテーブル境界を計算する
 * @param table テーブルオブジェクト
 * @param position 新しい位置
 * @returns 新しい位置でのテーブル境界
 */
export const calculateTableBoundsAtPosition = (
  table: TableObject, 
  position: Position
): TableBounds => {
  const tempTable = { ...table, position };
  return calculateTableBounds(tempTable);
};

/**
 * テーブルがSVG境界内にあるかチェックする
 * @param tableBounds テーブルの境界
 * @param svgBounds SVGの境界
 * @param constraints 境界制約設定
 * @returns 境界チェック結果
 */
export const checkBoundaryConstraints = (
  tableBounds: TableBounds,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): BoundaryCheckResult => {
  if (!constraints.enabled) {
    return {
      isValid: true,
      violations: []
    };
  }

  const violations: BoundaryViolation[] = [];
  const tolerance = constraints.tolerance;

  // 上境界チェック
  if (tableBounds.minY < svgBounds.minY) {
    const distance = svgBounds.minY - tableBounds.minY;
    violations.push({
      type: distance > tolerance ? 'outside' : 'partial',
      side: 'top',
      distance,
      severity: distance > tolerance ? 'error' : 'warning'
    });
  }

  // 右境界チェック
  if (tableBounds.maxX > svgBounds.maxX) {
    const distance = tableBounds.maxX - svgBounds.maxX;
    violations.push({
      type: distance > tolerance ? 'outside' : 'partial',
      side: 'right',
      distance,
      severity: distance > tolerance ? 'error' : 'warning'
    });
  }

  // 下境界チェック
  if (tableBounds.maxY > svgBounds.maxY) {
    const distance = tableBounds.maxY - svgBounds.maxY;
    violations.push({
      type: distance > tolerance ? 'outside' : 'partial',
      side: 'bottom',
      distance,
      severity: distance > tolerance ? 'error' : 'warning'
    });
  }

  // 左境界チェック
  if (tableBounds.minX < svgBounds.minX) {
    const distance = svgBounds.minX - tableBounds.minX;
    violations.push({
      type: distance > tolerance ? 'outside' : 'partial',
      side: 'left',
      distance,
      severity: distance > tolerance ? 'error' : 'warning'
    });
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  const isValid = constraints.strictMode ? violations.length === 0 : !hasErrors;

  return {
    isValid,
    violations,
    message: violations.length > 0 
      ? `テーブルが境界を${violations.length}箇所で違反しています`
      : undefined
  };
};

/**
 * テーブルを境界内に制約する位置を計算する
 * @param table テーブルオブジェクト
 * @param targetPosition 目標位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns 制約された位置
 */
export const constrainPositionToBounds = (
  table: TableObject,
  targetPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): Position => {
  if (!constraints.enabled) {
    return targetPosition;
  }

  const tableBounds = calculateTableBoundsAtPosition(table, targetPosition);
  const checkResult = checkBoundaryConstraints(tableBounds, svgBounds, constraints);

  if (checkResult.isValid) {
    return targetPosition;
  }

  let constrainedX = targetPosition.x;
  let constrainedY = targetPosition.y;

  // 各境界違反に対して位置を調整
  checkResult.violations.forEach(violation => {
    switch (violation.side) {
      case 'top':
        constrainedY = Math.max(constrainedY, svgBounds.minY + getTableHalfHeight(table));
        break;
      case 'right':
        constrainedX = Math.min(constrainedX, svgBounds.maxX - getTableHalfWidth(table));
        break;
      case 'bottom':
        constrainedY = Math.min(constrainedY, svgBounds.maxY - getTableHalfHeight(table));
        break;
      case 'left':
        constrainedX = Math.max(constrainedX, svgBounds.minX + getTableHalfWidth(table));
        break;
    }
  });

  return { x: constrainedX, y: constrainedY };
};

/**
 * テーブルの半分の幅を取得する
 * @param table テーブルオブジェクト
 * @returns 半分の幅（px）
 */
const getTableHalfWidth = (table: TableObject): number => {
  if (table.type === 'rectangle') {
    const props = table.properties as RectangleProps;
    return props.width / 2;
  } else {
    const props = table.properties as CircleProps;
    return props.radius;
  }
};

/**
 * テーブルの半分の高さを取得する
 * @param table テーブルオブジェクト
 * @returns 半分の高さ（px）
 */
const getTableHalfHeight = (table: TableObject): number => {
  if (table.type === 'rectangle') {
    const props = table.properties as RectangleProps;
    return props.height / 2;
  } else {
    const props = table.properties as CircleProps;
    return props.radius;
  }
};

/**
 * ドラッグ中のリアルタイム境界チェック
 * @param table テーブルオブジェクト
 * @param currentPosition 現在のドラッグ位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns 境界チェック結果と制約された位置
 */
export const checkDragBoundaries = (
  table: TableObject,
  currentPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): { checkResult: BoundaryCheckResult; constrainedPosition: Position } => {
  const tableBounds = calculateTableBoundsAtPosition(table, currentPosition);
  const checkResult = checkBoundaryConstraints(tableBounds, svgBounds, constraints);
  const constrainedPosition = constrainPositionToBounds(table, currentPosition, svgBounds, constraints);

  return {
    checkResult: {
      ...checkResult,
      constrainedPosition
    },
    constrainedPosition
  };
};

/**
 * リアルタイム境界制限機能
 * ドラッグ中にテーブルが境界を超えないように位置を制限する
 * 要件6.1, 6.2に対応
 * @param table テーブルオブジェクト
 * @param dragPosition ドラッグ位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns 制限された位置と境界違反情報
 */
export const enforceRealTimeBoundaryLimits = (
  table: TableObject,
  dragPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): { 
  limitedPosition: Position; 
  wasLimited: boolean; 
  violations: BoundaryViolation[];
  limitedAxes: ('x' | 'y')[];
} => {
  if (!constraints.enabled) {
    return {
      limitedPosition: dragPosition,
      wasLimited: false,
      violations: [],
      limitedAxes: []
    };
  }

  const tableBounds = calculateTableBoundsAtPosition(table, dragPosition);
  const checkResult = checkBoundaryConstraints(tableBounds, svgBounds, constraints);
  
  if (checkResult.isValid) {
    return {
      limitedPosition: dragPosition,
      wasLimited: false,
      violations: [],
      limitedAxes: []
    };
  }

  // 境界制限を適用
  let limitedX = dragPosition.x;
  let limitedY = dragPosition.y;
  const limitedAxes: ('x' | 'y')[] = [];

  // 各境界違反に対してリアルタイム制限を適用
  checkResult.violations.forEach(violation => {
    switch (violation.side) {
      case 'top':
        const minY = svgBounds.minY + getTableHalfHeight(table);
        if (dragPosition.y < minY) {
          limitedY = minY;
          if (!limitedAxes.includes('y')) limitedAxes.push('y');
        }
        break;
      case 'right':
        const maxX = svgBounds.maxX - getTableHalfWidth(table);
        if (dragPosition.x > maxX) {
          limitedX = maxX;
          if (!limitedAxes.includes('x')) limitedAxes.push('x');
        }
        break;
      case 'bottom':
        const maxY = svgBounds.maxY - getTableHalfHeight(table);
        if (dragPosition.y > maxY) {
          limitedY = maxY;
          if (!limitedAxes.includes('y')) limitedAxes.push('y');
        }
        break;
      case 'left':
        const minX = svgBounds.minX + getTableHalfWidth(table);
        if (dragPosition.x < minX) {
          limitedX = minX;
          if (!limitedAxes.includes('x')) limitedAxes.push('x');
        }
        break;
    }
  });

  const limitedPosition = { x: limitedX, y: limitedY };
  const wasLimited = limitedX !== dragPosition.x || limitedY !== dragPosition.y;

  return {
    limitedPosition,
    wasLimited,
    violations: checkResult.violations,
    limitedAxes
  };
};

/**
 * 境界チェックシステムの統合実行
 * テーブル境界とSVG境界の衝突検出、リアルタイム境界チェック、境界外配置防止を統合
 * 要件6.1, 6.2に対応
 * @param table テーブルオブジェクト
 * @param position 位置
 * @param svgBounds SVG境界
 * @param operation 操作タイプ
 * @param constraints 境界制約設定
 * @returns 統合境界チェック結果
 */
export const performIntegratedBoundaryCheck = (
  table: TableObject,
  position: Position,
  svgBounds: BoundingBox,
  operation: 'placement' | 'drag' | 'move',
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): {
  isValid: boolean;
  finalPosition: Position;
  violations: BoundaryViolation[];
  wasConstrained: boolean;
  operation: string;
  feedback: {
    message: string;
    severity: 'info' | 'warning' | 'error';
    suggestions?: string[];
  };
} => {
  // 操作タイプに応じた処理
  switch (operation) {
    case 'placement':
      const placementCheck = preventOutOfBoundsPlacement(table, position, svgBounds, constraints);
      return {
        isValid: placementCheck.isAllowed,
        finalPosition: placementCheck.suggestedPosition || position,
        violations: placementCheck.violations,
        wasConstrained: !placementCheck.isAllowed,
        operation: 'placement',
        feedback: {
          message: placementCheck.reason || 'テーブルが正常に配置されました',
          severity: placementCheck.isAllowed ? 'info' : 'error',
          suggestions: placementCheck.suggestedPosition 
            ? [`推奨位置: (${placementCheck.suggestedPosition.x.toFixed(1)}, ${placementCheck.suggestedPosition.y.toFixed(1)})`]
            : undefined
        }
      };

    case 'drag':
      const dragLimit = enforceRealTimeBoundaryLimits(table, position, svgBounds, constraints);
      return {
        isValid: !dragLimit.wasLimited,
        finalPosition: dragLimit.limitedPosition,
        violations: dragLimit.violations,
        wasConstrained: dragLimit.wasLimited,
        operation: 'drag',
        feedback: {
          message: dragLimit.wasLimited 
            ? `ドラッグが${dragLimit.limitedAxes.join('・')}軸で制限されました`
            : 'ドラッグ操作が正常に実行されました',
          severity: dragLimit.wasLimited ? 'warning' : 'info',
          suggestions: dragLimit.wasLimited 
            ? [`制限された軸: ${dragLimit.limitedAxes.join(', ')}`]
            : undefined
        }
      };

    case 'move':
      const constrainedPosition = constrainPositionToBounds(table, position, svgBounds, constraints);
      const wasConstrained = constrainedPosition.x !== position.x || constrainedPosition.y !== position.y;
      
      return {
        isValid: !wasConstrained,
        finalPosition: constrainedPosition,
        violations: wasConstrained ? [{ 
          type: 'outside', 
          side: 'left', // 代表的な側面を設定（実際の違反側面は別途計算）
          distance: Math.sqrt(
            Math.pow(constrainedPosition.x - position.x, 2) + 
            Math.pow(constrainedPosition.y - position.y, 2)
          ),
          severity: 'warning' 
        }] : [],
        wasConstrained,
        operation: 'move',
        feedback: {
          message: wasConstrained 
            ? '位置が境界制約により調整されました'
            : 'テーブルが正常に移動されました',
          severity: wasConstrained ? 'warning' : 'info'
        }
      };

    default:
      throw new Error(`未知の操作タイプ: ${operation}`);
  }
};

/**
 * ドラッグ制限の詳細情報を取得
 * @param table テーブルオブジェクト
 * @param dragPosition ドラッグ位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns ドラッグ制限の詳細情報
 */
export const getDragLimitDetails = (
  table: TableObject,
  dragPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): {
  canDrag: boolean;
  limitedPosition: Position;
  restrictedDirections: string[];
  warningMessage?: string;
} => {
  const limitResult = enforceRealTimeBoundaryLimits(table, dragPosition, svgBounds, constraints);
  
  const restrictedDirections: string[] = [];
  if (limitResult.limitedAxes.includes('x')) {
    if (limitResult.limitedPosition.x > dragPosition.x) {
      restrictedDirections.push('右');
    } else {
      restrictedDirections.push('左');
    }
  }
  if (limitResult.limitedAxes.includes('y')) {
    if (limitResult.limitedPosition.y > dragPosition.y) {
      restrictedDirections.push('下');
    } else {
      restrictedDirections.push('上');
    }
  }

  let warningMessage: string | undefined;
  if (limitResult.wasLimited) {
    warningMessage = `${restrictedDirections.join('・')}方向への移動が制限されています`;
  }

  return {
    canDrag: !limitResult.wasLimited,
    limitedPosition: limitResult.limitedPosition,
    restrictedDirections,
    warningMessage
  };
};

/**
 * 境界外配置防止ロジック
 * テーブル配置時に境界外への配置を防ぐ
 * @param table テーブルオブジェクト
 * @param targetPosition 配置予定位置
 * @param svgBounds SVG境界
 * @param constraints 境界制約設定
 * @returns 配置可否と詳細情報
 */
export const preventOutOfBoundsPlacement = (
  table: TableObject,
  targetPosition: Position,
  svgBounds: BoundingBox,
  constraints: BoundaryConstraints = DEFAULT_BOUNDARY_CONSTRAINTS
): {
  isAllowed: boolean;
  reason?: string;
  suggestedPosition?: Position;
  violations: BoundaryViolation[];
} => {
  if (!constraints.enabled) {
    return {
      isAllowed: true,
      violations: []
    };
  }

  const tableBounds = calculateTableBoundsAtPosition(table, targetPosition);
  const checkResult = checkBoundaryConstraints(tableBounds, svgBounds, constraints);

  if (checkResult.isValid) {
    return {
      isAllowed: true,
      violations: []
    };
  }

  // 境界外配置を防止
  const suggestedPosition = constrainPositionToBounds(table, targetPosition, svgBounds, constraints);
  
  // 違反の詳細を分析
  const errorViolations = checkResult.violations.filter(v => v.severity === 'error');
  const warningViolations = checkResult.violations.filter(v => v.severity === 'warning');

  let reason = '';
  if (errorViolations.length > 0) {
    const sides = errorViolations.map(v => {
      switch (v.side) {
        case 'top': return '上';
        case 'right': return '右';
        case 'bottom': return '下';
        case 'left': return '左';
        default: return v.side;
      }
    }).join('、');
    reason = `テーブルが境界の${sides}側を超えています`;
  } else if (warningViolations.length > 0) {
    reason = '境界に近すぎる位置です';
  }

  return {
    isAllowed: false,
    reason,
    suggestedPosition,
    violations: checkResult.violations
  };
};

/**
 * 境界近接チェック（警告表示用）
 * @param table テーブルオブジェクト
 * @param position 位置
 * @param svgBounds SVG境界
 * @param warningDistance 警告距離（px）
 * @returns 境界に近いかどうか
 */
export const checkBoundaryProximity = (
  table: TableObject,
  position: Position,
  svgBounds: BoundingBox,
  warningDistance: number = 20
): { isNearBoundary: boolean; nearestSide?: string; distance?: number } => {
  const tableBounds = calculateTableBoundsAtPosition(table, position);

  const distances = {
    top: tableBounds.minY - svgBounds.minY,
    right: svgBounds.maxX - tableBounds.maxX,
    bottom: svgBounds.maxY - tableBounds.maxY,
    left: tableBounds.minX - svgBounds.minX
  };

  const minDistance = Math.min(...Object.values(distances));
  const nearestSide = Object.keys(distances).find(
    side => distances[side as keyof typeof distances] === minDistance
  );

  return {
    isNearBoundary: minDistance <= warningDistance && minDistance >= 0,
    nearestSide,
    distance: minDistance
  };
};