import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

async function importData() {
  try {
    console.log('Starting data import...');

    // Read CSV files
    const csvPath = path.join(__dirname, '../data/default-ranking.csv');
    const notesPath = path.join(__dirname, '../data/data-notes.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Read notes file if exists
    let notesRecords: CSVRow[] = [];
    if (fs.existsSync(notesPath)) {
      const notesContent = fs.readFileSync(notesPath, 'utf-8');
      notesRecords = parse(notesContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    }

    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.dataPoint.deleteMany();
    await prisma.model.deleteMany();
    await prisma.dataset.deleteMany();

    // Find special rows using id-based identification (avoid hardcoding names)
    // Use id to identify special control rows instead of hardcoded names
    const datasetRow = records.find(row => row['id'] === '1'); // 数据集/isDataset row
    const hiddenRow = records.find(row => row['id'] === '2'); // 隐藏 row
    const showInModelRow = records.find(row => row['id'] === '3'); // 显示在模型旁 row
    const datasetNamesRow = records.find(row => row['id'] === '4'); // 数据集全名 row
    const remarksRow = records.find(row => row['id'] === '5'); // 备注 row
    const idRow = records.find(row => row['id'] === '6'); // id 映射 row

    // Validate that we found all required special rows
    if (
      !datasetRow ||
      !hiddenRow ||
      !showInModelRow ||
      !datasetNamesRow ||
      !remarksRow ||
      !idRow
    ) {
      throw new Error(
        'Missing required special control rows. Please ensure rows with id 1-6 exist.'
      );
    }

    console.log(`Found special rows:
      - Dataset row (id=1): ${datasetRow['模型名']}
      - Hidden row (id=2): ${hiddenRow['模型名']}
      - Show in model row (id=3): ${showInModelRow['模型名']}
      - Dataset names row (id=4): ${datasetNamesRow['模型名']}
      - Remarks row (id=5): ${remarksRow['模型名']}
      - ID mapping row (id=6): ${idRow['模型名']}`);

    // Special control columns that should always be hidden and non-editable
    // These are used for controlling the interface and database behavior
    const specialControlColumns = [
      'id',
      'isModel',
      '隐藏',
      '显示在模型旁',
      '显示在列名旁',
    ];

    // Get all column names (excluding special metadata columns that are not part of the data)
    const allColumns = Object.keys(records[0]);
    // Exclude model name and all special control columns from data processing
    const specialColumns = ['模型名', ...specialControlColumns];
    const dataColumns = allColumns.filter(col => !specialColumns.includes(col));

    // Helper function to check if a column is a date column
    // We convert date format for consistency: / to . (e.g., 2024/6/1 → 2024.6.1)
    // This standardizes date display across the application
    const isDateColumn = (columnName: string, fullName: string) => {
      const lowerName = columnName.toLowerCase();
      const lowerFullName = fullName.toLowerCase();
      return (
        lowerName.includes('date') ||
        lowerName.includes('cutoff') ||
        lowerName.includes('time') ||
        lowerFullName.includes('date') ||
        lowerFullName.includes('cutoff') ||
        lowerFullName.includes('time') ||
        lowerName.includes('日期') ||
        lowerName.includes('时间') ||
        lowerFullName.includes('日期') ||
        lowerFullName.includes('时间')
      );
    };

    // Create datasets based on CSV metadata
    console.log('Creating datasets...');
    const datasets: { [key: string]: any } = {};
    const modelInfoDatasets: { [key: string]: any } = {};
    let datasetCount = 0; // Count of actual datasets (isDataset = "是")
    let sortOrderCounter = 1; // Track the CSV column order for sortOrder

    for (const columnName of dataColumns) {
      // Check if this column is marked as a dataset in the special row
      const isDataset = datasetRow?.[columnName] === '是';
      const isModelInfo = !isDataset; // Model info columns are those that are NOT datasets

      if (isDataset) {
        datasetCount++;
      }

      const fullName = datasetNamesRow?.[columnName] || columnName;
      let isHidden = hiddenRow?.[columnName] === '是';
      const notes = remarksRow?.[columnName] || '';

      // Get the correct dataset ID from the ID mapping row
      const datasetIdStr = idRow?.[columnName];
      const datasetId = datasetIdStr ? parseInt(datasetIdStr) : null;

      if (!datasetId) {
        console.warn(
          `Warning: No ID found for column ${columnName}, skipping...`
        );
        continue;
      }

      // Read showInModel from CSV data
      const showInModel = showInModelRow?.[columnName] === '是';

      // Special control columns should always be hidden
      if (specialControlColumns.includes(columnName)) {
        isHidden = true;
      }

      // "显示在列名旁" 列本身应该隐藏，因为它是控制列
      if (columnName === '显示在列名旁') {
        isHidden = true;
      }

      const dataset = await prisma.dataset.create({
        data: {
          id: datasetId,
          name: columnName,
          fullName: fullName,
          isHidden: isHidden,
          notes: notes,
          sortOrder: sortOrderCounter++, // Use CSV column order for sortOrder
          isModelInfo: isModelInfo,
          showInModel: showInModel,
        },
      });

      if (isModelInfo) {
        modelInfoDatasets[columnName] = dataset;
      } else {
        datasets[columnName] = dataset;
      }
    }

    // Create models
    console.log('Creating models...');
    let modelOrder = 0;
    let modelCount = 0; // Count of actual models (isModel = "是")
    const models: { [key: string]: any } = {};

    for (const row of records) {
      const modelName = row['模型名'];

      // Skip special rows based on isModel column (only process rows where isModel is "是")
      const isModel = row['isModel'];
      if (isModel !== '是') {
        continue;
      }

      modelCount++;
      const isHidden = row['隐藏'] === '是';
      const isModelValue = row['isModel'] === '是'; // Read isModel from CSV
      const showInColumn = row['显示在列名旁'] === '是'; // Read showInColumn from CSV

      // Use ID from CSV file, ensure it's converted to integer
      const modelId = parseInt(row['id']) || modelOrder + 100; // Default to 100+ if no ID

      // Create model with showInColumn support
      const model = await prisma.model.create({
        data: {
          id: modelId,
          name: modelName,
          isHidden: isHidden,
          isModel: isModelValue,
          sortOrder: modelOrder++,
          showInColumn: showInColumn,
        },
      });

      models[modelName] = model;
    }

    // Create data points for all datasets (both model info and regular datasets)
    console.log('Creating data points...');
    for (const row of records) {
      const modelName = row['模型名'];

      // Skip special rows based on isModel column (only process rows where isModel is "是")
      const isModel = row['isModel'];
      if (isModel !== '是') {
        continue;
      }

      const model = models[modelName];
      if (!model) continue;

      // Create data points for this model for all columns
      for (const columnName of dataColumns) {
        const dataset = datasets[columnName] || modelInfoDatasets[columnName];
        if (dataset) {
          let value = row[columnName] || null;

          // Process date values: replace / with . for date columns for consistent display
          // This ensures all dates are shown as 2024.6.1 instead of 2024/6/1 format
          if (value && isDateColumn(columnName, dataset.fullName)) {
            value = value.replace(/\//g, '.');
          }

          // Get notes for this data point
          const notesRow = notesRecords.find(nr => nr['模型名'] === modelName);
          const dataPointNotes = notesRow?.[columnName] || null;

          if (value || dataPointNotes) {
            // Generate ID in "modelId_datasetId" format
            const dataPointId = `${model.id}_${dataset.id}`;

            await prisma.dataPoint.create({
              data: {
                id: dataPointId,
                modelId: model.id,
                datasetId: dataset.id,
                value: value,
                notes: dataPointNotes,
              },
            });
          }
        }
      }
    }

    const allModels = await prisma.model.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const allDatasets = await prisma.dataset.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const allDataPoints = await prisma.dataPoint.findMany();
    const modelInfoDatasetCount = await prisma.dataset.count({
      where: { isModelInfo: true },
    });

    console.log('Data import completed successfully!');
    console.log(
      `✅ Imported ${allModels.length} models (${modelCount} actual models with isModel=是)`
    );
    console.log(
      `✅ Imported ${allDatasets.length} datasets (${datasetCount} actual datasets with isDataset=是, ${modelInfoDatasetCount} model info datasets)`
    );
    console.log(`✅ Imported ${allDataPoints.length} data points`);

    // Validation: Check counts match expectations
    if (modelCount !== allModels.length) {
      console.warn(
        `⚠️  Model count mismatch: CSV has ${modelCount} models with isModel=是, but created ${allModels.length} models`
      );
    }

    if (datasetCount + modelInfoDatasetCount !== allDatasets.length) {
      console.warn(
        `⚠️  Dataset count mismatch: Expected ${datasetCount + modelInfoDatasetCount} datasets, but created ${allDatasets.length} datasets`
      );
    }
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import if this file is executed directly
if (require.main === module) {
  importData().catch(console.error);
}

export default importData;
