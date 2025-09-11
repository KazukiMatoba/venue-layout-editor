// SVGルームAPI

export interface SVGRoomInfo {
  name: string;
  filename: string;
}

// SVGルーム一覧を取得するAPI
export const fetchSVGRoomList = async (): Promise<SVGRoomInfo[]> => {
  try {
    // JSONファイルから直接読み込み
    const response = await fetch('/api/svg-rooms.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('JSONファイルの取得に失敗しました。:', error);
    return [];
  }
};

// ファイル名から表示名を生成する関数
export const generateDisplayName = (filename: string): string => {
  const nameWithoutExt = filename.replace('.svg', '');
  return nameWithoutExt;
};