import React, { useRef, useState, useEffect } from 'react';
import type { SVGData } from '../types';
import { fetchSVGRoomList, type SVGRoomInfo } from '../api/svgRooms';
import { SVG_SCALE_FACTOR } from '../constants/scale';

interface SVGLoaderProps {
  onSVGLoad: (svgData: SVGData) => void;
  onError: (error: string) => void;
}

const SVGLoader: React.FC<SVGLoaderProps> = ({ onSVGLoad, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
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
      const svgData = parseSVGContent(content, filename);
      svgData.fileName = filename.replace(/\.[^/.]+$/, '');

      onSVGLoad(svgData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'プリセットファイルの読み込み中にエラーが発生しました');
      setSelectedPreset('');
    } finally {
      setIsLoading(false);
    }
  };

  const parseSVGContent = (content: string, filename: string): SVGData => {
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

    // 元のwidth/heightを取得してSVG_SCALE_FACTORで拡大
    const originalWidth = parseFloat(svgElement.getAttribute('width') || '800');
    const originalHeight = parseFloat(svgElement.getAttribute('height') || '600');
    const width = originalWidth * SVG_SCALE_FACTOR;
    const height = originalHeight * SVG_SCALE_FACTOR;

    const viewBoxAttr = svgElement.getAttribute('viewBox');

    let viewBox = { x: 0, y: 0, width, height };
    if (viewBoxAttr) {
      const values = viewBoxAttr.split(/\s+/).map(Number);
      if (values.length === 4) {
        // viewBoxもSVG_SCALE_FACTORで拡大
        viewBox = {
          x: values[0] * SVG_SCALE_FACTOR,
          y: values[1] * SVG_SCALE_FACTOR,
          width: values[2] * SVG_SCALE_FACTOR,
          height: values[3] * SVG_SCALE_FACTOR
        };
      }
    }

    const fileName = filename;

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
      },
      fileName
    };
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
    </div>
  );
};

export default SVGLoader;