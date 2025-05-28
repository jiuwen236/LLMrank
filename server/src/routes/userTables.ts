import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validate user ID format
 * Allow regular characters including Chinese, letters, numbers, and some safe special characters
 * Exclude dangerous characters and whitespace
 */
function isValidUserId(userId: string): boolean {
  // Length check
  if (userId.trim().length < 2 || userId.length > 50) {
    return false;
  }

  // Check for leading or trailing spaces
  if (userId !== userId.trim()) {
    return false;
  }

  // Check for dangerous characters that could cause issues
  // Exclude tabs, newlines, and potentially dangerous characters for file systems/URLs
  const dangerousChars = /[\t\n\r\/<>:"|*?\\]/;
  if (dangerousChars.test(userId)) {
    return false;
  }

  return true;
}

// Types for the map functions
type ModelData = {
  id: any;
  name: any;
  isHidden: any;
  isModel: any;
  sortOrder: any;
  showInColumn: any;
  createdAt: any;
  updatedAt: any;
};

type DatasetData = {
  id: any;
  name: any;
  fullName: any;
  isHidden: any;
  notes: any;
  sortOrder: any;
  isModelInfo: any;
  showInModel: any;
  createdAt: any;
  updatedAt: any;
};

type DataPointData = {
  id: any;
  modelId: any;
  datasetId: any;
  value: any;
  notes: any;
};

// Helper functions to extract order and hidden info from data arrays
function extractModelOrder(modelsData: any[]): string[] {
  return modelsData
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(m => m.id);
}

function extractDatasetOrder(datasetsData: any[]): string[] {
  return datasetsData
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(d => d.id);
}

function extractHiddenModels(modelsData: any[]): string[] {
  return modelsData.filter(m => m.isHidden).map(m => m.id);
}

function extractHiddenDatasets(datasetsData: any[]): string[] {
  return datasetsData.filter(d => d.isHidden).map(d => d.id);
}

// Helper function to apply order and hidden info to data arrays
function applyModelOrder(modelsData: any[], modelOrder: string[]): any[] {
  return modelsData.map(model => ({
    ...model,
    sortOrder:
      modelOrder.indexOf(model.id) >= 0 ? modelOrder.indexOf(model.id) : 999,
  }));
}

function applyDatasetOrder(datasetsData: any[], datasetOrder: string[]): any[] {
  return datasetsData.map(dataset => ({
    ...dataset,
    sortOrder:
      datasetOrder.indexOf(dataset.id) >= 0
        ? datasetOrder.indexOf(dataset.id)
        : 999,
  }));
}

function applyHiddenModels(modelsData: any[], hiddenModels: string[]): any[] {
  return modelsData.map(model => ({
    ...model,
    isHidden: hiddenModels.includes(model.id) || model.isHidden,
  }));
}

function applyHiddenDatasets(
  datasetsData: any[],
  hiddenDatasets: string[]
): any[] {
  return datasetsData.map(dataset => ({
    ...dataset,
    isHidden: hiddenDatasets.includes(dataset.id) || dataset.isHidden,
  }));
}

// Helper function to sync UserTable data to main database tables
async function syncUserTableToDatabase(
  modelsData: any[],
  datasetsData: any[],
  dataPointsData: any[]
) {
  try {
    // Use transaction to ensure data consistency
    await prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          | '$connect'
          | '$disconnect'
          | '$on'
          | '$transaction'
          | '$use'
          | '$extends'
        >
      ) => {
        // 1. Sync Models - clear existing and insert new data
        await tx.model.deleteMany({});
        for (const model of modelsData) {
          await tx.model.create({
            data: {
              id: parseInt(model.id), // Convert string ID to integer
              name: model.name,
              isHidden: model.isHidden || false,
              isModel: model.isModel !== false, // default true unless explicitly false
              sortOrder: model.sortOrder || 0,
              showInColumn: model.showInColumn || false,
            },
          });
        }

        // 2. Sync Datasets - clear existing and insert new data
        await tx.dataset.deleteMany({});
        for (const dataset of datasetsData) {
          await tx.dataset.create({
            data: {
              id: parseInt(dataset.id), // Convert string ID to integer
              name: dataset.name,
              fullName: dataset.fullName || dataset.name,
              isHidden: dataset.isHidden || false,
              notes: dataset.notes || null,
              sortOrder: dataset.sortOrder || 0,
              isModelInfo: dataset.isModelInfo || false,
              showInModel: dataset.showInModel || false,
            },
          });
        }

        // 3. Sync DataPoints - clear existing and insert new data
        await tx.dataPoint.deleteMany({});
        for (const dataPoint of dataPointsData) {
          await tx.dataPoint.create({
            data: {
              id: `${dataPoint.modelId}_${dataPoint.datasetId}`,
              modelId: parseInt(dataPoint.modelId), // Convert string ID to integer
              datasetId: parseInt(dataPoint.datasetId), // Convert string ID to integer
              value: dataPoint.value || null,
              notes: dataPoint.notes || null,
            },
          });
        }

        // 4. Update ID counters
        const modelIds = modelsData
          .map(m => parseInt(m.id))
          .filter(id => !isNaN(id));
        const datasetIds = datasetsData
          .map(d => parseInt(d.id))
          .filter(id => !isNaN(id));

        const maxModelId = modelIds.length > 0 ? Math.max(...modelIds, 99) : 99;
        const maxDatasetId =
          datasetIds.length > 0 ? Math.max(...datasetIds, 99) : 99;

        await tx.idCounter.upsert({
          where: { name: 'model' },
          update: { currentValue: maxModelId },
          create: { name: 'model', currentValue: maxModelId },
        });

        await tx.idCounter.upsert({
          where: { name: 'dataset' },
          update: { currentValue: maxDatasetId },
          create: { name: 'dataset', currentValue: maxDatasetId },
        });
      }
    );

    console.log('Successfully synced UserTable data to main database tables');
  } catch (error) {
    console.error('Error syncing UserTable to database:', error);
    throw error;
  }
}

