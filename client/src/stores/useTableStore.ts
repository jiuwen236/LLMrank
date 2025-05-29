import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Model,
  Dataset,
  DataPoint,
  TableState,
  Language,
  Theme,
} from '../types';

interface TableStore extends TableState {
  // Language state
  language: Language;
  setLanguage: (lang: Language) => void;
  isLanguageManuallySet: boolean; // Track if user manually set language

  // Theme state
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isThemeManuallySet: boolean; // Track if user manually set theme

  // Data loading
  loadData: () => Promise<void>;
  loadUserTable: (userId: string) => Promise<void>;
  loadDefaultTable: () => Promise<void>;
  restoreDefaultSettings: () => Promise<void>;
  clearUserData: () => Promise<void>;

  // Model operations
  reorderModels: (newOrder: string[]) => void;
  toggleModelVisibility: (modelId: string) => void;
  showHiddenModels: (modelIds: string[]) => void;
  updateModel: (modelId: string, updates: Partial<Model>) => void;
  addModel: (model: Omit<Model, 'id'>) => Promise<void>;

  // Dataset operations
  reorderDatasets: (newOrder: string[]) => void;
  toggleDatasetVisibility: (datasetId: string) => void;
  showHiddenDatasets: (datasetIds: string[]) => void;
  updateDataset: (datasetId: string, updates: Partial<Dataset>) => void;
  addDataset: (dataset: Omit<Dataset, 'id'>) => Promise<void>;

  // Data editing
  updateDataPoint: (
    modelId: string,
    datasetId: string,
    value: string,
    notes?: string
  ) => void;

  // User table operations
  saveUserTable: (userId: string, password?: string) => Promise<boolean>;

  // Utility
  getDataPoint: (modelId: string, datasetId: string) => DataPoint | undefined;
  getModelInfoDataPoint: (
    modelId: string,
    infoType: string
  ) => DataPoint | undefined;
  getVisibleModels: () => Model[];
  getVisibleDatasets: () => Dataset[];
  getModelInfoDatasets: () => Dataset[];
  getAllVisibleDatasets: () => Dataset[];
}

const API_BASE = 'http://124.221.176.216:3000';

// Function to detect system theme preference
const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light'; // fallback
};

// Function to detect system language preference
const getSystemLanguage = (): Language => {
  if (typeof window !== 'undefined' && navigator.language) {
    // Check the primary language tag (before any hyphen)
    const primaryLang = navigator.language.toLowerCase().split('-')[0];
    // Return 'zh' for Chinese variants, 'en' for everything else (default)
    return primaryLang === 'zh' ? 'zh' : 'en';
  }
  return 'en'; // fallback to English for international accessibility
};

