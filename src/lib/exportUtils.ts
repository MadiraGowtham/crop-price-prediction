import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Crop, PriceHistory, MarketData } from '@/types/crop';

// CSV Export Utilities
export const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header];
        // Handle special characters and commas
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell ?? '';
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Export crops data
export const exportCropsToCSV = (crops: Crop[]) => {
  const data = crops.map(crop => ({
    Name: crop.name,
    Category: crop.category,
    'Current Price (₹)': crop.currentPrice,
    'Previous Price (₹)': crop.previousPrice,
    'Predicted Price (₹)': crop.predictedPrice,
    'Price Change (₹)': crop.currentPrice - crop.previousPrice,
    'Change %': ((crop.currentPrice - crop.previousPrice) / crop.previousPrice * 100).toFixed(2),
    Trend: crop.trend,
    'Confidence %': crop.confidence,
    Unit: crop.unit,
  }));
  downloadCSV(data, 'crop_prices');
};

// Export price history
export const exportPriceHistoryToCSV = (history: PriceHistory[], cropName: string) => {
  const data = history.map(item => ({
    Date: item.date,
    'Price (₹)': item.price,
    'Predicted Price (₹)': item.predicted ?? '',
  }));
  downloadCSV(data, `${cropName.toLowerCase().replace(/\s+/g, '_')}_price_history`);
};

// Export market data
export const exportMarketDataToCSV = (marketData: MarketData[]) => {
  const data = marketData.map(item => ({
    Crop: item.crop,
    Region: item.region,
    'Price (₹/qtl)': item.price,
    'Change %': item.change,
    'Volume (tons)': item.volume,
  }));
  downloadCSV(data, 'market_data');
};

// Export comparison data
export const exportComparisonToCSV = (
  metrics: Array<{
    crop: Crop;
    currentPrice: number;
    priceChangePercent: number;
    high: number;
    low: number;
    avg: number;
    volatility: string;
    predictedPrice: number;
    predictedChange: number;
    trend: string;
  }>
) => {
  const data = metrics.map(m => ({
    Crop: m.crop.name,
    Category: m.crop.category,
    'Current Price (₹)': m.currentPrice,
    'Price Change %': m.priceChangePercent.toFixed(2),
    '30-Day High (₹)': m.high,
    '30-Day Low (₹)': m.low,
    'Average (₹)': m.avg,
    'Volatility %': m.volatility,
    'Predicted Price (₹)': m.predictedPrice,
    'Predicted Change %': m.predictedChange.toFixed(2),
    Trend: m.trend,
  }));
  downloadCSV(data, 'crop_comparison');
};

// Export forecast data
export const exportForecastToCSV = (
  cropName: string,
  predictions: number[],
  upperBand: number[],
  lowerBand: number[],
  confidence: number,
  trend: string
) => {
  const data = predictions.map((pred, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return {
      Date: date.toISOString().split('T')[0],
      'Day': i + 1,
      'Predicted Price (₹)': Math.round(pred),
      'Upper Band (₹)': Math.round(upperBand[i]),
      'Lower Band (₹)': Math.round(lowerBand[i]),
    };
  });
  
  // Add summary row
  data.push({
    Date: 'Summary',
    'Day': predictions.length,
    'Predicted Price (₹)': Math.round(predictions.reduce((a, b) => a + b, 0) / predictions.length),
    'Upper Band (₹)': confidence,
    'Lower Band (₹)': trend as any,
  });
  
  downloadCSV(data, `${cropName.toLowerCase().replace(/\s+/g, '_')}_forecast`);
};