// GET /api/user-tables - Get all user tables (admin only)
router.get('/', async (_req, res) => {
  try {
    const userTables = await prisma.userTable.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: userTables,
    });
  } catch (error) {
    console.error('Error fetching user tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user tables',
    });
  }
});

// GET /api/user-tables/default - Get default table
router.get('/default', async (_req, res) => {
  try {
    const defaultTable = await prisma.userTable.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!defaultTable) {
      return res.status(404).json({
        success: false,
        error: 'Default table not found',
      });
    }

    // Parse JSON fields
    const modelsData = JSON.parse(defaultTable.modelsData);
    const datasetsData = JSON.parse(defaultTable.datasetsData);
    const dataPointsData = JSON.parse(defaultTable.dataPointsData);

    const parsedTable = {
      ...defaultTable,
      modelsData,
      datasetsData,
      dataPointsData,
      // Extract order and hidden info from data arrays for backward compatibility
      modelOrder: extractModelOrder(modelsData),
      datasetOrder: extractDatasetOrder(datasetsData),
      hiddenModels: extractHiddenModels(modelsData),
      hiddenDatasets: extractHiddenDatasets(datasetsData),
    };

    return res.json({
      success: true,
      data: parsedTable,
    });
  } catch (error) {
    console.error('Error fetching default table:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch default table',
    });
  }
});

// GET /api/user-tables/:userId - Get user table
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Validate user ID format
    if (!isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid user ID format. Only letters, numbers, Chinese characters, and safe special characters (. _ -) are allowed. Spaces and special symbols are not permitted.',
      });
    }

    const userTable = await prisma.userTable.findUnique({
      where: { userId },
    });

    if (!userTable) {
      return res.status(404).json({
        success: false,
        error: 'User table not found',
      });
    }

    // Parse JSON fields
    const modelsData = JSON.parse(userTable.modelsData);
    const datasetsData = JSON.parse(userTable.datasetsData);
    const dataPointsData = JSON.parse(userTable.dataPointsData);

    const parsedTable = {
      ...userTable,
      modelsData,
      datasetsData,
      dataPointsData,
      // Extract order and hidden info from data arrays for backward compatibility
      modelOrder: extractModelOrder(modelsData),
      datasetOrder: extractDatasetOrder(datasetsData),
      hiddenModels: extractHiddenModels(modelsData),
      hiddenDatasets: extractHiddenDatasets(datasetsData),
    };

    return res.json({
      success: true,
      data: parsedTable,
    });
  } catch (error) {
    console.error('Error fetching user table:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user table',
    });
  }
});

