import React from 'react';

interface ZoomPanControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  onResetView: () => void;
}

const ZoomPanControls: React.FC<ZoomPanControlsProps> = ({
  scale,
  onScaleChange,
  onResetView
}) => {
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    onScaleChange(newScale);
  };

  return (
    <div className="zoom-pan-controls" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      flexWrap: 'wrap'
    }}>
      <span>スケール: {(scale * 100).toFixed(0)}%</span>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <label style={{ fontSize: '12px', minWidth: '40px' }}>ズーム:</label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={scale}
          onChange={handleScaleChange}
          style={{ width: '100px' }}
        />
      </div>
      
      <button
        onClick={onResetView}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          backgroundColor: '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        リセット
      </button>
      
      <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
        💡 Shift+ドラッグで移動
      </span>
    </div>
  );
};

export default ZoomPanControls;