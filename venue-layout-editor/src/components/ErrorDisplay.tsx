import React, { useEffect } from 'react';

interface ErrorDisplayProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * エラー表示コンポーネント
 * エラー、警告、情報メッセージを表示
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  type = 'error',
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
  details,
  actionLabel,
  onAction
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, onDismiss]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <span data-testid="error-icon" className="error-display__icon--error">❌</span>;
      case 'warning':
        return <span data-testid="warning-icon" className="error-display__icon--warning">⚠️</span>;
      case 'info':
        return <span data-testid="info-icon" className="error-display__icon--info">ℹ️</span>;
      default:
        return <span data-testid="error-icon" className="error-display__icon--error">❌</span>;
    }
  };

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      className={`error-display error-display--${type}`}
    >
      <div className="error-display__content">
        {getIcon()}
        <div className="error-display__message">{message}</div>
        <button 
          onClick={onDismiss}
          className="error-display__dismiss"
          aria-label="エラーを閉じる"
        >
          ×
        </button>
      </div>
      
      {details && (
        <div className="error-display__details-section">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="error-display__details-toggle"
          >
            {showDetails ? '詳細を隠す' : '詳細を表示'}
          </button>
          {showDetails && (
            <div className="error-display__details">
              {details}
            </div>
          )}
        </div>
      )}
      
      {actionLabel && onAction && (
        <div className="error-display__actions">
          <button onClick={onAction} className="error-display__action">
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;