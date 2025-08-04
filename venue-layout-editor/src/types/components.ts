/**
 * コンポーネントのProps型定義
 */

import type { VenueData, SVGData, TableObject, Position } from './index';

export interface VenueLayoutEditorProps {
  initialVenue?: VenueData;
  onSave?: (venueData: VenueData) => void;
  onExport?: (format: 'json' | 'svg') => void;
}

export interface SVGLoaderProps {
  onSVGLoad: (svgData: SVGData) => void;
  onError: (error: string) => void;
}

export interface VenueCanvasProps {
  svgData: SVGData | null;
  tables: TableObject[];
  selectedTableId: string | null;
  onTableSelect: (id: string | null) => void;
  onTableMove: (id: string, position: Position) => void;
  onTableAdd: (table: TableObject) => void;
  scale: number;
  onScaleChange: (newScale: number) => void;
  placementMode?: {
    active: boolean;
    tableType: 'rectangle' | 'circle';
    tableProps: any;
  } | null;
  onPlacementModeChange?: (mode: { active: boolean; tableType: 'rectangle' | 'circle'; tableProps: any } | null) => void;
}

export interface TableToolbarProps {
  onCreateTable: (type: 'rectangle' | 'circle', props: any) => void;
  selectedTable: TableObject | null;
  onUpdateTable: (id: string, props: Partial<any>) => void;
}

export interface MeasurementDisplayProps {
  scale: number;
  selectedTable?: TableObject | null;
}