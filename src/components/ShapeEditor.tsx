import React, { useState, useEffect, useRef } from 'react';

interface RectangleProps {
    width: number;
    height: number;
    fillColor: string;
    strokeColor: string;
    rotationAngle: number;
}

interface CircleProps {
    radius: number;
    fillColor: string;
    strokeColor: string;
}

interface ShapeEditorProps {
    isOpen: boolean;
    shapeId: string;
    shapeType: 'rectangle' | 'circle';
    properties: RectangleProps | CircleProps;
    onSave: (id: string, properties: RectangleProps | CircleProps) => void;
    onCancel: () => void;
}

const ShapeEditor: React.FC<ShapeEditorProps> = ({
    isOpen,
    shapeId,
    shapeType,
    properties,
    onSave,
    onCancel
}) => {
    // 共通プロパティ
    const [fillColor, setFillColor] = useState(properties.fillColor);
    const [strokeColor, setStrokeColor] = useState(properties.strokeColor);

    // Rectangle専用プロパティ
    const [width, setWidth] = useState(shapeType === 'rectangle' ? (properties as RectangleProps).width : 1000);
    const [height, setHeight] = useState(shapeType === 'rectangle' ? (properties as RectangleProps).height : 1000);
    const [rotationAngle, setRotationAngle] = useState(shapeType === 'rectangle' ? (properties as RectangleProps).rotationAngle : 0);

    // Circle専用プロパティ
    const [radius, setRadius] = useState(shapeType === 'circle' ? (properties as CircleProps).radius : 500);

    // フォーカス管理用のref
    const modalRef = useRef<HTMLDivElement>(null);

    // プロパティが変更されたときに状態を更新
    useEffect(() => {
        setFillColor(properties.fillColor);
        setStrokeColor(properties.strokeColor);

        if (shapeType === 'rectangle') {
            const rectProps = properties as RectangleProps;
            setWidth(rectProps.width);
            setHeight(rectProps.height);
        } else if (shapeType === 'circle') {
            const circleProps = properties as CircleProps;
            setRadius(circleProps.radius);
        }
    }, [properties, shapeType]);

    // モーダルが開いた時にフォーカスを当てる
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    const handleSave = () => {
        let updatedProperties: RectangleProps | CircleProps;

        if (shapeType === 'rectangle') {
            updatedProperties = {
                width,
                height,
                fillColor,
                strokeColor,
                rotationAngle
            };
        } else {
            updatedProperties = {
                radius,
                fillColor,
                strokeColor
            };
        }

        onSave(shapeId, updatedProperties);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
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
            onClick={(e) => e.target === e.currentTarget && onCancel()}
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
                <h3 style={{ margin: 0 }}>{shapeType === 'rectangle' ? '長方形' : '円形'}の編集</h3>

                {/* サイズ設定 */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {shapeType === 'rectangle' ? (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    幅 (mm):
                                </label>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value))}
                                    min="10"
                                    max="5000"
                                    step="10"
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    高さ (mm):
                                </label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    min="10"
                                    max="5000"
                                    step="10"
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    回転角度 (度):
                                </label>
                                <input
                                    type="number"
                                    value={rotationAngle}
                                    onChange={(e) => setRotationAngle(Number(e.target.value))}
                                    min="0"
                                    max="360"
                                    step="1"
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                半径 (mm):
                            </label>
                            <input
                                type="number"
                                value={radius}
                                onChange={(e) => setRadius(Number(e.target.value))}
                                min="5"
                                max="2500"
                                step="5"
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* 色設定 */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            塗りつぶし色:
                        </label>
                        <input
                            type="color"
                            value={fillColor}
                            onChange={(e) => setFillColor(e.target.value)}
                            style={{
                                width: '100%',
                                height: '40px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            枠線色:
                        </label>
                        <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            style={{
                                width: '100%',
                                height: '40px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={handleSave}
                        className='btn-action btn-mr'
                    >
                        保存
                    </button>
                    <button
                        onClick={onCancel}
                        className='btn-cancel'
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShapeEditor;