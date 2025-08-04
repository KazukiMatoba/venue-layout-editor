import React, { useRef, useState, useEffect } from 'react';
import type { SVGData } from '../types';
import { fetchSVGRoomList, scanResourceRoomFolder, type SVGRoomInfo } from '../api/svgRooms';

interface SVGLoaderProps {
  onSVGLoad: (svgData: SVGData) => void;
  onError: (error: string) => void;
}

const SVGLoader: React.FC<SVGLoaderProps> = ({ onSVGLoad, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [svgRooms, setSvgRooms] = useState<SVGRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // SVGルーム一覧をAPIから動的に読み込み
  useEffect(() => {
    const loadSvgRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const rooms = await fetchSVGRoomList();
        setSvgRooms(rooms);
      } catch (error) {
        console.error('SVGルーム一覧の読み込みに失敗しました:', error);
        setSvgRooms([]); // エラー時は空配列を設定
      } finally {
        setIsLoadingRooms(false);
      }
    };

    loadSvgRooms();
  }, []);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPreset(''); // ファイル選択時はプリセット選択をリセット
      handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    // ファイル形式チェック
    if (!file.type.includes('svg') && !file.name.toLowerCase().endsWith('.svg')) {
      onError('SVGファイルを選択してください。対応形式: .svg');
      return;
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
      return;
    }

    setIsLoading(true);

    try {
      const content = await readFile(file);
      const svgData = parseSVGContent(content);
      onSVGLoad(svgData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'ファイルの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // プリセットSVGファイルを読み込む関数
  const handlePresetSelect = async (filename: string) => {
    if (!filename) return;

    setIsLoading(true);
    setSelectedPreset(filename);

    try {
      const response = await fetch(`/resource/room/${filename}`);
      if (!response.ok) {
        throw new Error(`ファイルの読み込みに失敗しました: ${filename}`);
      }
      
      const content = await response.text();
      const svgData = parseSVGContent(content);
      onSVGLoad(svgData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'プリセットファイルの読み込み中にエラーが発生しました');
      setSelectedPreset('');
    } finally {
      setIsLoading(false);
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error('ファイルの読み込み中にエラーが発生しました'));
      };
      reader.readAsText(file);
    });
  };

  const parseSVGContent = (content: string): SVGData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('無効なSVGファイルです');
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      throw new Error('SVG要素が見つかりません');
    }

    const width = parseFloat(svgElement.getAttribute('width') || '800');
    const height = parseFloat(svgElement.getAttribute('height') || '600');
    const viewBoxAttr = svgElement.getAttribute('viewBox');
    
    let viewBox = { x: 0, y: 0, width, height };
    if (viewBoxAttr) {
      const values = viewBoxAttr.split(/\s+/).map(Number);
      if (values.length === 4) {
        viewBox = { x: values[0], y: values[1], width: values[2], height: values[3] };
      }
    }

    return {
      content,
      width,
      height,
      viewBox,
      bounds: {
        minX: viewBox.x,
        minY: viewBox.y,
        maxX: viewBox.x + viewBox.width,
        maxY: viewBox.y + viewBox.height
      }
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="svg-loader">
      <h3>SVG会場図を読み込み</h3>
      
      {/* プリセット会場選択 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
          プリセット会場から選択:
        </label>
        {isLoadingRooms ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
            読み込み中...
          </div>
        ) : (
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="">-- 会場を選択してください --</option>
            {svgRooms.map((room) => (
              <option key={room.filename} value={room.filename}>
                {room.name}
              </option>
            ))}
          </select>
        )}
        {svgRooms.length === 0 && !isLoadingRooms && (
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
            利用可能なプリセット会場がありません
          </div>
        )}
      </div>

      {/* 区切り線 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        margin: '1rem 0',
        fontSize: '0.8rem',
        color: '#666'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
        <span style={{ padding: '0 1rem' }}>または</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
      </div>
      
      {/* ファイルアップロード */}
      <div 
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#f0f0f0' : '#fafafa',
          marginBottom: '1rem'
        }}
      >
        {isLoading ? (
          <p>SVGファイルを読み込み中...</p>
        ) : (
          <>
            <p>SVGファイルをドラッグ&ドロップするか、クリックして選択してください</p>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>
              対応形式: .svg | 最大サイズ: 10MB
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default SVGLoader;