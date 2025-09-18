import React, { useState, useEffect, useRef } from 'react';
import type { SVGTableProps } from '../types';

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
    shapeType: 'rectangle' | 'circle' | 'svg';
    properties: RectangleProps | CircleProps | SVGTableProps;
    onSave: (id: string, properties: RectangleProps | CircleProps | SVGTableProps) => void;
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
    type FillColorProps = RectangleProps | CircleProps;
    const [fillColor, setFillColor] = useState(shapeType !== 'svg' ? (properties as FillColorProps).fillColor : "");

    type StrokeColorProps = RectangleProps | CircleProps;
    const [strokeColor, setStrokeColor] = useState(shapeType !== 'svg' ? (properties as StrokeColorProps).strokeColor : "");

    type RotationAngleProp = RectangleProps | SVGTableProps;
    const [rotationAngle, setRotationAngle] = useState(shapeType !== 'circle' ? (properties as RotationAngleProp).rotationAngle : 0);

    type WidthProp = RectangleProps | SVGTableProps;
    const [width, setWidth] = useState(shapeType !== 'circle' ? (properties as WidthProp).width : 0);

    type HeightProp = RectangleProps | SVGTableProps;
    const [height, setHeight] = useState(shapeType !== 'circle' ? (properties as HeightProp).height : 0);

    const [radius, setRadius] = useState(shapeType === 'circle' ? (properties as CircleProps).radius : 0);

    const [svgContent, setSvgContent] = useState(shapeType === 'svg' ? (properties as SVGTableProps).svgContent : "");
    const [originalWidth, setOriginalWidth] = useState(shapeType === 'svg' ? (properties as SVGTableProps).originalWidth : 0);
    const [originalHeight, setOriginalHeight] = useState(shapeType === 'svg' ? (properties as SVGTableProps).originalHeight : 0);
    const [filename, setFilename] = useState(shapeType === 'svg' ? (properties as SVGTableProps).filename : "");


    // フォーカス管理用のref
    const modalRef = useRef<HTMLDivElement>(null);

    // プロパティが変更されたときに状態を更新
    useEffect(() => {
        if (shapeType === 'rectangle') {
            const rectProps = properties as RectangleProps;
            setWidth(rectProps.width);
            setHeight(rectProps.height);
            setFillColor(rectProps.fillColor);
            setStrokeColor(rectProps.strokeColor);
            setRotationAngle(rectProps.rotationAngle);
        } else if (shapeType === 'svg') {
            const svgProps = properties as SVGTableProps;
            setSvgContent(svgProps.svgContent);
            setOriginalWidth(svgProps.originalWidth);
            setOriginalHeight(svgProps.originalHeight);
            setFilename(svgProps.filename);
            setRotationAngle(svgProps.rotationAngle);
        } else if (shapeType === 'circle') {
            const circleProps = properties as CircleProps;
            setRadius(circleProps.radius);
            setFillColor(circleProps.fillColor);
            setStrokeColor(circleProps.strokeColor);
        }
    }, [properties, shapeType]);

    // モーダルが開いた時にフォーカスを当てる
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    const handleSave = () => {
        let updatedProperties: RectangleProps | CircleProps | SVGTableProps;

        if (shapeType === 'rectangle') {
            updatedProperties = {
                width,
                height,
                fillColor,
                strokeColor,
                rotationAngle
            };
        }else if (shapeType === 'svg') {
            updatedProperties = {
                svgContent,
                width,
                height,
                originalWidth,
                originalHeight,
                filename,
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
                <h3 style={{ margin: 0 }}>オブジェクトの編集</h3>

                {/* サイズ設定 */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {shapeType === 'rectangle' ? (
                        <>
                            <div style={{ marginBottom: '0.5rem' }}>
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
                            <div style={{ marginBottom: '0.5rem' }}>
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
                            <div style={{ marginBottom: '0.5rem' }}>
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
                            <div style={{ marginBottom: '0.5rem' }}>
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
                            <div style={{ marginBottom: '0.5rem' }}>
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
                        </>
                    ) : shapeType === 'svg' ? (
                        <div style={{ marginBottom: '0.5rem' }}>
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
                    ) : (
                        <>
                            <div style={{ marginBottom: '0.5rem' }}>
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
                            <div style={{ marginBottom: '0.5rem' }}>
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
                            <div style={{ marginBottom: '0.5rem' }}>
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
                        </>
                    )}
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