export const useTableStore = create<TableStore>()(
  persist(
    (set, get) => ({
      // Initial state
      models: [],
      datasets: [],
      dataPoints: [],
      hiddenModels: new Set(),
      hiddenDatasets: new Set(),
      modelOrder: [],
      datasetOrder: [],
      isLoading: false,
      error: undefined,
      language: getSystemLanguage(),
      isLanguageManuallySet: false, // Initially not manually set
      theme: getSystemTheme(), // Use system theme as default
      isThemeManuallySet: false, // Initially not manually set
      currentUserId: undefined,

      // Language operations
      setLanguage: (lang: Language) => {
        set({ language: lang, isLanguageManuallySet: true });
      },

      // Theme operations
      setTheme: (theme: Theme) => {
        set({ theme, isThemeManuallySet: true });
        // Apply theme to document body
        document.body.setAttribute('data-theme', theme);
      },

      // Load data from API (default table or current database)
      loadData: async () => {
        set({ isLoading: true, error: undefined });

        try {
          // Try to load user's saved table first
          const { currentUserId } = get();
          if (currentUserId) {
            try {
              await get().loadUserTable(currentUserId);
              return;
            } catch {
              // If user table fails, fall back to default
            }
          }

          // Load default table or current database
          await get().loadDefaultTable();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Load user table
      loadUserTable: async (userId: string) => {
        const response = await fetch(`${API_BASE}/api/user-tables/${userId}`);

        if (!response.ok) {
          throw new Error('User table not found');
        }

        const { data: userTable } = await response.json();

        // Get latest default data to check for missing items
        let defaultData = null;
        try {
          const defaultResponse = await fetch(
            `${API_BASE}/api/user-tables/default`
          );
          if (defaultResponse.ok) {
            const { data } = await defaultResponse.json();
            defaultData = data;
          }
        } catch {
          // Fallback to individual APIs
          try {
            const [modelsRes, datasetsRes, dataPointsRes] = await Promise.all([
              fetch(`${API_BASE}/api/models`),
              fetch(`${API_BASE}/api/datasets`),
              fetch(`${API_BASE}/api/data-points`),
            ]);

            if (modelsRes.ok && datasetsRes.ok && dataPointsRes.ok) {
              const [modelsData, datasetsData, dataPointsData] =
                await Promise.all([
                  modelsRes.json(),
                  datasetsRes.json(),
                  dataPointsRes.json(),
                ]);
              defaultData = {
                modelsData: modelsData.data || [],
                datasetsData: datasetsData.data || [],
                dataPointsData: dataPointsData.data || [],
                modelOrder: (modelsData.data || []).map((m: Model) => m.id),
                datasetOrder: (datasetsData.data || []).map(
                  (d: Dataset) => d.id
                ),
                hiddenModels: [],
                hiddenDatasets: [],
              };
            }
          } catch (error) {
            console.warn('Failed to fetch default data for merging:', error);
          }
        }

        // Merge with default data if available
        let mergedData = userTable;
        if (defaultData) {
          // Check for missing models
          const userModelIds = new Set(
            userTable.modelsData.map((m: Model) => m.id)
          );
          const newModels = defaultData.modelsData.filter(
            (m: Model) => !userModelIds.has(m.id)
          );

          // Check for missing datasets
          const userDatasetIds = new Set(
            userTable.datasetsData.map((d: Dataset) => d.id)
          );
          const newDatasets = defaultData.datasetsData.filter(
            (d: Dataset) => !userDatasetIds.has(d.id)
          );

          // Check for missing data points
          const userDataPointIds = new Set(
            userTable.dataPointsData.map((dp: DataPoint) => dp.id)
          );
          const newDataPoints = defaultData.dataPointsData.filter(
            (dp: DataPoint) => !userDataPointIds.has(dp.id)
          );

          // Merge the data (preserve user's order but add new items)
          mergedData = {
            ...userTable,
            modelsData: [...userTable.modelsData, ...newModels],
            datasetsData: [...userTable.datasetsData, ...newDatasets],
            dataPointsData: [...userTable.dataPointsData, ...newDataPoints],
            // Preserve user's order but add new items to the end
            modelOrder: [
              ...userTable.modelOrder,
              ...newModels.map((m: Model) => m.id),
            ],
            datasetOrder: [
              ...userTable.datasetOrder,
              ...newDatasets.map((d: Dataset) => d.id),
            ],
          };
        }

        set({
          models: mergedData.modelsData,
          datasets: mergedData.datasetsData,
          dataPoints: mergedData.dataPointsData,
          modelOrder: mergedData.modelOrder,
          datasetOrder: mergedData.datasetOrder,
          hiddenModels: new Set(mergedData.hiddenModels),
          hiddenDatasets: new Set(mergedData.hiddenDatasets),
          currentUserId: userId,
          isLoading: false,
        });
      },

      // Load default table
      loadDefaultTable: async () => {
        try {
          // Try to load admin's default table first
          const defaultResponse = await fetch(
            `${API_BASE}/api/user-tables/default`
          );

          if (defaultResponse.ok) {
            const { data: defaultTable } = await defaultResponse.json();

            set({
              models: defaultTable.modelsData,
              datasets: defaultTable.datasetsData,
              dataPoints: defaultTable.dataPointsData,
              modelOrder: defaultTable.modelOrder,
              datasetOrder: defaultTable.datasetOrder,
              hiddenModels: new Set(defaultTable.hiddenModels),
              hiddenDatasets: new Set(defaultTable.hiddenDatasets),
              isLoading: false,
            });
            return;
          }
        } catch {
          // Fall back to loading from individual APIs
        }

        // Fallback: load from individual APIs
        const [modelsRes, datasetsRes, dataPointsRes] = await Promise.all([
          fetch(`${API_BASE}/api/models`),
          fetch(`${API_BASE}/api/datasets`),
          fetch(`${API_BASE}/api/data-points`),
        ]);

        if (!modelsRes.ok || !datasetsRes.ok || !dataPointsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [modelsData, datasetsData, dataPointsData] = await Promise.all([
          modelsRes.json(),
          datasetsRes.json(),
          dataPointsRes.json(),
        ]);

        const models = modelsData.data || [];
        const datasets = datasetsData.data || [];
        const dataPoints = dataPointsData.data || [];

        // Initialize order arrays if empty
        const currentState = get();
        const modelOrder =
          currentState.modelOrder.length > 0
            ? currentState.modelOrder
            : models.map((m: Model) => m.id);
        const datasetOrder =
          currentState.datasetOrder.length > 0
            ? currentState.datasetOrder
            : datasets.map((d: Dataset) => d.id);

        set({
          models,
          datasets,
          dataPoints,
          modelOrder,
          datasetOrder,
          isLoading: false,
        });
      },

      // Restore default settings
      restoreDefaultSettings: async () => {
        set({ isLoading: true, error: undefined });

        try {
          const { currentUserId } = get();

          if (currentUserId) {
            // If user is logged in, call backend API to reset user table
            const response = await fetch(
              `${API_BASE}/api/user-tables/${currentUserId}/reset`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
              }
            );

            if (!response.ok) {
              throw new Error('Failed to reset user table');
            }

            const { data: resetTable } = await response.json();

            // Update state with reset data from backend
            set({
              models: resetTable.modelsData,
              datasets: resetTable.datasetsData,
              dataPoints: resetTable.dataPointsData,
              modelOrder: resetTable.modelOrder,
              datasetOrder: resetTable.datasetOrder,
              hiddenModels: new Set(resetTable.hiddenModels),
              hiddenDatasets: new Set(resetTable.hiddenDatasets),
              isLoading: false,
            });
          } else {
            // If no user is logged in, just load default table and filter locally
            // Clear local state
            set({
              hiddenModels: new Set(),
              hiddenDatasets: new Set(),
              modelOrder: [],
              datasetOrder: [],
            });

            // Load default table
            await get().loadDefaultTable();

            // Filter out user-added models and datasets (ID >= 100)
            const { models, datasets, dataPoints, modelOrder, datasetOrder } =
              get();

            const filteredModels = models.filter(model => {
              const modelId = parseInt(model.id);
              return isNaN(modelId) || modelId < 100;
            });

            const filteredDatasets = datasets.filter(dataset => {
              const datasetId = parseInt(dataset.id);
              return isNaN(datasetId) || datasetId < 100;
            });

            const remainingModelIds = new Set(filteredModels.map(m => m.id));
            const remainingDatasetIds = new Set(
              filteredDatasets.map(d => d.id)
            );

            const filteredDataPoints = dataPoints.filter(
              dp =>
                remainingModelIds.has(dp.modelId) &&
                remainingDatasetIds.has(dp.datasetId)
            );

            const filteredModelOrder = modelOrder.filter(id =>
              remainingModelIds.has(id)
            );
            const filteredDatasetOrder = datasetOrder.filter(id =>
              remainingDatasetIds.has(id)
            );

            set({
              models: filteredModels,
              datasets: filteredDatasets,
              dataPoints: filteredDataPoints,
              modelOrder: filteredModelOrder,
              datasetOrder: filteredDatasetOrder,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to restore default settings',
            isLoading: false,
          });
        }
      },

      // Clear user data (logout)
      clearUserData: async () => {
        set({ isLoading: true, error: undefined });

        try {
          const { currentUserId } = get();

          // Clear user ID and admin password from session and local storage
          set({ currentUserId: undefined });
          sessionStorage.removeItem('adminPassword');

          // Reset local state
          set({
            hiddenModels: new Set(),
            hiddenDatasets: new Set(),
            modelOrder: [],
            datasetOrder: [],
          });

          if (currentUserId) {
            // If user was logged in, reset their table data in backend
            try {
              const response = await fetch(
                `${API_BASE}/api/user-tables/${currentUserId}/reset`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                }
              );

              if (response.ok) {
                const { data: resetTable } = await response.json();

                // Update state with reset data from backend
                set({
                  models: resetTable.modelsData,
                  datasets: resetTable.datasetsData,
                  dataPoints: resetTable.dataPointsData,
                  modelOrder: resetTable.modelOrder,
                  datasetOrder: resetTable.datasetOrder,
                  hiddenModels: new Set(resetTable.hiddenModels),
                  hiddenDatasets: new Set(resetTable.hiddenDatasets),
                  isLoading: false,
                });
                return;
              }
            } catch (error) {
              console.warn(
                'Failed to reset user table on logout, falling back to default table:',
                error
              );
            }
          }

          // Fallback: Load default table and filter locally
          await get().loadDefaultTable();

          // Filter out user-added models and datasets (ID >= 100)
          const { models, datasets, dataPoints, modelOrder, datasetOrder } =
            get();

          const filteredModels = models.filter(model => {
            const modelId = parseInt(model.id);
            return isNaN(modelId) || modelId < 100;
          });

          const filteredDatasets = datasets.filter(dataset => {
            const datasetId = parseInt(dataset.id);
            return isNaN(datasetId) || datasetId < 100;
          });

          const remainingModelIds = new Set(filteredModels.map(m => m.id));
          const remainingDatasetIds = new Set(filteredDatasets.map(d => d.id));

          const filteredDataPoints = dataPoints.filter(
            dp =>
              remainingModelIds.has(dp.modelId) &&
              remainingDatasetIds.has(dp.datasetId)
          );

          const filteredModelOrder = modelOrder.filter(id =>
            remainingModelIds.has(id)
          );
          const filteredDatasetOrder = datasetOrder.filter(id =>
            remainingDatasetIds.has(id)
          );

          set({
            models: filteredModels,
            datasets: filteredDatasets,
            dataPoints: filteredDataPoints,
            modelOrder: filteredModelOrder,
            datasetOrder: filteredDatasetOrder,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to clear user data',
            isLoading: false,
          });
        }
      },

      // Model operations
      reorderModels: (newOrder: string[]) => {
        const { models } = get();

        // Update models with new sortOrder based on the new order
        const updatedModels = models.map(model => ({
          ...model,
          sortOrder:
            newOrder.indexOf(model.id) >= 0 ? newOrder.indexOf(model.id) : 999,
        }));

        set({
          modelOrder: newOrder,
          models: updatedModels,
        });
      },

      toggleModelVisibility: (modelId: string) => {
        const { hiddenModels } = get();
        const newHidden = new Set(hiddenModels);

        if (newHidden.has(modelId)) {
          newHidden.delete(modelId);
        } else {
          newHidden.add(modelId);
        }

        set({ hiddenModels: newHidden });
      },

      showHiddenModels: (modelIds: string[]) => {
        const { hiddenModels, models } = get();
        const newHidden = new Set(hiddenModels);

        // For each model to show, remove it from hidden set
        modelIds.forEach(id => {
          newHidden.delete(id);

          // If the model is default hidden (isHidden: true), we need to override it
          // by updating the model's isHidden property to false
          const model = models.find(m => m.id === id);
          if (model && model.isHidden) {
            const newModels = models.map(m =>
              m.id === id ? { ...m, isHidden: false } : m
            );
            set({ models: newModels });
          }
        });

        set({ hiddenModels: newHidden });
      },

      updateModel: (modelId: string, updates: Partial<Model>) => {
        const { models } = get();
        const newModels = models.map(m =>
          m.id === modelId
            ? {
                ...m,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : m
        );
        set({ models: newModels });
      },

      addModel: async (model: Omit<Model, 'id'>) => {
        const { models, modelOrder, datasets, dataPoints } = get();

        const createNewModelData = (id: string) => {
          const now = new Date().toISOString();
          const newModel = {
            ...model,
            id,
            createdAt: now,
            updatedAt: now,
          };

          // Create data points for this new model for all existing datasets
          const newDataPoints: DataPoint[] = datasets.map(dataset => ({
            id: `${id}_${dataset.id}`,
            modelId: id,
            datasetId: dataset.id,
            value: '',
            notes: '',
            createdAt: now,
            updatedAt: now,
          }));

          return {
            newModel,
            newDataPoints,
          };
        };

        try {
          // Get next available ID from server
          const response = await fetch(`${API_BASE}/api/max-ids`);
          const { data } = await response.json();
          const { newModel, newDataPoints } = createNewModelData(
            data.nextModelId.toString()
          );

          set({
            models: [...models, newModel],
            modelOrder: [...modelOrder, newModel.id],
            dataPoints: [...dataPoints, ...newDataPoints],
          });
        } catch (error) {
          console.error('Error getting next model ID:', error);
          // Fallback to timestamp-based ID
          const { newModel, newDataPoints } = createNewModelData(
            `model_${Date.now()}`
          );

          set({
            models: [...models, newModel],
            modelOrder: [...modelOrder, newModel.id],
            dataPoints: [...dataPoints, ...newDataPoints],
          });
        }
      },

      // Dataset operations
      reorderDatasets: (newOrder: string[]) => {
        const { datasets } = get();

        // Update datasets with new sortOrder based on the new order
        const updatedDatasets = datasets.map(dataset => ({
          ...dataset,
          sortOrder:
            newOrder.indexOf(dataset.id) >= 0
              ? newOrder.indexOf(dataset.id)
              : 999,
        }));

        set({
          datasetOrder: newOrder,
          datasets: updatedDatasets,
        });
      },

      toggleDatasetVisibility: (datasetId: string) => {
        const { hiddenDatasets } = get();
        const newHidden = new Set(hiddenDatasets);

        if (newHidden.has(datasetId)) {
          newHidden.delete(datasetId);
        } else {
          newHidden.add(datasetId);
        }

        set({ hiddenDatasets: newHidden });
      },

      showHiddenDatasets: (datasetIds: string[]) => {
        const { hiddenDatasets, datasets } = get();
        const newHidden = new Set(hiddenDatasets);

        // For each dataset to show, remove it from hidden set
        datasetIds.forEach(id => {
          newHidden.delete(id);

          // If the dataset is default hidden (isHidden: true), we need to override it
          // by updating the dataset's isHidden property to false
          const dataset = datasets.find(d => d.id === id);
          if (dataset && dataset.isHidden) {
            const newDatasets = datasets.map(d =>
              d.id === id ? { ...d, isHidden: false } : d
            );
            set({ datasets: newDatasets });
          }
        });

        set({ hiddenDatasets: newHidden });
      },

      updateDataset: (datasetId: string, updates: Partial<Dataset>) => {
        const { datasets } = get();
        const newDatasets = datasets.map(d =>
          d.id === datasetId
            ? {
                ...d,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : d
        );
        set({ datasets: newDatasets });
      },

      addDataset: async (dataset: Omit<Dataset, 'id'>) => {
        try {
          // Get next available ID from server
          const response = await fetch(`${API_BASE}/api/max-ids`);
          const { data } = await response.json();
          const newId = data.nextDatasetId.toString();

          const { datasets, datasetOrder, models, dataPoints } = get();
          const now = new Date().toISOString();
          const newDataset = {
            ...dataset,
            id: newId,
            createdAt: now,
            updatedAt: now,
          };

          // Create data points for this new dataset for all existing models
          const newDataPoints: DataPoint[] = [];
          models.forEach(model => {
            // Create empty data point for each model
            const dataPointId = `${model.id}_${newId}`;
            newDataPoints.push({
              id: dataPointId,
              modelId: model.id,
              datasetId: newId,
              value: '',
              notes: '',
              createdAt: now,
              updatedAt: now,
            });
          });

          set({
            datasets: [...datasets, newDataset],
            datasetOrder: [...datasetOrder, newId],
            dataPoints: [...dataPoints, ...newDataPoints],
          });
        } catch (error) {
          console.error('Error getting next dataset ID:', error);
          // Fallback to timestamp-based ID
          const { datasets, datasetOrder, models, dataPoints } = get();
          const newId = `dataset_${Date.now()}`;
          const now = new Date().toISOString();
          const newDataset = {
            ...dataset,
            id: newId,
            createdAt: now,
            updatedAt: now,
          };

          // Create data points for this new dataset for all existing models
          const newDataPoints: DataPoint[] = [];
          models.forEach(model => {
            // Create empty data point for each model
            const dataPointId = `${model.id}_${newId}`;
            newDataPoints.push({
              id: dataPointId,
              modelId: model.id,
              datasetId: newId,
              value: '',
              notes: '',
              createdAt: now,
              updatedAt: now,
            });
          });

          set({
            datasets: [...datasets, newDataset],
            datasetOrder: [...datasetOrder, newId],
            dataPoints: [...dataPoints, ...newDataPoints],
          });
        }
      },

      // Data editing
      updateDataPoint: (
        modelId: string,
        datasetId: string,
        value: string,
        notes?: string
      ) => {
        const { dataPoints } = get();
        const existingIndex = dataPoints.findIndex(
          dp => dp.modelId === modelId && dp.datasetId === datasetId
        );

        if (existingIndex >= 0) {
          const newDataPoints = [...dataPoints];
          newDataPoints[existingIndex] = {
            ...newDataPoints[existingIndex],
            value,
            notes,
            updatedAt: new Date().toISOString(),
          };
          set({ dataPoints: newDataPoints });
        } else {
          const now = new Date().toISOString();
          const newDataPoint: DataPoint = {
            id: `${modelId}_${datasetId}`,
            modelId,
            datasetId,
            value,
            notes,
            createdAt: now,
            updatedAt: now,
          };
          set({ dataPoints: [...dataPoints, newDataPoint] });
        }
      },

      // User table operations
      saveUserTable: async (userId: string, password?: string) => {
        const {
          models,
          datasets,
          dataPoints,
          modelOrder,
          datasetOrder,
          hiddenModels,
          hiddenDatasets,
        } = get();

        // Apply order and hidden info to data arrays before saving
        const modelsWithOrder = models.map(model => ({
          ...model,
          sortOrder:
            modelOrder.indexOf(model.id) >= 0
              ? modelOrder.indexOf(model.id)
              : 999,
          isHidden: hiddenModels.has(model.id) || model.isHidden,
        }));

        const datasetsWithOrder = datasets.map(dataset => ({
          ...dataset,
          sortOrder:
            datasetOrder.indexOf(dataset.id) >= 0
              ? datasetOrder.indexOf(dataset.id)
              : 999,
          isHidden: hiddenDatasets.has(dataset.id) || dataset.isHidden,
        }));

        try {
          const response = await fetch(`${API_BASE}/api/user-tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              password,
              modelsData: modelsWithOrder,
              datasetsData: datasetsWithOrder,
              dataPointsData: dataPoints,
              modelOrder,
              datasetOrder,
              hiddenModels: Array.from(hiddenModels),
              hiddenDatasets: Array.from(hiddenDatasets),
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save user table');
          }

          const result = await response.json();

          set({ currentUserId: userId });

          return result.isAdmin || false;
        } catch (error) {
          console.error('保存表格时出错:', error);
          set({
            error: error instanceof Error ? error.message : 'Save failed',
          });
          return false;
        }
      },

      // Utility functions
      getDataPoint: (modelId: string, datasetId: string) => {
        const { dataPoints } = get();
        // Convert IDs to string for comparison to handle numeric IDs from backend
        return dataPoints.find(
          dp =>
            dp.modelId.toString() === modelId.toString() &&
            dp.datasetId.toString() === datasetId.toString()
        );
      },

      getModelInfoDataPoint: (modelId: string, infoType: string) => {
        const { datasets, dataPoints } = get();
        const infoDataset = datasets.find(
          d => d.isModelInfo && d.name === infoType
        );
        if (!infoDataset) return undefined;

        return dataPoints.find(
          dp => dp.modelId === modelId && dp.datasetId === infoDataset.id
        );
      },

      getVisibleModels: () => {
        const { models, hiddenModels, modelOrder } = get();
        // Show model if it's not in user hidden set, not hidden by isHidden property, AND not a permanent control field (id < 10)
        const visibleModels = models.filter(m => {
          const isControlField = parseInt(m.id) < 10 && !isNaN(parseInt(m.id));
          return !hiddenModels.has(m.id) && !m.isHidden && !isControlField;
        });

        return visibleModels.sort((a, b) => {
          const aIndex = modelOrder.indexOf(a.id);
          const bIndex = modelOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      },

      getVisibleDatasets: () => {
        const { datasets, hiddenDatasets, datasetOrder } = get();
        // Show dataset if it's not in user hidden set, not hidden by isHidden property, not a model info, AND not a permanent control field (id < 10)
        const visibleDatasets = datasets.filter(d => {
          const isControlField = parseInt(d.id) < 10 && !isNaN(parseInt(d.id));
          return (
            !hiddenDatasets.has(d.id) &&
            !d.isHidden &&
            !d.isModelInfo &&
            !isControlField
          );
        });

        return visibleDatasets.sort((a, b) => {
          const aIndex = datasetOrder.indexOf(a.id);
          const bIndex = datasetOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return a.sortOrder - b.sortOrder;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      },

      getModelInfoDatasets: () => {
        const { datasets, hiddenDatasets, datasetOrder } = get();
        // Show model info dataset if it's not in user hidden set, not hidden by isHidden property, is model info, AND not a permanent control field (id < 10)
        const modelInfoDatasets = datasets.filter(d => {
          const isControlField = parseInt(d.id) < 10 && !isNaN(parseInt(d.id));
          return (
            !hiddenDatasets.has(d.id) &&
            !d.isHidden &&
            d.isModelInfo &&
            !isControlField
          );
        });

        return modelInfoDatasets.sort((a, b) => {
          const aIndex = datasetOrder.indexOf(a.id);
          const bIndex = datasetOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return a.sortOrder - b.sortOrder;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      },

      getAllVisibleDatasets: () => {
        const { datasets, hiddenDatasets, datasetOrder } = get();
        // Show all datasets if they're not in user hidden set, not hidden by isHidden property, AND not a permanent control field (id < 10)
        const visibleDatasets = datasets.filter(d => {
          const isControlField = parseInt(d.id) < 10 && !isNaN(parseInt(d.id));
          return !hiddenDatasets.has(d.id) && !d.isHidden && !isControlField;
        });

        return visibleDatasets.sort((a, b) => {
          const aIndex = datasetOrder.indexOf(a.id);
          const bIndex = datasetOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return a.sortOrder - b.sortOrder;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      },
    }),
    {
      name: 'llm-ranking-store',
      partialize: state => ({
        language: state.language,
        isLanguageManuallySet: state.isLanguageManuallySet,
        theme: state.theme,
        isThemeManuallySet: state.isThemeManuallySet,
        hiddenModels: Array.from(state.hiddenModels),
        hiddenDatasets: Array.from(state.hiddenDatasets),
        modelOrder: state.modelOrder,
        datasetOrder: state.datasetOrder,
        currentUserId: state.currentUserId,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          // Convert arrays back to Sets
          state.hiddenModels = new Set(state.hiddenModels as any);
          state.hiddenDatasets = new Set(state.hiddenDatasets as any);

          // Handle language: if not manually set, use system language
          if (!state.isLanguageManuallySet) {
            state.language = getSystemLanguage();
          }

          // Apply theme to document body on rehydration
          // If no theme is saved, use system theme
          const themeToUse = state.theme || getSystemTheme();
          state.theme = themeToUse;
          document.body.setAttribute('data-theme', themeToUse);
        } else {
          // First time visit - use system theme and language
          const systemTheme = getSystemTheme();
          document.body.setAttribute('data-theme', systemTheme);
        }
      },
    }
  )
);
