import React from 'react';
import type { VisualFeedback } from '../utils/boundaryFeedback';

/**
 * 境界制約フィードバック表示コンポーネント
 * 要件6.3, 6.4, 6.5に対応
 */
interface BoundaryFeedbackDisplayProps {
  feedback: VisualFeedback;
  onClose?: () => void;
}

const BoundaryFeedbackDisplay: React.FC<BoundaryFeedbackDisplayProps> = ({
  feedback,
  onClose
}) => {
  const getBackgroundColor = () => {
    switch (feedback.severity) {
      case 'error':
        return 'rgba(244, 67, 54, 0.95)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.95)';
      case 'info':
        return 'rgba(33, 150, 243, 0.95)';
      default:
        return 'rgba(96, 125, 139, 0.95)';
    }
  };

  const getBorderColor = () => {
    switch (feedback.severity) {
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#607d8b';
    }
  };

  const getIcon = () => {
    switch (feedback.type) {
      case 'boundary-error':
        return '🚫';
      case 'boundary-warning':
        return '⚠️';
      case 'snap-back':
        return '↩️';
      case 'constraint-applied':
        return '✅';
      case 'drag-restricted':
        return '🔒';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: feedback.position.x - 150,
        top: feedback.position.y - 60,
        backgroundColor: getBackgroundColor(),
        color: 'white',
        padding: '10px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
        pointerEvents: 'none',
        border: `2px solid ${getBorderColor()}`,
        maxWidth: '300px',
        wordWrap: 'break-word',
        animation: 'fadeInScale 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{getIcon()}</span>
        <span>{feedback.message}</span>
      </div>
      
      {/* 違反情報の表示 */}
      {feedback.violations && feedback.violations.length > 0 && (
        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
          違反箇所: {feedback.violations.length}件
        </div>
      )}
      
      {/* 制限方向の表示 */}
      {feedback.restrictedDirections && feedback.restrictedDirections.length > 0 && (
        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
          制限方向: {feedback.restrictedDirections.join('・')}
        </div>
      )}
      
      {/* 提案位置の表示 */}
      {feedback.suggestedPosition && (
        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
          推奨位置: ({feedback.suggestedPosition.x.toFixed(1)}, {feedback.suggestedPosition.y.toFixed(1)})
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default BoundaryFeedbackDisplay;