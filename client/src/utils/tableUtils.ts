import type { Dataset, Model, DataPoint } from '../types';

/**
 * Calculate optimal column width based on content
 */
export function calculateColumnWidth(
  dataset: Dataset,
  models: Model[],
  getDataPoint: (modelId: string, datasetId: string) => DataPoint | undefined
): number {
  // Calculate width based on dataset name
  const nameWidth = Math.min(Math.max(dataset.name.length * 5.5, 35), 80);

  // Calculate width based on data content
  let maxDataWidth = 0;
  models.forEach(model => {
    const dataPoint = getDataPoint(model.id, dataset.id);
    if (dataPoint?.value) {
      const contentWidth = dataPoint.value.length * 5.5;
      maxDataWidth = Math.max(maxDataWidth, contentWidth);
    }
  });

  // Return optimal width with padding
  return Math.max(nameWidth, Math.min(maxDataWidth + 16, 100));
}

/**
 * Format display text for compact view
 */
export function formatCompactText(
  text: string,
  maxLength: number = 12
): string {
  if (text.length <= maxLength) return text;

  // Try to break at meaningful points
  const breakPoints = ['-', '_', ' ', '.'];
  for (const breakPoint of breakPoints) {
    const parts = text.split(breakPoint);
    if (parts.length > 1 && parts[0].length <= maxLength) {
      return parts[0] + '…';
    }
  }

  // Fallback to simple truncation
  return text.substring(0, maxLength - 1) + '…';
}

/**
 * Get color for value based on its properties
 */
export function getValueColor(value: string): string {
  if (value.includes('?')) return '#ff7f00'; // Orange for estimated
  if (value.includes('/') || value.includes(',')) return '#1890ff'; // Blue for multiple values
  return '#333'; // Default color
}

/**
 * Check if value has special formatting needs
 */
export function getValueStyle(value: string, hasNotes: boolean) {
  const isEstimated = value.includes('?');
  const hasMultipleValues = value.includes('/') || value.includes(',');

  return {
    color: getValueColor(value),
    fontWeight: hasMultipleValues ? 500 : 400,
    fontStyle: isEstimated ? 'italic' : 'normal',
    backgroundColor: hasNotes ? '#f0f8ff' : 'transparent',
  };
}

/**
 * Calculate total table width based on visible columns
 */
export function calculateTableWidth(
  datasets: Dataset[],
  models: Model[],
  getDataPoint: (modelId: string, datasetId: string) => DataPoint | undefined,
  modelColumnWidth: number = 180
): number {
  const dataColumnsWidth = datasets.reduce((total, dataset) => {
    return total + calculateColumnWidth(dataset, models, getDataPoint);
  }, 0);

  return modelColumnWidth + dataColumnsWidth;
}
