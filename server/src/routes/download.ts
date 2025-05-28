import { Router } from 'express';
import archiver from 'archiver';
import { Readable } from 'stream';

const router = Router();

interface DownloadDataRequest {
  models: Array<{
    id: string;
    name: string;
    fullName: string;
    apiName?: string;
    isThinking?: boolean;
    isHidden?: boolean;
    sortOrder?: number;
    showInColumn?: boolean;
    isModel?: boolean;
  }>;
  datasets: Array<{
    id: string;
    name: string;
    fullName: string;
    isModelInfo?: boolean;
    category?: string;
    showInModel?: boolean;
    isHidden?: boolean;
    sortOrder?: number;
    notes?: string;
  }>;
  dataPoints: Array<{
    id: string;
    modelId: string;
    datasetId: string;
    value?: string;
    notes?: string;
  }>;
  // New fields for CSV-compatible export
  allDatasets?: Array<any>;
  modelInfoDatasets?: Array<any>;
  regularDatasets?: Array<any>;
  modelOrder?: string[];
  datasetOrder?: string[];
  exportFormat?: string;
  // Legacy fields for backward compatibility
  visibleModelIds?: string[];
  visibleDatasetIds?: string[];
  modelInfoDatasetIds?: string[];
}

// Helper function to process multi-value data
function processMultiValue(value?: string): string {
  if (!value || value.trim() === '') {
    return '';
  }

  // Handle single value
  if (!value.includes('/')) {
    return value.replace('?', '').trim();
  }

  // Split by "/" and clean up
  const parts = value
    .split('/')
    .map(part => part.trim())
    .filter(part => part !== '');

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0].replace('?', '');
  }

  // Check if all parts are numbers
  const numbers: number[] = [];
  let allNumbers = true;

  for (const part of parts) {
    const cleanPart = part.replace('%', '').replace('?', '');
    const isValidNumber = /^-?\d*\.?\d+$/.test(cleanPart);
    const num = parseFloat(cleanPart);

    if (isNaN(num) || !isValidNumber) {
      allNumbers = false;
      break;
    }
    numbers.push(num);
  }

  if (allNumbers && numbers.length > 0) {
    // Calculate average
    const average = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;

    // Check if original values had percentage signs
    const hasPercentage = parts.some(part => part.includes('%'));

    if (hasPercentage) {
      return `${average.toFixed(1)}%`;
    } else {
      const decimalPlaces = Math.max(
        ...parts.map(part => {
          const cleanPart = part.replace('%', '').replace('?', '');
          const match = cleanPart.match(/\.(\d+)/);
          return match ? match[1].length : 0;
        })
      );

      return decimalPlaces > 0
        ? average.toFixed(decimalPlaces)
        : average.toString();
    }
  }

  // If not all numbers, return the first value (without ?)
  return parts[0].replace('?', '');
}

// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  const str = String(value || '');
  // Escape double quotes by doubling them and wrap in quotes if contains comma, quote, or newline
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// POST /api/download - Generate and download CSV files as ZIP
router.post('/', async (req, res) => {
  try {
    const data: DownloadDataRequest = req.body;

    // Check if this is a CSV-compatible export request
    const isCsvCompatible = data.exportFormat === 'csv-compatible';

    if (isCsvCompatible) {
      // Generate CSV files matching export-to-csv.ts format
      await generateCsvCompatibleExport(data, res);
    } else {
      // Legacy export format
      await generateLegacyExport(data, res);
    }
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate download',
      });
    }
  }
});

