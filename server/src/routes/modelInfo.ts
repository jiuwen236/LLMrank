import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/model-info - Get all model info (datasets with isModelInfo=true)
router.get('/', async (_req, res) => {
  try {
    const modelInfos = await prisma.dataset.findMany({
      where: { isModelInfo: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: modelInfos,
    });
  } catch (error) {
    console.error('Error fetching model info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model info',
    });
  }
});

// GET /api/model-info/:id - Get specific model info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const modelInfoId = parseInt(id, 10);

    if (isNaN(modelInfoId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model info ID',
      });
    }

    const modelInfo = await prisma.dataset.findUnique({
      where: {
        id: modelInfoId,
        isModelInfo: true,
      },
    });

    if (!modelInfo) {
      return res.status(404).json({
        success: false,
        error: 'Model info not found',
      });
    }

    return res.json({
      success: true,
      data: modelInfo,
    });
  } catch (error) {
    console.error('Error fetching model info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model info',
    });
  }
});

// POST /api/model-info - Create or update model info
router.post('/', async (req, res) => {
  try {
    const { id, name, fullName, notes, sortOrder } = req.body;

    if (id) {
      // Update existing model info
      const modelInfoId = parseInt(id, 10);

      if (isNaN(modelInfoId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid model info ID',
        });
      }

      const modelInfo = await prisma.dataset.update({
        where: { id: modelInfoId },
        data: {
          name,
          fullName,
          notes,
          sortOrder: sortOrder || 0,
        },
      });

      return res.json({
        success: true,
        data: modelInfo,
      });
    } else {
      // Create new model info - need to provide an ID
      if (!req.body.newId) {
        return res.status(400).json({
          success: false,
          error: 'New ID is required for creating model info',
        });
      }

      const newId = parseInt(req.body.newId, 10);
      if (isNaN(newId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid new ID',
        });
      }

      const modelInfo = await prisma.dataset.create({
        data: {
          id: newId,
          name,
          fullName,
          notes,
          sortOrder: sortOrder || 0,
          isModelInfo: true,
        },
      });

      return res.json({
        success: true,
        data: modelInfo,
      });
    }
  } catch (error) {
    console.error('Error saving model info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save model info',
    });
  }
});

// DELETE /api/model-info/:id - Delete model info
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const modelInfoId = parseInt(id, 10);

    if (isNaN(modelInfoId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model info ID',
      });
    }

    await prisma.dataset.delete({
      where: {
        id: modelInfoId,
        isModelInfo: true,
      },
    });

    return res.json({
      success: true,
      message: 'Model info deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting model info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete model info',
    });
  }
});

export default router;
