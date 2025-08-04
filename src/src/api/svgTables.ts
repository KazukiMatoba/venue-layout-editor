// SVGテーブルAPI

export interface SVGTableInfo {
  filename: string;
  name: string;
  width: number;
  height: number;
}

// SVGファイル一覧を取得するAPI
export const fetchSVGTableList = async (): Promise<SVGTableInfo[]> => {
  try {
    const response = await fetch('/api/svg-tables.json');
    if (!response.ok) {
      throw new Error(`API呼び出しに失敗しました: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('API経由での取得に失敗しました。フォールバック処理を実行します:', error);
    // APIが利用できない場合のフォールバック処理
    return await getFallbackSVGTableList();
  }
};

// リアルタイムでresourceフォルダを探索してSVGファイル一覧を取得
export const scanResourceFolder = async (): Promise<SVGTableInfo[]> => {
  console.log('resourceフォルダをスキャンしています...');
  return await getFallbackSVGTableList();
};

// フォールバック: 直接ファイルを読み込んでリストを生成
const getFallbackSVGTableList = async (): Promise<SVGTableInfo[]> => {
  console.log('resourceフォルダの動的スキャンを開始します...');
  
  // 一般的なSVGファイル名パターンを試行
  const potentialFiles = await generatePotentialFileList();
  const tableInfos: SVGTableInfo[] = [];
  const foundFiles: string[] = [];

  // 並行処理でファイルの存在確認と読み込み
  const promises = potentialFiles.map(async (filename) => {
    try {
      const response = await fetch(`/resource/table/${filename}`);
      if (!response.ok) return null;
      
      const svgContent = await response.text();
      
      // SVGファイルかどうかを確認
      if (!svgContent.includes('<svg')) return null;
      
      const { width, height } = parseSVGDimensions(svgContent);
      const name = generateDisplayName(filename);
      
      foundFiles.push(filename);
      return {
        filename,
        name,
        width,
        height
      };
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.all(promises);
  
  // nullでない結果のみを追加
  results.forEach(result => {
    if (result) {
      tableInfos.push(result);
    }
  });

  console.log(`${foundFiles.length}個のSVGファイルが見つかりました:`, foundFiles);
  
  // ファイル名の昇順でソート
  return tableInfos.sort((a, b) => a.filename.localeCompare(b.filename));
};

// 潜在的なファイル名のリストを生成
const generatePotentialFileList = async (): Promise<string[]> => {
  const potentialFiles: string[] = [];
  
  // 既知のファイル（基本セット）
  const knownFiles = [
    'rect-table-6.svg',
    'round-table-4.svg', 
    'round-table-6.svg',
    'stage.svg',
    'ステージ120x240.svg',
    'ステージ180x240.svg', 
    'ステージ240x360.svg',
    'ステージ240x720.svg',
    '丸90.svg',
    '丸120.svg',
    '丸180.svg',
    '丸180椅子8.svg',
    '丸200.svg',
    '机45x90.svg',
    '机45x180.svg',
    '机60x120.svg',
    '机60x180.svg',
    '机90x180.svg',
    '机120x240.svg'
  ];
  
  potentialFiles.push(...knownFiles);
  
  // 一般的なパターンを生成
  const patterns = generateCommonPatterns();
  potentialFiles.push(...patterns);
  
  // 重複を除去
  return [...new Set(potentialFiles)];
};

// 一般的なファイル名パターンを生成
const generateCommonPatterns = (): string[] => {
  const patterns: string[] = [];
  
  // 丸テーブルのパターン
  const roundSizes = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 240, 250, 300];
  roundSizes.forEach(size => {
    patterns.push(`丸${size}.svg`);
    patterns.push(`round-${size}.svg`);
    patterns.push(`round-table-${size}.svg`);
  });
  
  // 机のパターン
  const deskWidths = [30, 45, 60, 75, 90, 120, 150, 180];
  const deskHeights = [60, 90, 120, 150, 180, 240, 300, 360];
  deskWidths.forEach(width => {
    deskHeights.forEach(height => {
      patterns.push(`机${width}x${height}.svg`);
      patterns.push(`desk-${width}x${height}.svg`);
      patterns.push(`table-${width}x${height}.svg`);
    });
  });
  
  // ステージのパターン
  const stageWidths = [120, 180, 240, 300, 360, 480, 600];
  const stageHeights = [120, 180, 240, 300, 360, 480, 600, 720, 900];
  stageWidths.forEach(width => {
    stageHeights.forEach(height => {
      patterns.push(`ステージ${width}x${height}.svg`);
      patterns.push(`stage-${width}x${height}.svg`);
    });
  });
  
  // 長方形テーブルのパターン
  const rectSizes = [2, 4, 6, 8, 10, 12];
  rectSizes.forEach(size => {
    patterns.push(`rect-table-${size}.svg`);
    patterns.push(`rectangle-${size}.svg`);
  });
  
  // 円形テーブルのパターン
  const roundPersons = [2, 4, 6, 8, 10, 12];
  roundPersons.forEach(person => {
    patterns.push(`round-table-${person}.svg`);
    patterns.push(`circle-${person}.svg`);
  });
  
  return patterns;
};

// SVGコンテンツからwidth/heightを解析する関数
export const parseSVGDimensions = (svgContent: string): { width: number; height: number } => {
  try {
    // SVGタグからwidth/height属性を抽出
    const svgMatch = svgContent.match(/<svg[^>]*>/i);
    if (!svgMatch) {
      throw new Error('SVGタグが見つかりません');
    }

    const svgTag = svgMatch[0];
    
    // width属性を抽出
    const widthMatch = svgTag.match(/width\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
    const heightMatch = svgTag.match(/height\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
    
    if (!widthMatch || !heightMatch) {
      throw new Error('width/height属性が見つかりません');
    }

    return {
      width: parseFloat(widthMatch[1]),
      height: parseFloat(heightMatch[1])
    };
  } catch (error) {
    console.warn('SVG寸法の解析に失敗しました:', error);
    // デフォルト値を返す
    return { width: 1000, height: 1000 };
  }
};

// ファイル名から表示名を生成する関数
export const generateDisplayName = (filename: string): string => {
  const nameWithoutExt = filename.replace('.svg', '');
  
  // 特定のパターンに基づいて日本語名を生成
  if (nameWithoutExt.startsWith('rect-table-')) {
    const num = nameWithoutExt.replace('rect-table-', '');
    return `長方形テーブル（${num}人用）`;
  }
  
  if (nameWithoutExt.startsWith('round-table-')) {
    const num = nameWithoutExt.replace('round-table-', '');
    return `丸テーブル（${num}人用）`;
  }
  
  if (nameWithoutExt === 'stage') {
    return 'ステージ';
  }
  
  if (nameWithoutExt.startsWith('ステージ')) {
    return nameWithoutExt;
  }
  
  if (nameWithoutExt.startsWith('丸')) {
    return `丸テーブル ${nameWithoutExt.replace('丸', '')}`;
  }
  
  if (nameWithoutExt.startsWith('机')) {
    return `机 ${nameWithoutExt.replace('机', '')}`;
  }
  
  // その他の場合はファイル名をそのまま使用
  return nameWithoutExt;
};