// Data processing utilities for handling multiple values separated by "/"

/**
 * Process a data value that may contain multiple values separated by "/"
 * If all values are numbers, return their average
 * Otherwise, return the first value
 * Also handles estimated values (values followed by "?")
 */
export function processMultiValue(value?: string): string {
  if (!value || value.trim() === '') {
    return '';
  }

  // Handle single value
  if (!value.includes('/')) {
    // Remove ? for display but keep the value
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

  // Check if all parts are numbers (including decimals, percentages, and estimated values)
  const numbers: number[] = [];
  let allNumbers = true;

  for (const part of parts) {
    // Remove percentage sign and ? if present for parsing
    const cleanPart = part.replace('%', '').replace('?', '');

    // Check if the clean part is actually a pure number (not containing letters or special chars like k, M, etc.)
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

    // Format the result
    if (hasPercentage) {
      return `${average.toFixed(1)}%`;
    } else {
      // Preserve decimal places appropriately
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

/**
 * Check if a value contains estimated values (marked with ?)
 */
export function hasEstimatedValues(value?: string): boolean {
  return value ? value.includes('?') : false;
}

/**
 * Get information about estimated values in a multi-value string
 */
export function getEstimatedValuesInfo(value?: string): {
  hasEstimated: boolean;
  estimatedValues: string[];
  confirmedValues: string[];
  allValues: string[];
} {
  if (!value || value.trim() === '') {
    return {
      hasEstimated: false,
      estimatedValues: [],
      confirmedValues: [],
      allValues: [],
    };
  }

  const allValues = value
    .split('/')
    .map(part => part.trim())
    .filter(part => part !== '');
  const estimatedValues = allValues.filter(val => val.includes('?'));
  const confirmedValues = allValues.filter(val => !val.includes('?'));

  return {
    hasEstimated: estimatedValues.length > 0,
    estimatedValues,
    confirmedValues,
    allValues,
  };
}

/**
 * Generate a detailed tooltip for multi-value data
 */
export function generateValueTooltip(value?: string): string | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }

  const info = getEstimatedValuesInfo(value);

  if (info.allValues.length <= 1) {
    return info.hasEstimated ? '此值为推测值' : undefined;
  }

  const parts: string[] = [];

  if (info.confirmedValues.length > 0) {
    parts.push(`确定值: ${info.confirmedValues.join(', ')}`);
  }

  if (info.estimatedValues.length > 0) {
    const cleanEstimated = info.estimatedValues.map(val =>
      val.replace('?', '')
    );
    parts.push(`推测值: ${cleanEstimated.join(', ')}`);
  }

  const processedValue = processMultiValue(value);
  parts.push(`显示平均值: ${processedValue}`);

  return parts.join('\n');
}

/**
 * Check if a value represents a number (including percentages)
 */
export function isNumericValue(value: string): boolean {
  if (!value || value.trim() === '') {
    return false;
  }

  const cleanValue = value.replace('%', '').replace('?', '').trim();
  return !isNaN(parseFloat(cleanValue));
}

/**
 * Format a numeric value for display
 */
export function formatNumericValue(value: string): string {
  if (!isNumericValue(value)) {
    return value;
  }

  const hasPercentage = value.includes('%');
  const cleanValue = value.replace('%', '').replace('?', '');
  const num = parseFloat(cleanValue);

  if (hasPercentage) {
    return `${num}%`;
  }

  // Format with appropriate decimal places
  if (num === Math.floor(num)) {
    return num.toString();
  } else {
    return num.toFixed(1);
  }
}

/**
 * Get all individual values from a multi-value string
 */
export function getIndividualValues(value?: string): string[] {
  if (!value || value.trim() === '') {
    return [];
  }

  return value
    .split('/')
    .map(part => part.trim())
    .filter(part => part !== '');
}

/**
 * Validate user ID format
 * Allow regular characters including Chinese, letters, numbers, and some safe special characters
 * Exclude dangerous characters and whitespace
 */
export function isValidUserId(userId: string): boolean {
  // Length check
  if (userId.trim().length < 2 || userId.length > 50) {
    return false;
  }

  // Check for leading or trailing spaces
  if (userId !== userId.trim()) {
    return false;
  }

  // Check for dangerous characters that could cause issues
  // Exclude tabs, newlines, and potentially dangerous characters for file systems/URLs
  const dangerousChars = /[\t\n\r\/<>:"|*?\\]/;
  if (dangerousChars.test(userId)) {
    return false;
  }

  return true;
}
