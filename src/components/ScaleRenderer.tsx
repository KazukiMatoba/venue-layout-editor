import React, { useEffect, useRef, useState } from 'react';
import { Text, Arrow, Group, RegularPolygon, Line } from 'react-konva';
import { type TableObject, type ScaleProps, circumscriptionSizeFull } from '../types';
import Konva from 'konva';

// ScaleComponentの型定義
interface ScaleComponentProps {
  table: TableObject;
  finalScale: number;
  centerOffsetX: number;
  centerOffsetY: number;
  panX: number;
  panY: number;
  allTables: TableObject[]; // 全テーブルリストを追加
  onContextMenu?: (e: any) => void;
}


const ScaleRenderer: React.FC<ScaleComponentProps> = ({
  table,
  finalScale,
  centerOffsetX,
  centerOffsetY,
  panX,
  panY,
  allTables,
  onContextMenu,
}) => {
  const props = table.properties as ScaleProps;
  const textRef = useRef<Konva.Text>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [textHeight, setTextHeight] = useState(0);

  // useEffectでTextの幅を監視
  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.width());
      setTextHeight(textRef.current.height());
    }
  }, []);


  // 選択された２つのテーブルを取得
  const firstTable = allTables.find(table => table.id == props.firstTableId);
  const secondTable = allTables.find(table => table.id == props.secondTableId);

  // テーブルオブジェクトが削除されている場合は何も描画しない
  if (!firstTable || !secondTable) {
    return null;
  }

  const firstCircumscription = circumscriptionSizeFull(firstTable);
  const secondCircumscription = circumscriptionSizeFull(secondTable);

  // 水平方向の距離
  const horizontalDistance = Math.max(
    firstCircumscription.corners.topLeft.x - secondCircumscription.corners.bottomRight.x,
    secondCircumscription.corners.topLeft.x - firstCircumscription.corners.bottomRight.x
  );

  // 垂直方向の距離
  const verticalDistance = Math.max(
    firstCircumscription.corners.topLeft.y - secondCircumscription.corners.bottomRight.y,
    secondCircumscription.corners.topLeft.y - firstCircumscription.corners.bottomRight.y
  );

  // 直線距離
  const digonalDistance = Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(verticalDistance, 2));

  let scaleType = "none";
  if (horizontalDistance <= 0 && verticalDistance <= 0) {
    // 重なっている
    scaleType = "none";
  } else if (horizontalDistance > 0 && verticalDistance <= 0) {
    // 垂直方法は重なっている→水平寸法を表示
    scaleType = "horizontal";
  } else if (horizontalDistance <= 0 && verticalDistance > 0) {
    // 水平方向は重なっている→垂直寸法を表示
    scaleType = "vertical";
  } else {
    // 離れている→直線寸法を表示
    scaleType = "digonal";
  }



  const scalePosition = (): { startX: number, startY: number, endX: number, endY: number } => {
    if (scaleType === 'horizontal') {
      const overlapStart = Math.max(firstCircumscription.corners.topLeft.y, secondCircumscription.corners.topLeft.y);
      const overlapEnd = Math.min(firstCircumscription.corners.bottomLeft.y, secondCircumscription.corners.bottomLeft.y);
      const centerY = (overlapStart + overlapEnd) / 2;
      if (firstCircumscription.corners.topLeft.x < secondCircumscription.corners.topLeft.x) {
        // firstTableが左側
        return {
          startX: firstCircumscription.corners.topRight.x,
          startY: centerY,
          endX: secondCircumscription.corners.topLeft.x,
          endY: centerY
        };
      } else {
        // firstTableが右側
        return {
          startX: secondCircumscription.corners.topRight.x,
          startY: centerY,
          endX: firstCircumscription.corners.topLeft.x,
          endY: centerY
        };
      }
    } else if (scaleType === 'vertical') {
      const overlapStart = Math.max(firstCircumscription.corners.topLeft.x, secondCircumscription.corners.topLeft.x);
      const overlapEnd = Math.min(firstCircumscription.corners.topRight.x, secondCircumscription.corners.topRight.x);
      const centerX = (overlapStart + overlapEnd) / 2;
      if (firstCircumscription.corners.topLeft.y < secondCircumscription.corners.topLeft.y) {
        // firstTableが上側
        return {
          startX: centerX,
          startY: firstCircumscription.corners.bottomLeft.y,
          endX: centerX,
          endY: secondCircumscription.corners.topLeft.y
        };
      } else {
        // firstTableが下側
        return {
          startX: centerX,
          startY: secondCircumscription.corners.bottomLeft.y,
          endX: centerX,
          endY: firstCircumscription.corners.topLeft.y
        };
      }
    } else if (scaleType === 'digonal') {
      if (firstCircumscription.corners.topLeft.x < secondCircumscription.corners.topLeft.x) {
        // firstTableが左側
        if (firstCircumscription.corners.topLeft.y < secondCircumscription.corners.topLeft.y) {
          // firstTableが上側
          return {
            startX: firstCircumscription.corners.bottomRight.x,
            startY: firstCircumscription.corners.bottomRight.y,
            endX: secondCircumscription.corners.topLeft.x,
            endY: secondCircumscription.corners.topLeft.y
          };
        } else {
          // firstTableが下側
          return {
            startX: firstCircumscription.corners.topRight.x,
            startY: firstCircumscription.corners.topRight.y,
            endX: secondCircumscription.corners.bottomLeft.x,
            endY: secondCircumscription.corners.bottomLeft.y
          };
        }
      } else {
        // firstTableが右側
        if (firstCircumscription.corners.topLeft.y < secondCircumscription.corners.topLeft.y) {
          // firstTableが上側
          return {
            startX: firstCircumscription.corners.bottomLeft.x,
            startY: firstCircumscription.corners.bottomLeft.y,
            endX: secondCircumscription.corners.topRight.x,
            endY: secondCircumscription.corners.topRight.y
          };
        } else {
          // firstTableが下側
          return {
            startX: firstCircumscription.corners.topLeft.x,
            startY: firstCircumscription.corners.topLeft.y,
            endX: secondCircumscription.corners.bottomRight.x,
            endY: secondCircumscription.corners.bottomRight.y
          };
        }
      }
    } else {
      return {
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
      };
    }
  };

  const position = scalePosition();

  // 座標変換を適用
  const transformedStartX = (position.startX * finalScale) + centerOffsetX + panX;
  const transformedStartY = (position.startY * finalScale) + centerOffsetY + panY;
  const transformedEndX = (position.endX * finalScale) + centerOffsetX + panX;
  const transformedEndY = (position.endY * finalScale) + centerOffsetY + panY;

  const measurementText = () => {
    if (scaleType === 'horizontal') {
      return `${Math.round(horizontalDistance).toLocaleString()}mm`;
    } else if (scaleType === 'vertical') {
      return `${Math.round(verticalDistance).toLocaleString()}mm`;
    } else if (scaleType === 'digonal') {
      return `${Math.round(digonalDistance).toLocaleString()}mm`;
    }
    return '';
  }

  return (
    <React.Fragment>
      <Group
        onContextMenu={onContextMenu}
      >
        <Arrow
          points={[
            transformedStartX,
            transformedStartY,
            transformedEndX,
            transformedEndY
          ]}
          pointerLength={6}
          pointerWidth={6}
          fill="#000"
          stroke="#000"
          strokeWidth={1}
          pointerAtBeginning={true}
          pointerAtEnding={true}
        />

        <Text
          ref={textRef}
          x={scaleType === 'horizontal' ? (
            (transformedStartX + transformedEndX) / 2 - textWidth / 2
          ) : scaleType === 'vertical' ? (
            (transformedStartX + transformedEndX) / 2 + 5
          ) : scaleType === 'digonal' ? (
            (transformedStartX + transformedEndX) / 2
          ) : 0}
          y={scaleType === 'horizontal' ? (
            (transformedStartY + transformedEndY) / 2 + 5
          ) : scaleType === 'vertical' ? (
            (transformedStartY + transformedEndY) / 2 - textHeight / 2
          ) : scaleType === 'digonal' ? (
            (transformedStartY + transformedEndY) / 2
          ) : 0}
          text={measurementText()}
          fontSize={250 * finalScale}
          fill="#000"
        />
      </Group>
    </React.Fragment>
  );
};

export default ScaleRenderer;