// PDF Export Utilities
export const exportChartToPDF = async (
  elementId: string, 
  title: string,
  additionalInfo?: Record<string, string | number>
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add title
    pdf.setFontSize(18);
    pdf.setTextColor(40, 40, 40);
    pdf.text(title, 14, 20);
    
    // Add date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    // Add additional info if provided
    let yOffset = 35;
    if (additionalInfo) {
      pdf.setFontSize(10);
      Object.entries(additionalInfo).forEach(([key, value]) => {
        pdf.text(`${key}: ${value}`, 14, yOffset);
        yOffset += 6;
      });
    }
    
    // Calculate image dimensions to fit page
    const imgWidth = pageWidth - 28;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const remainingHeight = pageHeight - yOffset - 20;
    
    const finalHeight = Math.min(imgHeight, remainingHeight);
    const finalWidth = (finalHeight * canvas.width) / canvas.height;
    
    pdf.addImage(imgData, 'PNG', 14, yOffset + 5, finalWidth, finalHeight);
    
    pdf.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
};

// Full report PDF
export const exportFullReportPDF = async (
  crops: Crop[],
  selectedCrop?: Crop
) => {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Title
  pdf.setFontSize(22);
  pdf.setTextColor(34, 84, 61);
  pdf.text('CropPrice Market Report', pageWidth / 2, 20, { align: 'center' });
  
  // Subtitle
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  
  let yPos = 40;
  
  // Summary Statistics
  pdf.setFontSize(14);
  pdf.setTextColor(40, 40, 40);
  pdf.text('Market Summary', 14, yPos);
  yPos += 8;
  
  pdf.setFontSize(10);
  const avgPrice = crops.reduce((acc, c) => acc + c.currentPrice, 0) / crops.length;
  const avgConfidence = crops.reduce((acc, c) => acc + c.confidence, 0) / crops.length;
  const upTrends = crops.filter(c => c.trend === 'up').length;
  
  const summaryData = [
    `Total Crops Tracked: ${crops.length}`,
    `Average Price Index: ₹${Math.round(avgPrice).toLocaleString()}`,
    `Average Prediction Confidence: ${Math.round(avgConfidence)}%`,
    `Rising Trends: ${upTrends} / ${crops.length}`,
  ];
  
  summaryData.forEach(line => {
    pdf.text(line, 14, yPos);
    yPos += 6;
  });
  
  yPos += 6;
  
  // Crop Prices Table
  pdf.setFontSize(14);
  pdf.text('Crop Prices Overview', 14, yPos);
  yPos += 8;
  
  // Table headers
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  const headers = ['Crop', 'Current', 'Predicted', 'Change', 'Conf.', 'Trend'];
  const colWidths = [40, 25, 25, 25, 20, 20];
  let xPos = 14;
  
  headers.forEach((header, i) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 4;
  
  // Table rows
  pdf.setTextColor(40, 40, 40);
  crops.slice(0, 15).forEach(crop => {
    xPos = 14;
    const change = ((crop.predictedPrice - crop.currentPrice) / crop.currentPrice * 100);
    const row = [
      crop.name.substring(0, 15),
      `₹${crop.currentPrice.toLocaleString()}`,
      `₹${crop.predictedPrice.toLocaleString()}`,
      `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      `${crop.confidence}%`,
      crop.trend.toUpperCase(),
    ];
    
    row.forEach((cell, i) => {
      pdf.text(cell, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 5;
    
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
  });
  
  // Selected crop details if provided
  if (selectedCrop) {
    yPos += 10;
    pdf.setFontSize(14);
    pdf.text(`Detailed Analysis: ${selectedCrop.name}`, 14, yPos);
    yPos += 8;
    
    pdf.setFontSize(10);
    const details = [
      `Category: ${selectedCrop.category}`,
      `Current Price: ₹${selectedCrop.currentPrice.toLocaleString()} ${selectedCrop.unit}`,
      `Previous Price: ₹${selectedCrop.previousPrice.toLocaleString()} ${selectedCrop.unit}`,
      `Predicted Price: ₹${selectedCrop.predictedPrice.toLocaleString()} ${selectedCrop.unit}`,
      `Trend: ${selectedCrop.trend.toUpperCase()}`,
      `Prediction Confidence: ${selectedCrop.confidence}%`,
    ];
    
    details.forEach(line => {
      pdf.text(line, 14, yPos);
      yPos += 6;
    });
  }
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('CropPrice - AI-Powered Agricultural Market Intelligence', pageWidth / 2, 290, { align: 'center' });
  
  pdf.save(`crop_market_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
