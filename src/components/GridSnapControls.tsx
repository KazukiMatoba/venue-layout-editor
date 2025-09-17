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
      <h3>グリッドスナップ</h3>
      
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => onSnapToggle(e.target.checked)}
          />
          スナップを有効にする
        </label>
      </div>
      
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={gridVisible}
            onChange={(e) => onGridVisibilityToggle(e.target.checked)}
          />
          グリッドを表示する
        </label>
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
          グリッドサイズ: {gridSize}mm
        </label>
        <input
          type="range"
          min="100"
          max="1500"
          step="100"
          value={gridSize}
          onChange={(e) => onGridSizeChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
          <span>100mm</span>
          <span>1500mm</span>
        </div>
      </div>
    </div>
  );
};

export default GridSnapControls;