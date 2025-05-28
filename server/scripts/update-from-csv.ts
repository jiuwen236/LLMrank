import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

/**
 * Update or create models from CSV data
 */
async function updateModelsFromCSV(records: CSVRow[], notesRecords: CSVRow[]) {
  console.log('📋 Updating models from CSV...');

  let created = 0;
  let updated = 0;

  // Create a map for data notes for quick lookup
  const dataNotesMap = new Map<string, CSVRow>();
  notesRecords.forEach(row => {
    if (row.id) {
      dataNotesMap.set(row.id, row);
    }
  });

  for (const row of records) {
    const modelId = parseInt(row.id);

    // Skip control rows (id < 10), non-model rows, and the last row which is typically the id mapping row
    if (modelId < 10 || row.isModel !== '是') {
      continue;
    }

    // Skip the ID mapping row (usually the last model row before control rows)
    // This row has ID 6 and is used for dataset ID mapping
    if (modelId === 6) {
      continue;
    }

    const noteRow = dataNotesMap.get(row.id);
    const notes = noteRow?.备注 || row.备注 || '';

    const modelData = {
      name: row.模型名 || '',
      isHidden: row.隐藏 === '是',
      isModel: row.isModel === '是',
      sortOrder: modelId,
      showInColumn: row.显示在列名旁 === '是', // Add showInColumn field
    };

    try {
      const existing = await prisma.model.findUnique({
        where: { id: modelId },
      });

      if (existing) {
        await prisma.model.update({
          where: { id: modelId },
          data: modelData,
        });
        updated++;
        console.log(`✅ Updated model: ${modelData.name} (ID: ${modelId})`);
      } else {
        await prisma.model.create({
          data: {
            id: modelId,
            ...modelData,
          },
        });
        created++;
        console.log(`🆕 Created model: ${modelData.name} (ID: ${modelId})`);
      }
    } catch (error) {
      console.error(`❌ Error updating model ${modelData.name}:`, error);
    }
  }

  console.log(`📊 Models - Created: ${created}, Updated: ${updated}`);
}

/**
 * Update or create datasets from CSV data
 */
async function updateDatasetsFromCSV(records: CSVRow[]) {
  console.log('📋 Updating datasets from CSV...');

  let created = 0;
  let updated = 0;

  // Get the header row to understand column structure
  if (records.length === 0) return;

  // Find special control rows using same logic as import-csv
  const datasetRow = records.find(row => row['id'] === '1'); // 数据集/isDataset row
  const hiddenRow = records.find(row => row['id'] === '2'); // 隐藏 row
  const showInModelRow = records.find(row => row['id'] === '3'); // 显示在模型旁 row
  const datasetNamesRow = records.find(row => row['id'] === '4'); // 数据集全名 row
  const remarksRow = records.find(row => row['id'] === '5'); // 备注 row
  const idRow = records.find(row => row['id'] === '6'); // id 映射 row

  if (
    !datasetRow ||
    !hiddenRow ||
    !showInModelRow ||
    !datasetNamesRow ||
    !remarksRow ||
    !idRow
  ) {
    console.log(
      '❌ Missing required special control rows. Please ensure rows with id 1-6 exist.'
    );
    return;
  }

  // Special control columns that should always be hidden (consistent with import-csv)
  const specialControlColumns = [
    'id',
    'isModel',
    '隐藏',
    '显示在模型旁',
    '显示在列名旁',
  ];
  const allColumns = Object.keys(records[0]);
  const specialColumns = ['模型名', ...specialControlColumns];
  const dataColumns = allColumns.filter(col => !specialColumns.includes(col));

  let sortOrderCounter = 1;

  for (const columnName of dataColumns) {
    // Check if this column is marked as a dataset in the special row
    const isDataset = datasetRow?.[columnName] === '是';
    const isModelInfo = !isDataset;

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

    const datasetData = {
      name: columnName,
      fullName: fullName,
      isHidden: isHidden,
      notes: notes,
      sortOrder: sortOrderCounter++,
      isModelInfo: isModelInfo,
      showInModel: showInModel,
    };

    try {
      const existing = await prisma.dataset.findUnique({
        where: { id: datasetId },
      });

      if (existing) {
        await prisma.dataset.update({
          where: { id: datasetId },
          data: datasetData,
        });
        updated++;
        console.log(
          `✅ Updated dataset: ${datasetData.name} (ID: ${datasetId})`
        );
      } else {
        await prisma.dataset.create({
          data: {
            id: datasetId,
            ...datasetData,
          },
        });
        created++;
        console.log(
          `🆕 Created dataset: ${datasetData.name} (ID: ${datasetId})`
        );
      }
    } catch (error) {
      console.error(`❌ Error updating dataset ${datasetData.name}:`, error);
    }
  }

  console.log(`📊 Datasets - Created: ${created}, Updated: ${updated}`);
}

/**
 * Update or create data points from CSV data
 */
async function updateDataPointsFromCSV(
  records: CSVRow[],
  notesRecords: CSVRow[]
) {
  console.log('📋 Updating data points from CSV...');

  let created = 0;
  let updated = 0;

  if (records.length === 0) return;

  // Find the id row to get dataset IDs
  const idRow = records.find(row => row['id'] === '6');
  if (!idRow) {
    console.log('❌ No ID row found for datasets');
    return;
  }

  // Special control columns (consistent with import-csv)
  const specialControlColumns = [
    'id',
    'isModel',
    '隐藏',
    '显示在模型旁',
    '显示在列名旁',
  ];
  const allColumns = Object.keys(records[0]);
  const specialColumns = ['模型名', ...specialControlColumns];
  const dataColumns = allColumns.filter(col => !specialColumns.includes(col));

  // Create a map for data notes for quick lookup
  const dataNotesMap = new Map<string, CSVRow>();
  notesRecords.forEach(row => {
    if (row.id) {
      dataNotesMap.set(row.id, row);
    }
  });

  // Helper function to check if a column is a date column (from import-csv)
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

  for (const row of records) {
    const modelId = parseInt(row.id);

    // Skip control rows and non-model rows
    if (modelId < 10 || row.isModel !== '是') {
      continue;
    }

    const noteRow = dataNotesMap.get(row.id);

    for (const columnName of dataColumns) {
      const datasetIdStr = idRow[columnName];
      const datasetId = datasetIdStr ? parseInt(datasetIdStr) : null;

      if (!datasetId) {
        continue;
      }

      let value = row[columnName] || null;
      const notes = noteRow?.[columnName] || '';

      // Skip empty values
      if (!value || value.trim() === '') {
        continue;
      }

      // Process date values: replace / with . for date columns (consistent with import-csv)
      if (value && isDateColumn(columnName, columnName)) {
        value = value.replace(/\//g, '.');
      }

      const dataPointId = `${modelId}_${datasetId}`;

      try {
        // First try to find existing DataPoint using the unique constraint
        // This handles both old records (without the new ID format) and new ones
        const existing = await prisma.dataPoint.findFirst({
          where: {
            modelId,
            datasetId,
          },
        });

        if (existing) {
          // Update existing record and ensure it has the correct ID format
          await prisma.dataPoint.update({
            where: { id: existing.id },
            data: {
              id: dataPointId, // Update to new ID format if needed
              value: value.trim(),
              notes: notes.trim(),
            },
          });
          updated++;
        } else {
          // Create new record with new ID format
          await prisma.dataPoint.create({
            data: {
              id: dataPointId,
              modelId,
              datasetId,
              value: value.trim(),
              notes: notes.trim(),
            },
          });
          created++;
        }
      } catch (error) {
        console.error(`❌ Error updating data point ${dataPointId}:`, error);
      }
    }
  }

  console.log(`📊 Data Points - Created: ${created}, Updated: ${updated}`);
}

/**
 * Main function to update database from CSV files
 */
async function updateFromCSV() {
  try {
    console.log('🚀 Starting CSV to database update...');

    // Read CSV files (consistent paths with import-csv)
    const csvPath = path.join(__dirname, '../data/default-ranking.csv');
    const notesPath = path.join(__dirname, '../data/data-notes.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    console.log(`📁 Reading CSV files from: ${path.dirname(csvPath)}`);

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

    console.log(`📄 Parsed ${records.length} rows from main CSV`);
    console.log(`📄 Parsed ${notesRecords.length} rows from notes CSV`);

    // Update database in order: datasets first, then models, then data points
    await updateDatasetsFromCSV(records);
    await updateModelsFromCSV(records, notesRecords);
    await updateDataPointsFromCSV(records, notesRecords);

    console.log('✅ Database update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating database from CSV:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  updateFromCSV().catch(console.error);
}

export { updateFromCSV };
