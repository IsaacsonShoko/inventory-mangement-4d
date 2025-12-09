import { format } from 'date-fns';

/**
 * Export data to CSV file
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
  link.click();
};

/**
 * Export chart element as PNG image
 */
export const exportChartAsImage = async (chartRef: HTMLDivElement, filename: string) => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(chartRef, {
      backgroundColor: null,
      scale: 2,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.png`;
    link.click();
  } catch (error) {
    console.error('Failed to export chart as image:', error);
  }
};

/**
 * Export data to JSON file
 */
export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`;
  link.click();
};

/**
 * Format number with appropriate suffix (K, M, B)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Format currency (ZAR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};
