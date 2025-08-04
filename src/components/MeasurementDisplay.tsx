import React from 'react';
import type { MeasurementDisplayProps } from '../types/components';

/**
 * 測定値表示コンポーネント
 * 会場サイズ、テーブル情報、マウス位置などを表示
 */
const MeasurementDisplay: React.FC<MeasurementDisplayProps> = ({
  scale,
  selectedTable
}) => {
  return (
    <div className="measurement-display">
      <div className="measurement-section">
        <h3>測定情報</h3>
        <div className="scale-info">
          <span>スケール: {(scale * 100).toFixed(0)}%</span>
        </div>
        
        {selectedTable && (
          <div className="table-info">
            <h4>選択中のテーブル</h4>
            <div>ID: {selectedTable.id}</div>
            <div>タイプ: {selectedTable.type === 'rectangle' ? '長方形' : '円形'}</div>
            <div>位置: ({selectedTable.position.x.toFixed(1)}, {selectedTable.position.y.toFixed(1)}) mm</div>
            {selectedTable.type === 'rectangle' ? (
              <div>サイズ: {(selectedTable.properties as any).width} mm × {(selectedTable.properties as any).height} mm</div>
            ) : (
              <div>半径: {(selectedTable.properties as any).radius} mm</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurementDisplay;