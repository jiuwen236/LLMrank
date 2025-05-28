import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import modelsRouter from './routes/models';
import datasetsRouter from './routes/datasets';
import dataPointsRouter from './routes/dataPoints';
import userTablesRouter from './routes/userTables';
import modelInfoRouter from './routes/modelInfo';
import downloadRouter from './routes/download';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const prisma = new PrismaClient();

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://124.221.176.216:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' })); // Increase limit for large data uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/', (_req, res) => {
  res.json({
    message: 'LLM Ranking API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/hello', (_req, res) => {
  res.json({
    message: 'Hello World from LLM Ranking Backend!',
    server: '124.221.176.216',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Get and increment maximum IDs for models and datasets
app.get('/api/max-ids', async (_req, res) => {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(
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
        // Get or create model counter
        let modelCounter = await tx.idCounter.findUnique({
          where: { name: 'model' },
        });

        if (!modelCounter) {
          // Initialize with max ID from both database and user tables
          const [maxModel, userTables] = await Promise.all([
            tx.model.findFirst({
              orderBy: { id: 'desc' },
              select: { id: true },
            }),
            tx.userTable.findMany({
              select: { modelsData: true },
            }),
          ]);

          let currentMaxModelId: number = maxModel ? maxModel.id : 99;

          // Check user tables for higher IDs
          for (const userTable of userTables) {
            try {
              const modelsData = JSON.parse(userTable.modelsData);
              for (const model of modelsData) {
                const modelId = parseInt(model.id);
                if (!isNaN(modelId) && modelId > currentMaxModelId) {
                  currentMaxModelId = modelId;
                }
              }
            } catch (error) {
              console.warn(
                'Failed to parse models data from user table:',
                error
              );
            }
          }

          modelCounter = await tx.idCounter.create({
            data: {
              name: 'model',
              currentValue: currentMaxModelId,
            },
          });
        }

        // Get or create dataset counter
        let datasetCounter = await tx.idCounter.findUnique({
          where: { name: 'dataset' },
        });

        if (!datasetCounter) {
          // Initialize with max ID from both database and user tables
          const [maxDataset, userTables] = await Promise.all([
            tx.dataset.findFirst({
              orderBy: { id: 'desc' },
              select: { id: true },
            }),
            tx.userTable.findMany({
              select: { datasetsData: true },
            }),
          ]);

          let currentMaxDatasetId: number = maxDataset ? maxDataset.id : 99;

          // Check user tables for higher IDs
          for (const userTable of userTables) {
            try {
              const datasetsData = JSON.parse(userTable.datasetsData);
              for (const dataset of datasetsData) {
                const datasetId = parseInt(dataset.id);
                if (!isNaN(datasetId) && datasetId > currentMaxDatasetId) {
                  currentMaxDatasetId = datasetId;
                }
              }
            } catch (error) {
              console.warn(
                'Failed to parse datasets data from user table:',
                error
              );
            }
          }

          datasetCounter = await tx.idCounter.create({
            data: {
              name: 'dataset',
              currentValue: currentMaxDatasetId,
            },
          });
        }

        // Increment counters and return next IDs
        const nextModelId = modelCounter.currentValue + 1;
        const nextDatasetId = datasetCounter.currentValue + 1;

        // Update counters
        await tx.idCounter.update({
          where: { name: 'model' },
          data: { currentValue: nextModelId },
        });

        await tx.idCounter.update({
          where: { name: 'dataset' },
          data: { currentValue: nextDatasetId },
        });

        return {
          maxModelId: modelCounter.currentValue,
          maxDatasetId: datasetCounter.currentValue,
          nextModelId,
          nextDatasetId,
        };
      }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching and incrementing max IDs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch max IDs',
    });
  }
});

// API Routes
app.use('/api/models', modelsRouter);
app.use('/api/datasets', datasetsRouter);
app.use('/api/data-points', dataPointsRouter);
app.use('/api/user-tables', userTablesRouter);
app.use('/api/model-info', modelInfoRouter);
app.use('/api/download', downloadRouter);

// Error handling
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message,
    });
  }
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Start server - Listen on all interfaces (0.0.0.0) for external access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 External access: http://124.221.176.216:${PORT}`);
  console.log(`📊 Health check: http://124.221.176.216:${PORT}/api/health`);
  console.log(`👋 Hello endpoint: http://124.221.176.216:${PORT}/api/hello`);
  console.log(`📊 Models API: http://124.221.176.216:${PORT}/api/models`);
  console.log(`📈 Datasets API: http://124.221.176.216:${PORT}/api/datasets`);
  console.log(
    `💾 Data Points API: http://124.221.176.216:${PORT}/api/data-points`
  );
  console.log(
    `📋 User Tables API: http://124.221.176.216:${PORT}/api/user-tables`
  );
  console.log(
    `ℹ️  Model Info API: http://124.221.176.216:${PORT}/api/model-info`
  );
  console.log(`📥 Download API: http://124.221.176.216:${PORT}/api/download`);
});
