import React from 'react';

interface GridSnapControlsProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  snapEnabled: boolean;
  onSnapToggle: (enabled: boolean) => void;
  gridVisible: boolean;
  onGridVisibilityToggle: (visible: boolean) => void;
}

const GridSnapControls: React.FC<GridSnapControlsProps> = ({
  gridSize,
  onGridSizeChange,
  snapEnabled,
  onSnapToggle,
  gridVisible,
  onGridVisibilityToggle
}) => {
  return (
    <div className="grid-snap-controls">
      <h4>グリッドスナップ</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => onSnapToggle(e.target.checked)}
          />
          スナップを有効にする
        </label>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={gridVisible}
            onChange={(e) => onGridVisibilityToggle(e.target.checked)}
          />
          グリッドを表示する
        </label>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
          グリッドサイズ: {gridSize}mm
        </label>
        <input
          type="range"
          min="100"
          max="1000"
          step="100"
          value={gridSize}
          onChange={(e) => onGridSizeChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
          <span>100mm</span>
          <span>1000mm</span>
        </div>
      </div>
      
      <div style={{ fontSize: '12px', color: '#666' }}>
        推奨値: 100mm（標準）、200mm（大きめ）、500mm（粗い）
      </div>
    </div>
  );
};

export default GridSnapControls;