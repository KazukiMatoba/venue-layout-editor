import React, { useState, useEffect } from 'react';
import type { TableObject } from '../types';
import { fetchSVGTableList, fetchSVGEquipmentList, type SVGTableInfo, parseSVGDimensions } from '../api/svgTables';

interface TableToolbarProps {
  onCreateTable: (type: 'rectangle' | 'circle' | 'svg' | 'textbox', props: any) => void;
  selectedTable: TableObject | null;
  onUpdateTable: (id: string, props: Partial<any>) => void;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  onCreateTable,
  selectedTable,
  onUpdateTable
}) => {
  const [tableType, setTableType] = useState<'rectangle' | 'circle' | 'svg' | 'equipment' | 'textbox'>('svg');
  const [rectangleWidth, setRectangleWidth] = useState(800);
  const [rectangleHeight, setRectangleHeight] = useState(600);
  const [circleRadius, setCircleRadius] = useState(400);
  const [selectedSvgTable, setSelectedSvgTable] = useState('');
  const [svgTables, setSvgTables] = useState<SVGTableInfo[]>([]);
  const [isLoadingSvgTables, setIsLoadingSvgTables] = useState(false);
  const [selectedSvgEquipment, setSelectedSvgEquipment] = useState('');
  const [svgEquipments, setSvgEquipments] = useState<SVGTableInfo[]>([]);
  const [isLoadingSvgEquipments, setIsLoadingSvgEquipments] = useState(false);
  const [fillColor, setFillColor] = useState('#cccccc');
  const [strokeColor, setStrokeColor] = useState('#000000');

  // テキストボックス設定
  const [textBoxText, setTextBoxText] = useState('テキスト');
  const [textBoxFontSize, setTextBoxFontSize] = useState(500);
  const [textBoxFontFamily, setTextBoxFontFamily] = useState("'MS PGothic', sans-serif");
  const [textBoxTextColor, setTextBoxTextColor] = useState('#000000');

  // SVGテーブル一覧をAPIから動的に読み込み
  useEffect(() => {
    const loadSvgTables = async () => {
      setIsLoadingSvgTables(true);
      try {
        const tables = await fetchSVGTableList();
        setSvgTables(tables);
      } catch (error) {
        console.error('SVGテーブル一覧の読み込みに失敗しました:', error);
        setSvgTables([]); // エラー時は空配列を設定
      } finally {
        setIsLoadingSvgTables(false);
      }
    };

    // SVG備品一覧をAPIから動的に読み込み
    const loadSvgEquipments = async () => {
      setIsLoadingSvgEquipments(true);
      try {
        const equipments = await fetchSVGEquipmentList();
        setSvgEquipments(equipments);
      } catch (error) {
        console.error('SVG備品一覧の読み込みに失敗しました:', error);
        setSvgEquipments([]); // エラー時は空配列を設定
      } finally {
        setIsLoadingSvgEquipments(false);
      }
    };

    loadSvgTables();
    loadSvgEquipments();
  }, []);

  const handleCreateTable = async () => {
    if (tableType === 'rectangle') {
      onCreateTable('rectangle', { width: rectangleWidth, height: rectangleHeight, fillColor: fillColor, strokeColor: strokeColor });
    } else if (tableType === 'circle') {
      onCreateTable('circle', { radius: circleRadius, fillColor: fillColor, strokeColor: strokeColor });
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
    } else if (tableType === 'equipment' && selectedSvgEquipment) {
      // SVG備品を読み込んで作成
      try {
        const response = await fetch(`/resource/equipment/${selectedSvgEquipment}`);
        if (!response.ok) {
          throw new Error(`SVGファイルの読み込みに失敗しました: ${selectedSvgEquipment}`);
        }

        const svgContent = await response.text();
        const selectedEquipment = svgEquipments.find(equipment => equipment.filename === selectedSvgEquipment);

        if (selectedEquipment) {
          // SVGコンテンツから実際の寸法を再取得（最新の情報を使用）
          const { width, height } = parseSVGDimensions(svgContent);

          onCreateTable('svg', {
            svgContent,
            width,
            height,
            originalWidth: width,
            originalHeight: height,
            filename: selectedEquipment.filename
          });
        }
      } catch (error) {
        console.error('SVG備品の作成に失敗しました:', error);
        alert('SVG備品の作成に失敗しました。');
      }
    } else if (tableType === 'textbox') {
      // テキストサイズを計算
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = `${textBoxFontSize}px ${textBoxFontFamily}`;

        // 改行コードで分割して各行の幅を測定
        const lines = textBoxText.split(/\r?\n/);
        const lineHeight = textBoxFontSize;

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

        onCreateTable('textbox', {
          text: textBoxText,
          fontSize: textBoxFontSize,
          fontFamily: textBoxFontFamily,
          width: Math.max(widthMm, 50), // 最小幅50mm
          height: Math.max(heightMm, 20), // 最小高さ20mm
          textColor: textBoxTextColor
        });
      }
    }
  };

  return (
    <div className="table-toolbar">
      <h3>ステンシル</h3>

      <div className="table-type-selection" style={{ marginBottom: '1rem' }}>
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
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            value="equipment"
            checked={tableType === 'equipment'}
            onChange={(e) => setTableType(e.target.value as 'equipment')}
            style={{ marginRight: '0.5rem' }}
          />
          プリセット備品
        </label>
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            value="rectangle"
            checked={tableType === 'rectangle'}
            onChange={(e) => setTableType(e.target.value as 'rectangle')}
            style={{ marginRight: '0.5rem' }}
          />
          長方形
        </label>
        <label style={{ display: 'block' }}>
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
            value="textbox"
            checked={tableType === 'textbox'}
            onChange={(e) => setTableType(e.target.value as 'textbox')}
            style={{ marginRight: '0.5rem' }}
          />
          テキストボックス
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
          <div style={{ marginBottom: '0.5rem' }}>
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
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              塗潰し色:
            </label>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              style={{ width: '100%', height: '35px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              枠線色:
            </label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              style={{ width: '100%', height: '35px' }}
            />
          </div>
        </div>
      ) : tableType === 'circle' ? (
        <div className="circle-settings" style={{ marginBottom: '1rem' }}>
          <h4>円形テーブル設定</h4>
          <div style={{ marginBottom: '0.5rem' }}>
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
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              塗潰し色:
            </label>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              style={{ width: '100%', height: '35px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              枠線色:
            </label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              style={{ width: '100%', height: '35px' }}
            />
          </div>
        </div>
      ) : tableType === 'svg' ? (
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
                  {table.name}
                </option>
              ))}
            </select>
          )}
          {svgTables.length === 0 && !isLoadingSvgTables && (
            <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
              利用可能なプリセットテーブルがありません
            </div>
          )}
        </div>
      ) : tableType === 'equipment' ? (
        <div className="svg-settings" style={{ marginBottom: '1rem' }}>
          <h4>プリセット備品選択</h4>
          {isLoadingSvgEquipments ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              読み込み中...
            </div>
          ) : (
            <select
              value={selectedSvgEquipment}
              onChange={(e) => setSelectedSvgEquipment(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="">-- 備品を選択してください --</option>
              {svgEquipments.map((equipment) => (
                <option key={equipment.filename} value={equipment.filename}>
                  {equipment.name}
                </option>
              ))}
            </select>
          )}
          {svgEquipments.length === 0 && !isLoadingSvgEquipments && (
            <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
              利用可能なプリセット備品がありません
            </div>
          )}
        </div>
      ) : tableType === 'textbox' ? (
        <div className="textbox-settings" style={{ marginBottom: '1rem' }}>
          <h4>テキストボックス設定</h4>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              テキスト:
            </label>
            <textarea
              value={textBoxText}
              onChange={(e) => setTextBoxText(e.target.value)}
              style={{
                width: '100%',
                padding: '0.3rem',
                minHeight: '60px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              placeholder="テキストを入力してください"
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              フォントサイズ (px):
            </label>
            <input
              type="number"
              value={textBoxFontSize}
              onChange={(e) => setTextBoxFontSize(Number(e.target.value))}
              min="8"
              max="72"
              style={{ width: '100%', padding: '0.3rem' }}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              フォント:
            </label>
            <select
              value={textBoxFontFamily}
              onChange={(e) => setTextBoxFontFamily(e.target.value)}
              style={{ width: '100%', padding: '0.3rem' }}
            >
              <option value="'MS PGothic', sans-serif">MS Pゴシック</option>
              <option value="'MS Gothic', monospace">MS ゴシック</option>
              <option value="'MS PMincho', serif">MS P明朝</option>
              <option value="'MS Mincho', serif">MS 明朝</option>
              <option value="'Meiryo', sans-serif">メイリオ</option>
            </select>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              文字色:
            </label>
            <input
              type="color"
              value={textBoxTextColor}
              onChange={(e) => setTextBoxTextColor(e.target.value)}
              style={{ width: '100%', height: '35px' }}
            />
          </div>
        </div>
      ) : null}

      <button
        onClick={handleCreateTable}
        disabled={
          (tableType === 'svg' && !selectedSvgTable) ||
          (tableType === 'equipment' && !selectedSvgEquipment) ||
          (tableType === 'textbox' && !textBoxText.trim())
        }
         className="btn-action btn-center"
      >
        追加
      </button>

      {selectedTable && (
        <div className="selected-table-info" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>選択中のテーブル</h4>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            <div>ID: {selectedTable.id}</div>
            <div>タイプ: {
              selectedTable.type === 'rectangle' ? '長方形' :
                selectedTable.type === 'circle' ? '円形' :
                  selectedTable.type === 'textbox' ? 'テキストボックス' : 'プリセットテーブル'
            }</div>
            {selectedTable.type === 'rectangle' ? (
              <div>サイズ: {(selectedTable.properties as any).width}mm × {(selectedTable.properties as any).height}mm</div>
            ) : selectedTable.type === 'circle' ? (
              <div>半径: {(selectedTable.properties as any).radius}mm</div>
            ) : selectedTable.type === 'textbox' ? (
              <div>
                <div>テキスト: {(selectedTable.properties as any).text}</div>
                <div>サイズ: {Math.round((selectedTable.properties as any).width)}mm × {Math.round((selectedTable.properties as any).height)}mm</div>
              </div>
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