import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/datasets - Get all datasets
router.get('/', async (_req, res) => {
  try {
    const datasets = await prisma.dataset.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: datasets,
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch datasets',
    });
  }
});

// GET /api/datasets/:id - Get single dataset
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const datasetId = parseInt(id, 10);

    if (isNaN(datasetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dataset ID',
      });
    }

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset not found',
      });
    }

    return res.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dataset',
    });
  }
});

// PUT /api/datasets/:id - Update dataset
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const datasetId = parseInt(id, 10);

    if (isNaN(datasetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dataset ID',
      });
    }

    const updateData = req.body;

    const dataset = await prisma.dataset.update({
      where: { id: datasetId },
      data: updateData,
    });

    return res.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error('Error updating dataset:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update dataset',
    });
  }
});

export default router;