// POST /api/user-tables - Create or update user table
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      password,
      name,
      description,
      modelsData,
      datasetsData,
      dataPointsData,
      modelOrder,
      datasetOrder,
      hiddenModels,
      hiddenDatasets,
    } = req.body;

    // Validate user ID format
    if (!userId || !isValidUserId(userId)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid user ID format. Only letters, numbers, Chinese characters, and safe special characters (. _ -) are allowed. Spaces and special symbols are not permitted.',
      });
    }

    // Apply order and hidden info to data arrays
    let finalModelsData = modelsData;
    let finalDatasetsData = datasetsData;

    if (modelOrder) {
      finalModelsData = applyModelOrder(finalModelsData, modelOrder);
    }
    if (datasetOrder) {
      finalDatasetsData = applyDatasetOrder(finalDatasetsData, datasetOrder);
    }
    if (hiddenModels) {
      finalModelsData = applyHiddenModels(finalModelsData, hiddenModels);
    }
    if (hiddenDatasets) {
      finalDatasetsData = applyHiddenDatasets(
        finalDatasetsData,
        hiddenDatasets
      );
    }

    // Check if this is admin password
    let isAdmin = false;
    if (password) {
      const adminPasswordRecord = await prisma.adminPassword.findFirst();
      if (adminPasswordRecord) {
        isAdmin = await bcrypt.compare(password, adminPasswordRecord.password);
      }
    }

    const userTable = await prisma.userTable.upsert({
      where: { userId },
      update: {
        name: name || userId,
        description,
        modelsData: JSON.stringify(finalModelsData),
        datasetsData: JSON.stringify(finalDatasetsData),
        dataPointsData: JSON.stringify(dataPointsData),
        isDefault: isAdmin,
      },
      create: {
        userId,
        name: name || userId,
        description,
        modelsData: JSON.stringify(finalModelsData),
        datasetsData: JSON.stringify(finalDatasetsData),
        dataPointsData: JSON.stringify(dataPointsData),
        isDefault: isAdmin,
      },
    });

    // If this is admin, update other tables to not be default
    if (isAdmin) {
      await prisma.userTable.updateMany({
        where: {
          userId: { not: userId },
          isDefault: true,
        },
        data: { isDefault: false },
      });

      // Sync to actual database tables when admin saves
      await syncUserTableToDatabase(
        finalModelsData,
        finalDatasetsData,
        dataPointsData
      );
    }

    return res.json({
      success: true,
      data: userTable,
      isAdmin,
    });
  } catch (error) {
    console.error('Error saving user table:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save user table',
    });
  }
});

// DELETE /api/user-tables/:userId - Delete user table
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deletion of default table
    const userTable = await prisma.userTable.findUnique({
      where: { userId },
    });

    if (userTable?.isDefault) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default table',
      });
    }

    await prisma.userTable.delete({
      where: { userId },
    });

    return res.json({
      success: true,
      message: 'User table deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user table:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user table',
    });
  }
});

// PUT /api/user-tables/:userId/reset - Reset user table to default data
router.put('/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Get default data directly from database tables (like loadDefaultTable fallback)
    const [models, datasets, dataPoints] = await Promise.all([
      prisma.model.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.dataset.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.dataPoint.findMany(),
    ]);

    // Convert database format to user table format
    const modelsData = models.map((model: ModelData) => ({
      id: model.id.toString(),
      name: model.name,
      isHidden: model.isHidden,
      isModel: model.isModel,
      sortOrder: model.sortOrder,
      showInColumn: model.showInColumn,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }));

    const datasetsData = datasets.map((dataset: DatasetData) => ({
      id: dataset.id.toString(),
      name: dataset.name,
      fullName: dataset.fullName,
      isHidden: dataset.isHidden,
      notes: dataset.notes,
      sortOrder: dataset.sortOrder,
      isModelInfo: dataset.isModelInfo,
      showInModel: dataset.showInModel,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    }));

    const dataPointsData = dataPoints.map((dp: DataPointData) => ({
      id: dp.id,
      modelId: dp.modelId.toString(),
      datasetId: dp.datasetId.toString(),
      value: dp.value,
      notes: dp.notes,
    }));

    // Update user table with default data
    const updatedUserTable = await prisma.userTable.upsert({
      where: { userId },
      update: {
        modelsData: JSON.stringify(modelsData),
        datasetsData: JSON.stringify(datasetsData),
        dataPointsData: JSON.stringify(dataPointsData),
        isDefault: false, // User table should not be default
      },
      create: {
        userId,
        name: userId,
        modelsData: JSON.stringify(modelsData),
        datasetsData: JSON.stringify(datasetsData),
        dataPointsData: JSON.stringify(dataPointsData),
        isDefault: false,
      },
    });

    // Return the updated table data with extracted order and hidden info for backward compatibility
    const responseData = {
      ...updatedUserTable,
      modelsData,
      datasetsData,
      dataPointsData,
      modelOrder: extractModelOrder(modelsData),
      datasetOrder: extractDatasetOrder(datasetsData),
      hiddenModels: extractHiddenModels(modelsData),
      hiddenDatasets: extractHiddenDatasets(datasetsData),
    };

    return res.json({
      success: true,
      data: responseData,
      message: 'User table reset to default data successfully',
    });
  } catch (error) {
    console.error('Error resetting user table:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset user table',
    });
  }
});

export default router;
