import React from 'react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

/**
 * ズームコントロールコンポーネント
 * ズームイン、ズームアウト、リセット機能を提供
 */
const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) => {
  return (
    <div className="zoom-controls">
      <div className="zoom-section">
        <h3>ズーム</h3>
        <div className="zoom-buttons">
          <button onClick={onZoomIn} title="ズームイン">+</button>
          <span className="zoom-level">{(scale * 100).toFixed(0)}%</span>
          <button onClick={onZoomOut} title="ズームアウト">-</button>
        </div>
        <button onClick={onResetZoom} className="reset-zoom" title="ズームリセット">
          リセット
        </button>
      </div>
    </div>
  );
};

export default ZoomControls;