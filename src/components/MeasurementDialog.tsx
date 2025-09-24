import React, {useRef, useEffect} from 'react';

import { type DistanceType } from '../types';

interface MeasurementDialogProps {
    isOpen: boolean;
    distanceType: DistanceType;
    horizontalDistance: number;
    verticalDistance: number;
    shortestDistance: number;
    onClose: () => void;
}

const MeasurementDialog: React.FC<MeasurementDialogProps> = ({
    isOpen,
    distanceType,
    horizontalDistance,
    verticalDistance,
    shortestDistance,
    onClose
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
                    {distanceType === 'horizontal' ? (
                        <>
                            {horizontalDistance >= 0 ? (
                                <div>
                                    <span>{horizontalDistance.toLocaleString()}</span>
                                    <span>mm</span>
                                </div>
                            ) : (
                                <p>水平方向で重なっています</p>
                            )}
                        </>
                    ) : distanceType === 'vertical' ? (
                        <>
                            {verticalDistance >= 0 ? (
                                <div>
                                    <span>{verticalDistance.toLocaleString()}</span>
                                    <span>mm</span>
                                </div>
                            ) : (
                                <p>※ 垂直方向で重なっています</p>
                            )}
                        </>
                    ) : distanceType === 'shortest' ? (
                        <>
                            {horizontalDistance >= 0 || verticalDistance >= 0 ? (
                                <div>
                                    <span>{shortestDistance.toLocaleString()}</span>
                                    <span>mm</span>
                                </div>
                            ) : (
                                <p>※ 重なっています</p>
                            )}
                        </>
                    ) : (
                        <></>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
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