import React, { useState, useEffect } from 'react';
import type { TextBoxProps } from '../types';

interface TextBoxEditorProps {
    isOpen: boolean;
    textBoxId: string;
    properties: TextBoxProps;
    onSave: (id: string, properties: TextBoxProps) => void;
    onCancel: () => void;
}

const TextBoxEditor: React.FC<TextBoxEditorProps> = ({
    isOpen,
    textBoxId,
    properties,
    onSave,
    onCancel
}) => {
    const [text, setText] = useState(properties.text);
    const [fontSize, setFontSize] = useState(properties.fontSize);
    const [fontFamily, setFontFamily] = useState(properties.fontFamily);
    const [textColor, setTextColor] = useState(properties.textColor);

    // プロパティが変更されたときに状態を更新
    useEffect(() => {
        setText(properties.text);
        setFontSize(properties.fontSize);
        setFontFamily(properties.fontFamily);
        setTextColor(properties.textColor);
    }, [properties]);

    // 等幅フォントでの文字幅を正確に計算
    const calculateMonospaceWidth = (text: string, fontSize: number): number => {
        let totalWidth = 0;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charCode = char.charCodeAt(0);
            
            // 文字種別による幅の判定
            if (charCode <= 0x7F) {
                // ASCII文字（半角）
                totalWidth += fontSize * 0.5; // 等幅フォントでは通常フォントサイズの半分
            } else if (charCode >= 0xFF61 && charCode <= 0xFF9F) {
                // 半角カタカナ
                totalWidth += fontSize * 0.5;
            } else {
                // 全角文字（ひらがな、カタカナ、漢字など）
                totalWidth += fontSize; // フォントサイズと同じ幅
            }
        }
        
        return totalWidth;
    };

    // フォールバック計算：文字種別を考慮した推定
    const calculateFallbackWidth = (text: string, fontSize: number): number => {
        let width = 0;
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            
            if (charCode <= 0x7F) {
                // ASCII文字
                width += fontSize * 0.6;
            } else if (charCode >= 0xFF61 && charCode <= 0xFF9F) {
                // 半角カタカナ
                width += fontSize * 0.6;
            } else {
                // 全角文字
                width += fontSize * 1.0;
            }
        }
        
        return width;
    };

    // 安全なテキスト測定関数
    const measureTextSafely = (context: CanvasRenderingContext2D, text: string, font: string): number => {
        try {
            // フォントを設定
            context.font = font;

            // 等幅フォントかどうかを判定
            const isMonospace = font.includes('monospace') || 
                               font.includes('MS Gothic') || 
                               font.includes('MS Mincho') ||
                               font.includes('Courier');

            if (isMonospace) {
                // 等幅フォントの場合は文字種別に計算
                return calculateMonospaceWidth(text, fontSize);
            }

            // 通常のフォントの場合
            const metrics = context.measureText(text);

            // 異常に小さい値や大きい値をチェック
            if (metrics.width <= 0 || metrics.width > text.length * fontSize * 2) {
                console.warn(`異常なテキスト幅が検出されました: ${metrics.width}px (フォント: ${font})`);
                // フォールバック計算
                return calculateFallbackWidth(text, fontSize);
            }

            return metrics.width;
        } catch (error) {
            console.error('テキスト測定エラー:', error);
            return calculateFallbackWidth(text, fontSize);
        }
    };

    const handleSave = async () => {
        // テキストサイズを再計算
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            context.font = `${fontSize}px ${fontFamily}`;

            // 改行コードで分割して各行の幅を測定
            const lines = text.split(/\r?\n/);
            const lineHeight = fontSize;

            let maxWidth = 0;
            lines.forEach(line => {
              const textMetrics = context.measureText(line);
              maxWidth = Math.max(maxWidth, textMetrics.width);
            });
    
            const textWidth = maxWidth * 1.1; //ちょっと広めに確保
            const textHeight = lineHeight * lines.length;

            // デフォルトパディング（100mm）を含めたサイズ（mmに変換）
            const paddingMm = 100; // 固定値
            const widthMm = textWidth + (paddingMm * 2);
            const heightMm = textHeight + (paddingMm * 2);

            const updatedProperties: TextBoxProps = {
                text,
                fontSize,
                fontFamily,
                width: Math.max(widthMm, 50), // 最小幅50mm
                height: Math.max(heightMm, 20), // 最小高さ20mm
                textColor
            };

            onSave(textBoxId, updatedProperties);
        }
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
                    width: '500px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}
                onKeyDown={handleKeyDown}
            >
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>テキストボックス編集</h3>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        テキスト:
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            minHeight: '80px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                        placeholder="テキストを入力してください"
                        autoFocus
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            フォントサイズ (px):
                        </label>
                        <input
                            type="number"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            min="8"
                            max="72"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            フォント:
                        </label>
                        <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                            <option value="'MS PGothic', sans-serif">MS Pゴシック</option>
                            <option value="'MS Gothic', monospace">MS ゴシック</option>
                            <option value="'MS PMincho', serif">MS P明朝</option>
                            <option value="'MS Mincho', serif">MS 明朝</option>
                            <option value="'Meiryo', sans-serif">メイリオ</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        文字色:
                    </label>
                    <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        style={{ width: '100%', height: '40px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.7rem 1.5rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!text.trim()}
                        style={{
                            padding: '0.7rem 1.5rem',
                            backgroundColor: !text.trim() ? '#ccc' : '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: !text.trim() ? 'not-allowed' : 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        保存 (Ctrl+Enter)
                    </button>
                </div>

                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
                    Escキーでキャンセル、Ctrl+Enterで保存
                </div>
            </div>
        </div>
    );
};

export default TextBoxEditor;