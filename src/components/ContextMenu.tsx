import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  tableId: string;
  selectedTableIds?: string[];
  onDeleteMultiple?: () => void;
  onDuplicateMultiple?: () => void;
  onAlignTop?: () => void;
  onVerticallyCentered?: () => void;
  onAlignBottom?: () => void;
  onAlignLeft?: () => void;
  onHorizontallyCentered?: () => void;
  onAlignRight?: () => void;
  onMeasureHorizontalDistance?: () => void;
  onMeasureVerticalDistance?: () => void;
  onMeasureShortestDistance?: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onDuplicate,
  tableId,
  selectedTableIds = [],
  onDeleteMultiple,
  onDuplicateMultiple,
  onAlignTop,
  onVerticallyCentered,
  onAlignBottom,
  onAlignLeft,
  onHorizontallyCentered,
  onAlignRight,
  onMeasureHorizontalDistance,
  onMeasureVerticalDistance,
  onMeasureShortestDistance
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate();
    onClose();
  };

  const handleDeleteMultiple = () => {
    onDeleteMultiple?.();
    onClose();
  };

  const handleDuplicateMultiple = () => {
    onDuplicateMultiple?.();
    onClose();
  };

  const handleAlignTop = () => {
    onAlignTop?.();
    onClose();
  }

  const handleVerticallyCentered = () => {
    onVerticallyCentered?.();
    onClose();
  }

  const handleAlignBottom = () => {
    onAlignBottom?.();
    onClose();
  }

  const handleAlignLeft = () => {
    onAlignLeft?.();
    onClose();
  }

  const handleHorizontallyCentered = () => {
    onHorizontallyCentered?.();
    onClose();
  }

  const handleAlignRight = () => {
    onAlignRight?.();
    onClose();
  }

  const handleMeasureHorizontalDistance = () => {
    onMeasureHorizontalDistance?.();
    onClose();
  }

  const handelMeasureVerticalDistance = () => {
    onMeasureVerticalDistance?.();
    onClose();
  }

  const handleMeasureShortestDistance = () => {
    onMeasureShortestDistance?.();
    onClose();
  }

  // 複数選択されているかどうかを判定
  const isMultipleSelected = selectedTableIds.length > 1;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minWidth: '150px',
        padding: '4px 0'
      }}
    >
      {selectedTableIds.length > 1 ? (
        // 複数選択時のメニュー
        <>
          <div
            className="context-menu-item"
            onClick={handleAlignTop}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >
            ⬆️ 上揃え ({selectedTableIds.length}個)
          </div>

          <div
            className="context-menu-item"
            onClick={handleVerticallyCentered}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >
            ↕️ 上下中央揃え ({selectedTableIds.length}個)
          </div>

          <div
            className="context-menu-item"
            onClick={handleAlignBottom}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >
            ⬇️ 下揃え ({selectedTableIds.length}個)
          </div>

          <div
            className="context-menu-divider"
            style={{
              height: '1px',
              backgroundColor: '#eee',
              margin: '4px 0'
            }}
          />

          <div
            className="context-menu-item"
            onClick={handleAlignLeft}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >
            ⬅️ 左揃え ({selectedTableIds.length}個)
          </div>

          <div
            className="context-menu-item"
            onClick={handleHorizontallyCentered}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >
            ↔️ 左右中央揃え ({selectedTableIds.length}個)
          </div>

          <div
            className="context-menu-item"
            onClick={handleAlignRight}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            >
            ➡️ 右揃え ({selectedTableIds.length}個)
          </div>

          <div
            className="context-menu-divider"
            style={{
              height: '1px',
              backgroundColor: '#eee',
              margin: '4px 0'
            }}
          />

          {selectedTableIds.length == 2 && (
            <>
              <div
                className="context-menu-item"
                onClick={handleMeasureHorizontalDistance}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                📏 2つの水平距離を測定
              </div>

              <div
                className="context-menu-item"
                onClick={handelMeasureVerticalDistance}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                📏 2つの垂直距離を測定
              </div>

              <div
                className="context-menu-item"
                onClick={handleMeasureShortestDistance}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                📏 2つの最短距離を測定
              </div>

              <div
                className="context-menu-divider"
                style={{
                  height: '1px',
                  backgroundColor: '#eee',
                  margin: '4px 0'
                }}
              />
            </>
          )}

          <div
            className="context-menu-item"
            onClick={handleDuplicateMultiple}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            📋 選択したオブジェクトを複製 ({selectedTableIds.length}個)
          </div>
          
          <div
            className="context-menu-item"
            onClick={handleDeleteMultiple}
            style={{
              padding: '4px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#f44336',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffebee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            🗑️ 選択したオブジェクトを削除 ({selectedTableIds.length}個)
          </div>
        </>
      ) : (
        // 単一選択時のメニュー
        <>
          <div
            className="context-menu-item"
            onClick={handleDuplicate}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            📋 オブジェクトを複製
          </div>
          
          <div
            className="context-menu-divider"
            style={{
              height: '1px',
              backgroundColor: '#eee',
              margin: '4px 0'
            }}
          />
          
          <div
            className="context-menu-item"
            onClick={handleDelete}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#f44336',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffebee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            🗑️ オブジェクトを削除
          </div>
        </>
      )}
    </div>
  );
};

export default ContextMenu;