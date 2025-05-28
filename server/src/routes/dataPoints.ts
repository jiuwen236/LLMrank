import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/data-points - Get all data points
router.get('/', async (_req, res) => {
  try {
    const dataPoints = await prisma.dataPoint.findMany({
      include: {
        model: true,
        dataset: true,
      },
    });

    res.json({
      success: true,
      data: dataPoints,
    });
  } catch (error) {
    console.error('Error fetching data points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data points',
    });
  }
});

// GET /api/data-points/:modelId/:datasetId - Get specific data point
router.get('/:modelId/:datasetId', async (req, res) => {
  try {
    const { modelId, datasetId } = req.params;
    const modelIdNum = parseInt(modelId, 10);
    const datasetIdNum = parseInt(datasetId, 10);

    if (isNaN(modelIdNum) || isNaN(datasetIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model ID or dataset ID',
      });
    }

    const dataPoint = await prisma.dataPoint.findUnique({
      where: {
        modelId_datasetId: {
          modelId: modelIdNum,
          datasetId: datasetIdNum,
        },
      },
      include: {
        model: true,
        dataset: true,
      },
    });

    if (!dataPoint) {
      return res.status(404).json({
        success: false,
        error: 'Data point not found',
      });
    }

    return res.json({
      success: true,
      data: dataPoint,
    });
  } catch (error) {
    console.error('Error fetching data point:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch data point',
    });
  }
});

// PUT /api/data-points/:modelId/:datasetId - Update or create data point
router.put('/:modelId/:datasetId', async (req, res) => {
  try {
    const { modelId, datasetId } = req.params;
    const { value, notes } = req.body;

    // Generate ID in "modelId_datasetId" format
    const dataPointId = `${modelId}_${datasetId}`;

    const dataPoint = await prisma.dataPoint.upsert({
      where: {
        id: dataPointId,
      },
      update: {
        value,
        notes,
      },
      create: {
        id: dataPointId,
        modelId: parseInt(modelId),
        datasetId: parseInt(datasetId),
        value,
        notes,
      },
    });

    res.json({
      success: true,
      data: dataPoint,
    });
  } catch (error) {
    console.error('Error updating data point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update data point',
    });
  }
});

// DELETE /api/data-points/:modelId/:datasetId - Delete data point
router.delete('/:modelId/:datasetId', async (req, res) => {
  try {
    const { modelId, datasetId } = req.params;
    const dataPointId = `${modelId}_${datasetId}`;

    await prisma.dataPoint.delete({
      where: {
        id: dataPointId,
      },
    });

    res.json({
      success: true,
      message: 'Data point deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting data point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete data point',
    });
  }
});

export default router;
