import React, { useRef, useEffect } from 'react';

interface MeasurementDialogProps {
    isOpen: boolean;
    horizontalDistance: number;
    verticalDistance: number;
    digonalDistance: number;
    onClose: () => void;
    onCreateScale: (firstTableId: string, secondTableId: string) => void;
    firstTableId: string;
    secondTableId: string;
}

const MeasurementDialog: React.FC<MeasurementDialogProps> = ({
    isOpen,
    horizontalDistance,
    verticalDistance,
    digonalDistance,
    onClose,
    onCreateScale,
    firstTableId,
    secondTableId
}) => {
    // フォーカス管理用のref
    const modalRef = useRef<HTMLDivElement>(null);

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

    // 直線作成ボタンのクリックハンドラー
    const handleCreateScale = () => {
        onCreateScale(firstTableId, secondTableId);
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
                <h3 style={{ margin: 0 }}>距離測定結果</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <span>水平距離：</span>
                        {horizontalDistance > 0 ? (
                            <span>{horizontalDistance.toLocaleString()}mm</span>
                        ) : horizontalDistance == 0 ? (
                            <span>水平方向は接しています</span>
                        ) : (
                            <span>水平方向で重なっています</span>
                        )}
                    </div>

                    <div>
                        <span>垂直距離：</span>
                        {verticalDistance > 0 ? (
                            <span>{verticalDistance.toLocaleString()}mm</span>
                        ) : verticalDistance == 0 ? (
                            <span>垂直方向は接しています</span>
                        ) : (
                            <span>垂直方向で重なっています</span>
                        )}
                    </div>

                    <div>
                        <span>直線距離：</span>
                        {horizontalDistance >0 ? (
                            <span>{Math.min(digonalDistance, horizontalDistance).toLocaleString()}mm</span>
                        ) : verticalDistance > 0 ? (
                            <span>{Math.min(digonalDistance, verticalDistance).toLocaleString()}mm</span>
                        ) : horizontalDistance == 0 && verticalDistance == 0 ? (
                            <span>接しています</span>
                        ) : (
                            <span>重なっています</span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                        onClick={handleCreateScale}
                        className='btn-action btn-mr'
                    >
                        寸法線を作成
                    </button>

                    <button
                        onClick={onClose}
                        className='btn-action'
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeasurementDialog;