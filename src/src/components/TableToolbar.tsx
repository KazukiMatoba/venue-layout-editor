import React, { useState, useEffect } from 'react';
import type { TableObject } from '../types';
import { fetchSVGTableList, scanResourceFolder, type SVGTableInfo, parseSVGDimensions } from '../api/svgTables';

interface TableToolbarProps {
  onCreateTable: (type: 'rectangle' | 'circle' | 'svg', props: any) => void;
  selectedTable: TableObject | null;
  onUpdateTable: (id: string, props: Partial<any>) => void;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  onCreateTable,
  selectedTable,
  onUpdateTable
}) => {
  const [tableType, setTableType] = useState<'rectangle' | 'circle' | 'svg'>('rectangle');
  const [rectangleWidth, setRectangleWidth] = useState(800);
  const [rectangleHeight, setRectangleHeight] = useState(600);
  const [circleRadius, setCircleRadius] = useState(400);
  const [selectedSvgTable, setSelectedSvgTable] = useState('');
  const [svgTables, setSvgTables] = useState<SVGTableInfo[]>([]);
  const [isLoadingSvgTables, setIsLoadingSvgTables] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanMethod, setScanMethod] = useState<'api' | 'scan'>('api');

  // SVGテーブル一覧をAPIから動的に読み込み
  useEffect(() => {
    const loadSvgTables = async () => {
      setIsLoadingSvgTables(true);
      try {
        const tables = await fetchSVGTableList();
        setSvgTables(tables);
        setScanMethod('api');
        setLastScanTime(new Date());
      } catch (error) {
        console.error('SVGテーブル一覧の読み込みに失敗しました:', error);
        setSvgTables([]); // エラー時は空配列を設定
      } finally {
        setIsLoadingSvgTables(false);
      }
    };

    loadSvgTables();
  }, []);

  const handleCreateTable = async () => {
    if (tableType === 'rectangle') {
      onCreateTable('rectangle', { width: rectangleWidth, height: rectangleHeight });
    } else if (tableType === 'circle') {
      onCreateTable('circle', { radius: circleRadius });
    } else if (tableType === 'svg' && selectedSvgTable) {
      // SVGテーブルを読み込んで作成
      try {
        const response = await fetch(`/resource/table/${selectedSvgTable}`);
        if (!response.ok) {
          throw new Error(`SVGファイルの読み込みに失敗しました: ${selectedSvgTable}`);
        }

        const svgContent = await response.text();
        const selectedTable = svgTables.find(table => table.filename === selectedSvgTable);

        if (selectedTable) {
          // SVGコンテンツから実際の寸法を再取得（最新の情報を使用）
          const { width, height } = parseSVGDimensions(svgContent);

          onCreateTable('svg', {
            svgContent,
            width,
            height,
            originalWidth: width,
            originalHeight: height,
            filename: selectedTable.filename
          });
        }
      } catch (error) {
        console.error('SVGテーブルの作成に失敗しました:', error);
        alert('SVGテーブルの作成に失敗しました。');
      }
    }
  };

  return (
    <div className="table-toolbar">
      <h3>テーブル作成</h3>

      <div className="table-type-selection" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <input
            type="radio"
            value="rectangle"
            checked={tableType === 'rectangle'}
            onChange={(e) => setTableType(e.target.value as 'rectangle')}
            style={{ marginRight: '0.5rem' }}
          />
          長方形
        </label>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <input
            type="radio"
            value="circle"
            checked={tableType === 'circle'}
            onChange={(e) => setTableType(e.target.value as 'circle')}
            style={{ marginRight: '0.5rem' }}
          />
          円形
        </label>
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            value="svg"
            checked={tableType === 'svg'}
            onChange={(e) => setTableType(e.target.value as 'svg')}
            style={{ marginRight: '0.5rem' }}
          />
          プリセットテーブル
        </label>
      </div>

      {tableType === 'rectangle' ? (
        <div className="rectangle-settings" style={{ marginBottom: '1rem' }}>
          <h4>長方形テーブル設定</h4>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              幅 (mm):
            </label>
            <input
              type="number"
              value={rectangleWidth}
              onChange={(e) => setRectangleWidth(Number(e.target.value))}
              min="50"
              max="2000"
              style={{ width: '100%', padding: '0.3rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              高さ (mm):
            </label>
            <input
              type="number"
              value={rectangleHeight}
              onChange={(e) => setRectangleHeight(Number(e.target.value))}
              min="50"
              max="2000"
              style={{ width: '100%', padding: '0.3rem' }}
            />
          </div>
        </div>
      ) : tableType === 'circle' ? (
        <div className="circle-settings" style={{ marginBottom: '1rem' }}>
          <h4>円形テーブル設定</h4>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              半径 (mm):
            </label>
            <input
              type="number"
              value={circleRadius}
              onChange={(e) => setCircleRadius(Number(e.target.value))}
              min="25"
              max="1000"
              style={{ width: '100%', padding: '0.3rem' }}
            />
          </div>
        </div>
      ) : (
        <div className="svg-settings" style={{ marginBottom: '1rem' }}>
          <h4>プリセットテーブル選択</h4>
          {isLoadingSvgTables ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              読み込み中...
            </div>
          ) : (
            <select
              value={selectedSvgTable}
              onChange={(e) => setSelectedSvgTable(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="">-- テーブルを選択してください --</option>
              {svgTables.map((table) => (
                <option key={table.filename} value={table.filename}>
                  {table.name} ({table.width}×{table.height}mm)
                </option>
              ))}
            </select>
          )}
          {svgTables.length === 0 && !isLoadingSvgTables && (
            <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
              利用可能なプリセットテーブルがありません
            </div>
          )}
          {lastScanTime && (
            <div style={{
              padding: '0.3rem',
              fontSize: '0.7rem',
              color: '#666',
              textAlign: 'center',
              borderTop: '1px solid #eee',
              marginTop: '0.5rem'
            }}>
              {scanMethod === 'api' ? '📄 API' : '🔍 フォルダスキャン'} |
              {svgTables.length}件 |
              {lastScanTime.toLocaleTimeString()}更新
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleCreateTable}
        disabled={tableType === 'svg' && !selectedSvgTable}
        style={{
          width: '100%',
          padding: '0.7rem',
          backgroundColor: (tableType === 'svg' && !selectedSvgTable) ? '#ccc' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (tableType === 'svg' && !selectedSvgTable) ? 'not-allowed' : 'pointer',
          fontSize: '1rem'
        }}
      >
        テーブル作成
      </button>

      {selectedTable && (
        <div className="selected-table-info" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>選択中のテーブル</h4>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            <div>ID: {selectedTable.id}</div>
            <div>タイプ: {
              selectedTable.type === 'rectangle' ? '長方形' :
                selectedTable.type === 'circle' ? '円形' : 'プリセットテーブル'
            }</div>
            {selectedTable.type === 'rectangle' ? (
              <div>サイズ: {(selectedTable.properties as any).width}mm × {(selectedTable.properties as any).height}mm</div>
            ) : selectedTable.type === 'circle' ? (
              <div>半径: {(selectedTable.properties as any).radius}mm</div>
            ) : (
              <div>サイズ: {(selectedTable.properties as any).width}mm × {(selectedTable.properties as any).height}mm</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableToolbar;