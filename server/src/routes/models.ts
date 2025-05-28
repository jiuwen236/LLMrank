import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/models - Get all models
router.get('/', async (_req, res) => {
  try {
    const models = await prisma.model.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models',
    });
  }
});

// GET /api/models/:id - Get single model
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const modelId = parseInt(id, 10);

    if (isNaN(modelId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model ID',
      });
    }

    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
      });
    }

    return res.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model',
    });
  }
});

// PUT /api/models/:id - Update model
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const model = await prisma.model.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model',
    });
  }
});

export default router;