// Generate CSV files matching export-to-csv.ts format
async function generateCsvCompatibleExport(
  data: DownloadDataRequest,
  res: any
) {
  const visibleModels = data.models || [];
  const allDatasets = data.datasets || [];

  // Separate model info and regular datasets
  const modelInfoDatasets = allDatasets.filter(d => d.isModelInfo);
  const regularDatasets = allDatasets.filter(d => !d.isModelInfo);

  // Sort datasets by sortOrder to match export-to-csv.ts
  const sortedModelInfoDatasets = modelInfoDatasets.sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  const sortedRegularDatasets = regularDatasets.sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  // Split model info columns based on sortOrder to match original CSV order
  const earlyModelInfoColumns = sortedModelInfoDatasets.filter(
    ds => (ds.sortOrder || 0) <= 5
  );
  const lateModelInfoColumns = sortedModelInfoDatasets.filter(
    ds => (ds.sortOrder || 0) > 5
  );

  // Build headers dynamically to match original CSV column order
  const baseHeaders = ['id', '模型名', '隐藏'];
  const earlyModelInfoHeaders = earlyModelInfoColumns.map(ds => ds.name);
  const datasetHeaders = sortedRegularDatasets.map(ds => ds.name);
  const lateModelInfoHeaders = lateModelInfoColumns.map(ds => ds.name);
  const controlHeaders = ['显示在列名旁', 'isModel'];

  const finalHeaders = [
    ...baseHeaders,
    ...earlyModelInfoHeaders,
    ...datasetHeaders,
    ...lateModelInfoHeaders,
    ...controlHeaders,
  ];
  const modelInfoHeaders = [...earlyModelInfoHeaders, ...lateModelInfoHeaders];

  // Prepare data arrays
  const defaultRankingData: string[][] = [];
  const dataNotesData: string[][] = [];

  // Add headers
  defaultRankingData.push(finalHeaders);
  dataNotesData.push(finalHeaders);

  // Add actual model rows
  for (let i = 0; i < visibleModels.length; i++) {
    const model = visibleModels[i];

    // Use model ID as is (should already be sequential starting from 100)
    const modelId = model.id;

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

    // Build data notes row data
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
    for (const dp of data.dataPoints) {
      if (dp.modelId !== modelId) continue;

      const dataset = allDatasets.find(d => d.id === dp.datasetId);
      if (!dataset) continue;

      const datasetName = dataset.name;

      if (dataset.isModelInfo) {
        // Handle model info columns
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
    const notesRow = finalHeaders.map(header => notesRowData[header] || '');
    dataNotesData.push(notesRow);
  }

  // Add control rows at the end (matching export-to-csv.ts)

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
  datasetRow[1] = 'isDataset'; // Name
  datasetRow[2] = '否'; // Hidden
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
  const idRow = finalHeaders.map(header => {
    if (header === 'id') return '6';
    if (header === '模型名') return 'id';

    // Handle special control columns with fixed IDs
    if (header === '隐藏') return '1';
    if (header === '显示在列名旁') return '5';
    if (header === 'isModel') return '4';

    // For all other columns, get the actual dataset ID from database
    const dataset = allDatasets.find(ds => ds.name === header);
    if (dataset) {
      return dataset.id.toString();
    }

    return '';
  });
  defaultRankingData.push(idRow);
  dataNotesData.push(idRow);

  // Generate CSV content
  const defaultRankingCsvContent = defaultRankingData
    .map(row => row.map(cell => escapeCsvValue(cell)).join(','))
    .join('\n');

  const dataNotesCsvContent = dataNotesData
    .map(row => row.map(cell => escapeCsvValue(cell)).join(','))
    .join('\n');

  // Create ZIP archive
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=llm-ranking-${new Date().toISOString().split('T')[0]}.zip`
  );

  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  archive.on('error', (err: any) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ success: false, error: 'Failed to create archive' });
    }
  });

  archive.pipe(res);

  // Add CSV files to archive
  const defaultRankingStream = new Readable();
  defaultRankingStream.push(defaultRankingCsvContent);
  defaultRankingStream.push(null);
  archive.append(defaultRankingStream, { name: 'default-ranking.csv' });

  const dataNotesStream = new Readable();
  dataNotesStream.push(dataNotesCsvContent);
  dataNotesStream.push(null);
  archive.append(dataNotesStream, { name: 'data-notes.csv' });

  // Add README file
  const readmeContent = `LLM Ranking Export (CSV Compatible Format)
Generated: ${new Date().toISOString()}

Files included:
- default-ranking.csv: Main ranking data in original CSV format with control rows
- data-notes.csv: Data notes in original CSV format

Notes:
- This export matches the format used by export-to-csv.ts script
- Control rows (id 1-6) contain metadata about columns
- Only visible models and datasets are included in the export
- Multi-value entries are preserved as-is (not averaged)
`;

  const readmeStream = new Readable();
  readmeStream.push(readmeContent);
  readmeStream.push(null);
  archive.append(readmeStream, { name: 'README.txt' });

  // Finalize the archive
  await archive.finalize();
}

// Legacy export format (existing functionality)
async function generateLegacyExport(data: DownloadDataRequest, res: any) {
  // Filter visible models and datasets using legacy fields
  const visibleModels = data.models.filter(
    m => data.visibleModelIds?.includes(m.id) ?? true
  );
  const visibleDatasets = data.datasets.filter(
    d => data.visibleDatasetIds?.includes(d.id) && !d.isModelInfo
  );
  const modelInfoDatasets = data.datasets.filter(
    d => data.modelInfoDatasetIds?.includes(d.id) && d.isModelInfo
  );

  // Helper function to get data point
  const getDataPoint = (modelId: string, datasetId: string) => {
    return data.dataPoints.find(
      dp => dp.modelId === modelId && dp.datasetId === datasetId
    );
  };

  // Generate main data CSV
  const mainHeaders = [
    'Model',
    'Full Name',
    'API Name',
    'Is Thinking',
    ...modelInfoDatasets.map(d => d.name),
    ...visibleDatasets.map(d => d.name),
  ];

  const mainRows = visibleModels.map(model => {
    // Check if model is thinking mode based on dataset id=57 value (即时)
    const thinkingDataPoint = getDataPoint(model.id, '57');
    const isThinking = thinkingDataPoint?.value === '是';

    const row = [
      model.name,
      model.fullName,
      model.apiName || '',
      isThinking ? 'Yes' : 'No',
    ];

    // Add model info columns
    modelInfoDatasets.forEach(dataset => {
      const dataPoint = getDataPoint(model.id, dataset.id);
      const value = dataPoint?.value ? processMultiValue(dataPoint.value) : '';
      row.push(value);
    });

    // Add regular dataset columns
    visibleDatasets.forEach(dataset => {
      const dataPoint = getDataPoint(model.id, dataset.id);
      const value = dataPoint?.value ? processMultiValue(dataPoint.value) : '';
      row.push(value);
    });

    return row;
  });

  // Generate main CSV content
  const mainCsvContent = [mainHeaders, ...mainRows]
    .map(row => row.map(cell => escapeCsvValue(cell)).join(','))
    .join('\n');

  // Generate notes CSV
  const notesHeaders = ['Model', 'Dataset', 'Value', 'Original Value', 'Notes'];
  const notesRows: string[][] = [];

  visibleModels.forEach(model => {
    // Add model info notes
    modelInfoDatasets.forEach(dataset => {
      const dataPoint = getDataPoint(model.id, dataset.id);
      if (dataPoint && (dataPoint.notes || dataPoint.value)) {
        const processedValue = dataPoint.value
          ? processMultiValue(dataPoint.value)
          : '';
        notesRows.push([
          model.name,
          dataset.name,
          processedValue,
          dataPoint.value || '',
          dataPoint.notes || '',
        ]);
      }
    });

    // Add regular dataset notes
    visibleDatasets.forEach(dataset => {
      const dataPoint = getDataPoint(model.id, dataset.id);
      if (dataPoint && (dataPoint.notes || dataPoint.value)) {
        const processedValue = dataPoint.value
          ? processMultiValue(dataPoint.value)
          : '';
        notesRows.push([
          model.name,
          dataset.name,
          processedValue,
          dataPoint.value || '',
          dataPoint.notes || '',
        ]);
      }
    });
  });

  const notesCsvContent = [notesHeaders, ...notesRows]
    .map(row => row.map(cell => escapeCsvValue(cell)).join(','))
    .join('\n');

  // Create ZIP archive
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=llm-ranking-${new Date().toISOString().split('T')[0]}.zip`
  );

  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  archive.on('error', (err: any) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ success: false, error: 'Failed to create archive' });
    }
  });

  archive.pipe(res);

  // Add main data CSV to archive
  const mainCsvStream = new Readable();
  mainCsvStream.push(mainCsvContent);
  mainCsvStream.push(null);
  archive.append(mainCsvStream, { name: 'llm-ranking-data.csv' });

  // Add notes CSV to archive (only if there are notes)
  if (notesRows.length > 0) {
    const notesCsvStream = new Readable();
    notesCsvStream.push(notesCsvContent);
    notesCsvStream.push(null);
    archive.append(notesCsvStream, { name: 'llm-ranking-notes.csv' });
  }

  // Add README file
  const readmeContent = `LLM Ranking Export
Generated: ${new Date().toISOString()}

Files included:
- llm-ranking-data.csv: Main ranking data with processed values
- llm-ranking-notes.csv: Detailed notes and original values (if any notes exist)

Notes:
- Multi-value entries (separated by /) are averaged if all values are numeric
- Estimated values (marked with ?) are included in calculations but marked in notes
- Only visible models and datasets are included in the export
`;

  const readmeStream = new Readable();
  readmeStream.push(readmeContent);
  readmeStream.push(null);
  archive.append(readmeStream, { name: 'README.txt' });

  // Finalize the archive
  await archive.finalize();
}

export default router;
