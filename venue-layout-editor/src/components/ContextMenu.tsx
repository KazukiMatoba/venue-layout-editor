import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  tableId: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onDuplicate,
  tableId
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
        📋 テーブルを複製
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
        🗑️ テーブルを削除
      </div>
    </div>
  );
};

export default ContextMenu;