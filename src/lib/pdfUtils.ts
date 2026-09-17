import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

export async function exportElementToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }
  
  try {
    const dataUrl = await htmlToImage.toPng(element, { 
      pixelRatio: 2,
      skipFonts: true,
      cacheBust: true,
      fontEmbedCSS: '',
      backgroundColor: '#ffffff'
    });
    
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (img.height * pdfWidth) / img.width;
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (err) {
    console.error('Failed to export PDF:', err);
  }
}
