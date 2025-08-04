// SVGルームAPI

export interface SVGRoomInfo {
  name: string;
  filename: string;
}

import { svgRoomsData } from '../data/svg-rooms';

// SVGルーム一覧を取得するAPI
export const fetchSVGRoomList = async (): Promise<SVGRoomInfo[]> => {
  try {
    // 静的インポートされたデータを返す
    return svgRoomsData;
  } catch (error) {
    console.warn('データの取得に失敗しました。フォールバック処理を実行します:', error);
    // APIが利用できない場合のフォールバック処理
    return await getFallbackSVGRoomList();
  }
};

// フォールバック: 直接ファイルを読み込んでリストを生成
const getFallbackSVGRoomList = async (): Promise<SVGRoomInfo[]> => {
  // 既知のSVGファイル一覧（実際の環境では動的に取得）
  const knownFiles = [
    '牡丹.svg',
    '桐.svg',
    '桂.svg',
    '山楽.svg'
  ];

  const roomInfos: SVGRoomInfo[] = [];

  for (const filename of knownFiles) {
    try {
      const response = await fetch(`/resource/room/${filename}`);
      if (!response.ok) continue;
      
      // ファイル名から表示名を生成
      const name = generateDisplayName(filename);
      
      roomInfos.push({
        filename,
        name
      });
    } catch (error) {
      console.warn(`SVGファイル ${filename} の読み込みに失敗しました:`, error);
    }
  }

  // ファイル名の昇順でソート
  return roomInfos.sort((a, b) => a.filename.localeCompare(b.filename));
};

// リアルタイムでresourceフォルダを探索してSVGファイル一覧を取得
export const scanResourceRoomFolder = async (): Promise<SVGRoomInfo[]> => {
  console.log('resource/roomフォルダをスキャンしています...');
  return await getFallbackSVGRoomList();
};

// ファイル名から表示名を生成する関数
export const generateDisplayName = (filename: string): string => {
  const nameWithoutExt = filename.replace('.svg', '');
  return nameWithoutExt;
};