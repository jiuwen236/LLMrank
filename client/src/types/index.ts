// Core data types
export interface Model {
  id: string;
  name: string;
  fullName?: string;
  apiName?: string;
  isHidden: boolean;
  sortOrder: number;
  showInColumn: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Dataset {
  id: string;
  name: string;
  fullName: string;
  notes?: string;
  category?: string;
  isHidden: boolean;
  sortOrder: number;
  isModelInfo: boolean;
  showInModel: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataPoint {
  id: string;
  modelId: string;
  datasetId: string;
  value?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserTable {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  isDefault: boolean;
  modelsData: Model[];
  datasetsData: Dataset[];
  dataPointsData: DataPoint[];
  createdAt: string;
  updatedAt: string;
}

// UI state types
export interface TableState {
  models: Model[];
  datasets: Dataset[];
  dataPoints: DataPoint[];
  hiddenModels: Set<string>;
  hiddenDatasets: Set<string>;
  modelOrder: string[];
  datasetOrder: string[];
  isLoading: boolean;
  error?: string;
  currentUserId?: string;
}

export interface EditingCell {
  modelId: string;
  datasetId: string;
  value: string;
  notes: string;
}

// Language types
export type Language = 'zh' | 'en';

// Theme types
export type Theme = 'light' | 'dark';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  isAdmin?: boolean;
}
