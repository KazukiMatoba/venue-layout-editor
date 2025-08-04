import React, { useState } from 'react';
import type { BoundaryArea } from '../types';

interface BoundaryAreaSelectorProps {
  onBoundarySet: (boundary: BoundaryArea) => void;
  onCancel: () => void;
  isActive: boolean;
}

const BoundaryAreaSelector: React.FC<BoundaryAreaSelectorProps> = ({
  onBoundarySet,
  onCancel,
  isActive
}) => {
  return (
    <div className="boundary-area-selector">
      <h3>境界エリア設定</h3>
      
      {!isActive ? (
        <div>
          <p>SVG読み込み後、テーブル配置可能な境界エリアを設定できます。</p>
          <button 
            onClick={() => onBoundarySet({ x: 0, y: 0, width: 0, height: 0 })}
            className="boundary-start-button"
            style={{
              width: '100%',
              padding: '0.7rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '0.5rem'
            }}
          >
            境界エリア設定を開始
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: '#ff9800', fontWeight: 'bold' }}>
            📍 境界エリア設定モード
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            キャンバス上でマウスをドラッグして境界エリアを設定してください
          </p>
          <button 
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
};

export default BoundaryAreaSelector;