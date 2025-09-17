import type { ProjectData, ProjectInfo, TableObject, SVGData, LoadResult } from '../types/index';

/**
 * 現在のプロジェクト状態をJSONデータに変換
 */
export const exportProjectToJSON = (
    tables: TableObject[],
    svgData: SVGData | null,
    projectName: string
): ProjectData => {
    const now = new Date().toISOString();

    const projectInfo: ProjectInfo = {
        name: projectName || `会場レイアウト_${new Date().toLocaleDateString('ja-JP')}`,
        createdAt: now,
        lastModified: now,
        version: '1.0'
    };

    const projectData: ProjectData = {
        projectInfo,
        venue: {
            dimensions: {
                width: svgData?.width || 800,
                height: svgData?.height || 600
            }
        },
        tables: tables.map(table => ({
            ...table
        }))
    };

    // 背景画像は必ず含める
    if (svgData) {
        projectData.venue.svgData = svgData;
    }

    return projectData;
};

/**
 * プロジェクトデータをJSONファイルとしてダウンロード
 */
export const downloadProjectAsJSON = (
    tables: TableObject[],
    svgData: SVGData | null,
    projectName: string
): void => {
    try {
        const projectData = exportProjectToJSON(tables, svgData, projectName);
        const jsonString = JSON.stringify(projectData, null, 2);

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectName || 'venue-layout'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('プロジェクトの保存に失敗しました:', error);
        throw new Error('プロジェクトの保存に失敗しました');
    }
};

/**
 * JSONファイルからプロジェクトデータを読み込み
 */
export const loadProjectFromJSON = (file: File): Promise<LoadResult> => {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const jsonString = event.target?.result as string;
                const data = JSON.parse(jsonString) as ProjectData;

                // データ検証
                const validationResult = validateProjectData(data);
                
                if (!validationResult.isValid) {
                    resolve({
                        success: false,
                        error: validationResult.error,
                        warnings: validationResult.warnings
                    });
                    return;
                }

                // 読み込み成功
                resolve({
                    success: true,
                    data: data,
                    warnings: validationResult.warnings
                });
            } catch (error) {
                resolve({
                    success: false,
                    error: 'JSONファイルの解析に失敗しました。ファイル形式を確認してください。'
                });
            }
        };

        reader.onerror = () => {
            resolve({
                success: false,
                error: 'ファイルの読み込みに失敗しました。'
            });
        };

        reader.readAsText(file);
    });
};

/**
 * プロジェクトデータの検証
 */
export const validateProjectData = (data: any): {
    isValid: boolean;
    error?: string;
    warnings?: string[];
} => {
    const warnings: string[] = [];

    // 基本構造の確認
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: '無効なデータ形式です' };
    }

    // プロジェクト情報の確認
    if (!data.projectInfo || typeof data.projectInfo !== 'object') {
        return { isValid: false, error: 'プロジェクト情報が見つかりません' };
    }

    // 必須フィールドの確認
    const requiredFields = ['name', 'version'];
    for (const field of requiredFields) {
        if (!data.projectInfo[field]) {
            warnings.push(`プロジェクト情報の${field}が設定されていません`);
        }
    }

    // 会場データの確認
    if (!data.venue || typeof data.venue !== 'object') {
        return { isValid: false, error: '会場データが見つかりません' };
    }

    if (!data.venue.dimensions ||
        typeof data.venue.dimensions.width !== 'number' ||
        typeof data.venue.dimensions.height !== 'number') {
        return { isValid: false, error: '会場の寸法データが無効です' };
    }

    // テーブルデータの確認
    if (!Array.isArray(data.tables)) {
        return { isValid: false, error: 'テーブルデータが無効です' };
    }

    // 各テーブルの検証
    for (let i = 0; i < data.tables.length; i++) {
        const table = data.tables[i];
        if (!table.id || !table.type || !table.position || !table.properties) {
            warnings.push(`テーブル${i + 1}のデータが不完全です`);
        }
    }

    return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
};

/**
 * LocalStorageへの自動保存
 */
export const autoSaveProject = (
    tables: TableObject[],
    svgData: SVGData | null,
    projectName: string
): void => {
    try {
        const projectData = exportProjectToJSON(tables, svgData, projectName);
        localStorage.setItem('venue-layout-autosave', JSON.stringify(projectData));
        localStorage.setItem('venue-layout-autosave-timestamp', new Date().toISOString());
    } catch (error) {
        console.warn('自動保存に失敗しました:', error);
    }
};

/**
 * LocalStorageからの自動保存データ読み込み
 */
export const loadAutoSavedProject = (): ProjectData | null => {
    try {
        const savedData = localStorage.getItem('venue-layout-autosave');
        if (!savedData) return null;

        const projectData = JSON.parse(savedData) as ProjectData;
        const validationResult = validateProjectData(projectData);

        if (validationResult.isValid) {
            return projectData;
        }
        return null;
    } catch (error) {
        console.warn('自動保存データの読み込みに失敗しました:', error);
        return null;
    }
};

/**
 * 自動保存データの削除
 */
export const clearAutoSavedProject = (): void => {
    localStorage.removeItem('venue-layout-autosave');
    localStorage.removeItem('venue-layout-autosave-timestamp');
};

/**
 * 自動保存データの存在確認
 */
export const hasAutoSavedProject = (): boolean => {
    return localStorage.getItem('venue-layout-autosave') !== null;
};