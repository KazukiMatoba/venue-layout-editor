import React, { useRef, useEffect, useState } from 'react';

// コピー方向の型定義
type CopyDirection = 'up' | 'down' | 'left' | 'right';

interface DuplicateCustomDialogProps {
    isOpen: boolean;
    onClose: () => void;
    ids?: string[]; // 複製対象の図形ID配列
    onDuplicate?: (ids: string[], direction: CopyDirection, count: number, interval: number) => void;
}

const DuplicateCustomDialog: React.FC<DuplicateCustomDialogProps> = ({
    isOpen,
    onClose,
    ids = [],
    onDuplicate,
}) => {
    // フォーカス管理用のref
    const modalRef = useRef<HTMLDivElement>(null);

    // 状態管理
    const [selectedDirection, setSelectedDirection] = useState<CopyDirection>('right');
    const [copyCount, setCopyCount] = useState<number>(1);
    const [copyInterval, setCopyInterval] = useState<number>(10);

    // モーダルが開いた時にフォーカスを当てる
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // 複製実行ハンドラー
    const handleDuplicate = () => {
        if (onDuplicate && ids.length > 0) {
            onDuplicate(ids, selectedDirection, copyCount, copyInterval);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    width: '400px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                ref={modalRef}
            >
                <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>
                    選択したオブジェクトを複製 ({ids.length}個選択中)
                </h3>

                {/* 複製数の設定 */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        複製数：(個)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={copyCount}
                        onChange={(e) => setCopyCount(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                {/* 間隔の設定 */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        間隔：(mm)
                    </label>
                    <input
                        type="number"
                        min="10"
                        step="10"
                        value={copyInterval}
                        onChange={(e) => setCopyInterval(Math.max(10, parseInt(e.target.value) || 10))}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                {/* 方向選択UI */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        複製する方向：
                    </label>

                    {/* 図形と方向ボタンのレイアウト */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 1fr',
                        gridTemplateRows: '1fr 100px 1fr',
                        gap: '0px',
                        alignItems: 'center',
                        justifyItems: 'center',
                    }}>
                        {/* 上 */}
                        <div></div>
                        <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}>
                            <input
                                type="radio"
                                name="copyDirection"
                                value="up"
                                checked={selectedDirection === 'up'}
                                onChange={(e) => setSelectedDirection(e.target.value as CopyDirection)}
                                style={{ marginBottom: '0.25rem' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>上</span>
                            <div style={{ fontSize: '1.2rem' }}>↑</div>
                        </label>
                        <div></div>

                        {/* 左・中央・右 */}
                        <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}>
                            <input
                                type="radio"
                                name="copyDirection"
                                value="left"
                                checked={selectedDirection === 'left'}
                                onChange={(e) => setSelectedDirection(e.target.value as CopyDirection)}
                                style={{ marginBottom: '0.25rem' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>左</span>
                            <div style={{ fontSize: '1.2rem' }}>←</div>
                        </label>

                        {/* 中央の図形 */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#e3f2fd',
                            border: '2px solid #2196f3',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            color: '#1976d2',
                            fontWeight: 'bold'
                        }}>
                            選択図形
                        </div>

                        <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}>
                            <input
                                type="radio"
                                name="copyDirection"
                                value="right"
                                checked={selectedDirection === 'right'}
                                onChange={(e) => setSelectedDirection(e.target.value as CopyDirection)}
                                style={{ marginBottom: '0.25rem' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>右</span>
                            <div style={{ fontSize: '1.2rem' }}>→</div>
                        </label>

                        {/* 下 */}
                        <div></div>
                        <label style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}>
                            <input
                                type="radio"
                                name="copyDirection"
                                value="down"
                                checked={selectedDirection === 'down'}
                                onChange={(e) => setSelectedDirection(e.target.value as CopyDirection)}
                                style={{ marginBottom: '0.25rem' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>下</span>
                            <div style={{ fontSize: '1.2rem' }}>↓</div>
                        </label>
                        <div></div>
                    </div>

                    {/* 選択された方向の表示 */}
                    <div style={{
                        textAlign: 'center',
                        padding: '0.75rem',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                    }}>
                        <strong>選択中：</strong> {
                            selectedDirection === 'up' ? '上方向' :
                                selectedDirection === 'down' ? '下方向' :
                                    selectedDirection === 'left' ? '左方向' : '右方向'
                        } に間隔{copyInterval}mmで{copyCount}個複製
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                        onClick={handleDuplicate}
                        className='btn-action btn-mr'
                        disabled={ids.length === 0}
                        style={{
                            opacity: ids.length === 0 ? 0.5 : 1,
                            cursor: ids.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        複製実行
                    </button>

                    <button
                        onClick={onClose}
                        className='btn-cancel'
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateCustomDialog;