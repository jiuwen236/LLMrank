import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting data export from database to CSV...');

    // Fetch all models/entities with their data points, ordered by sortOrder
    const allEntities = await prisma.model.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        dataPoints: {
          include: {
            dataset: true,
          },
        },
      },
    });

    // Fetch all datasets, ordered by sortOrder
    const allDatasets = await prisma.dataset.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Separate actual models from control rows
    const actualModels = allEntities.filter(entity => entity.isModel);

    // Get dataset columns (non-model-info datasets)
    const datasetColumns = allDatasets.filter(ds => !ds.isModelInfo);

    // Get model info columns (isModelInfo = true datasets)
    const modelInfoColumns = allDatasets.filter(ds => ds.isModelInfo);

    // Split model info columns based on sortOrder to match original CSV order
    // First 5 model info columns (sortOrder 1-5): 模型全名, 即时, 输入, 输出, 备注
    const earlyModelInfoColumns = modelInfoColumns.filter(
      ds => ds.sortOrder <= 5
    );
    // Last 3 model info columns (sortOrder 30+): context, cutoff, API名
    const lateModelInfoColumns = modelInfoColumns.filter(
      ds => ds.sortOrder > 5
    );

    // Build headers dynamically to match original CSV column order
    const baseHeaders = ['id', '模型名', '隐藏'];
    const earlyModelInfoHeaders = earlyModelInfoColumns.map(ds => ds.name);
    const datasetHeaders = datasetColumns.map(ds => ds.name);
    const lateModelInfoHeaders = lateModelInfoColumns.map(ds => ds.name);
    const controlHeaders = ['显示在列名旁', 'isModel'];

    const finalHeaders = [
      ...baseHeaders,
      ...earlyModelInfoHeaders,
      ...datasetHeaders,
      ...lateModelInfoHeaders,
      ...controlHeaders,
    ];

    // For backward compatibility, create modelInfoHeaders as the union of early and late
    const modelInfoHeaders = [
      ...earlyModelInfoHeaders,
      ...lateModelInfoHeaders,
    ];

    // Prepare data arrays
    const defaultRankingData: string[][] = [];
    const dataNotesData: string[][] = [];

    // Add headers
    defaultRankingData.push(finalHeaders);

    // For data notes, use the same column order as default ranking
    const dataNotesHeaders = [
      ...baseHeaders,
      ...earlyModelInfoHeaders,
      ...datasetHeaders,
      ...lateModelInfoHeaders,
      ...controlHeaders,
    ];
    dataNotesData.push(dataNotesHeaders);

    // Add actual model rows first
    for (let i = 0; i < actualModels.length; i++) {
      const model = actualModels[i];

      // Use sequential ID starting from 100 for models
      const modelId = (100 + i).toString();

      // Initialize row data objects
      const baseRowData: Record<string, string> = {
        id: modelId,
        模型名: model.name,
        隐藏: model.isHidden ? '是' : '否',
        显示在列名旁: model.showInColumn ? '是' : '',
        isModel: '是',
      };

      // Initialize all model info and dataset columns
      [...modelInfoHeaders, ...datasetHeaders].forEach(header => {
        baseRowData[header] = '';
      });

      // Build data notes row data - include all columns but most fields empty except notes
      const notesRowData: Record<string, string> = {
        id: modelId,
        模型名: model.name,
        隐藏: '',
        显示在列名旁: '',
        isModel: '',
      };

      // Initialize all model info and dataset columns for notes
      [...modelInfoHeaders, ...datasetHeaders].forEach(header => {
        notesRowData[header] = '';
      });

      // Fill in dataset values and model info from data points
      for (const dp of model.dataPoints) {
        if (!dp.dataset) continue;

        const datasetName = dp.dataset.name;

        if (dp.dataset.isModelInfo) {
          // Handle model info columns dynamically
          baseRowData[datasetName] = dp.value || '';

          // For notes file, use the DataPoint notes, not the value
          if (dp.notes) {
            notesRowData[datasetName] = dp.notes;
          }
        } else {
          // Handle dataset columns
          baseRowData[datasetName] = dp.value || '';

          // For data notes, only include notes if they exist
          if (dp.notes) {
            notesRowData[datasetName] = dp.notes;
          }
        }
      }

      // Add to default ranking CSV
      const defaultRow = finalHeaders.map(header => baseRowData[header] || '');
      defaultRankingData.push(defaultRow);

      // Add to data notes CSV
      const notesRow = dataNotesHeaders.map(
        header => notesRowData[header] || ''
      );
      dataNotesData.push(notesRow);
    }

    // Add control rows at the end
    // These are special rows that define metadata about columns

    // Control row 1: "数据集" - marks which columns are datasets
    const datasetRow: string[] = finalHeaders.map(header => {
      if (baseHeaders.includes(header) || controlHeaders.includes(header)) {
        return header === '显示在列名旁' ? '' : '否';
      }
      if (modelInfoHeaders.includes(header)) {
        return '否'; // Model info columns are not datasets
      }
      return '是'; // dataset columns
    });
    datasetRow[0] = '1'; // ID
    datasetRow[1] = 'isDataset'; // Name (use original name from CSV)
    datasetRow[2] = '否'; // Hidden (use original value from CSV)
    defaultRankingData.push(datasetRow);

    // Control row 2: "隐藏" - which columns are hidden
    const hiddenRow = finalHeaders.map(header => {
      if (header === 'id') return '2';
      if (header === '模型名') return '隐藏';
      if (header === '隐藏') return '是';
      if (header === 'isModel') return '否';
      if (header === '显示在列名旁') return '';

      const dataset = allDatasets.find(ds => ds.name === header);
      if (dataset) {
        return dataset.isHidden ? '是' : '否';
      }
      return '否';
    });
    defaultRankingData.push(hiddenRow);

    // Control row 3: "显示在模型旁"
    const showInModelRow = finalHeaders.map(header => {
      if (header === 'id') return '3';
      if (header === '模型名') return '显示在模型旁';
      if (header === '隐藏') return '是';
      if (header === 'isModel') return '否';
      if (header === '显示在列名旁') return '';

      const dataset = allDatasets.find(ds => ds.name === header);
      if (dataset) {
        return dataset.showInModel ? '是' : '否';
      }
      return '否';
    });
    defaultRankingData.push(showInModelRow);

    // Control row 4: "数据集全名" - dataset full names
    const fullNameRow = finalHeaders.map(header => {
      if (header === 'id') return '4';
      if (header === '模型名') return '数据集全名';
      if (header === '隐藏') return '是';
      if (header === '显示在列名旁') return '是';
      if (header === 'isModel') return '否';

      const dataset = allDatasets.find(ds => ds.name === header);
      if (dataset && !dataset.isModelInfo) {
        return dataset.fullName || dataset.name;
      }
      return '';
    });
    defaultRankingData.push(fullNameRow);

    // Control row 5: "备注" - dataset notes
    const notesRow = finalHeaders.map(header => {
      if (header === 'id') return '5';
      if (header === '模型名') return '备注';
      if (header === '隐藏') return '是';
      if (header === 'isModel') return '否';
      if (header === '显示在列名旁') return '是';

      const dataset = allDatasets.find(ds => ds.name === header);
      if (dataset && dataset.notes) {
        return dataset.notes;
      }

      return '';
    });
    defaultRankingData.push(notesRow);

    // Control row 6: "id" - dataset IDs
    const idRow = finalHeaders.map((header, index) => {
      if (header === 'id') return '6';
      if (header === '模型名') return 'id';

      // Handle special control columns with fixed IDs (based on original CSV)
      if (header === '隐藏') return '1';
      if (header === '显示在列名旁') return '5';
      if (header === 'isModel') return '4';

      // For all other columns, get the actual dataset ID from database
      const dataset = allDatasets.find(ds => ds.name === header);
      if (dataset) {
        return dataset.id.toString();
      }

      // For columns that don't have datasets, return empty
      return '';
    });
    defaultRankingData.push(idRow);

    // Add id row to data notes CSV as well - use same logic as default ranking
    const notesIdRow = dataNotesHeaders.map((header, index) => {
      if (header === 'id') return '6';
      if (header === '模型名') return 'id';

      // Handle special control columns with fixed IDs (same as default ranking)
      if (header === '隐藏') return '1';
      if (header === '显示在列名旁') return '5';
      if (header === 'isModel') return '4';

      // For all other columns, get the actual dataset ID from database
      const dataset = allDatasets.find(ds => ds.name === header);
      if (dataset) {
        return dataset.id.toString();
      }

      // For columns that don't have datasets, return empty
      return '';
    });
    dataNotesData.push(notesIdRow);

    // Write CSV files
    const defaultRankingCsvPath = path.join(
      __dirname,
      '..',
      'data',
      'default-ranking-new.csv'
    );
    const dataNotesCsvPath = path.join(
      __dirname,
      '..',
      'data',
      'data-notes-new.csv'
    );

    const defaultRankingCsvString = await stringifyAsync(defaultRankingData);
    await fs.writeFile(defaultRankingCsvPath, defaultRankingCsvString);
    console.log(`Successfully exported data to ${defaultRankingCsvPath}`);

    const dataNotesCsvString = await stringifyAsync(dataNotesData);
    await fs.writeFile(dataNotesCsvPath, dataNotesCsvString);
    console.log(`Successfully exported data to ${dataNotesCsvPath}`);
  } catch (error) {
    console.error('Error exporting data to CSV:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper to promisify csv-stringify
function stringifyAsync(data: string[][]): Promise<string> {
  return new Promise((resolve, reject) => {
    stringify(data, (err: Error | undefined, output?: string) => {
      if (err) {
        return reject(err);
      }
      if (output === undefined) {
        return reject(
          new Error('CSV stringification resulted in undefined output')
        );
      }
      resolve(output);
    });
  });
}

main();
