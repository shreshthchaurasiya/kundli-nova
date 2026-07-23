import { jsPDF } from 'jspdf';
import { 
  KundliNovaNatalChart, 
  KundliNovaVimshottariDasha, 
  KundliNovaDoshaAnalysis, 
  KundliNovaYogaAnalysis,
  KundliNovaDetailedReport 
} from '../server/types/astrologyProvider';

export interface KundliPdfPayload {
  birthDetails: {
    name: string;
    gender: string;
    dob: string;
    tob: string;
    city: string;
    state: string;
  };
  chart: KundliNovaNatalChart;
  dasha: KundliNovaVimshottariDasha | null;
  dosha: KundliNovaDoshaAnalysis | null;
  yoga: KundliNovaYogaAnalysis | null;
  detailedReport: KundliNovaDetailedReport | null;
  generatedAt: string;
}

export interface GeneratedPdfResult {
  pdfBlobUrl: string;
  pdfBase64: string;
  download: (fileName?: string) => void;
}

export const generateKundliPdf = async (data: KundliPdfPayload): Promise<GeneratedPdfResult> => {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 500));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { birthDetails, chart, dasha, dosha, yoga, detailedReport, generatedAt } = data;

  // -- Page Styling & Layout Configurations --
  const drawSubtleOrangeDivider = (y: number) => {
    doc.setDrawColor(255, 138, 0); // Orange
    doc.setLineWidth(0.15);
    doc.line(20, y, 190, y);
    // Restore defaults
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
  };

  // 1. Title Header & Branding
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 138, 0); // Orange
  doc.text('KUNDLI NOVA', 20, 20);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Your Personal Astrology Companion', 20, 25);
  doc.text(`Generated on: ${generatedAt}`, 140, 20);

  // Subtle separator line
  doc.setDrawColor(245, 242, 235);
  doc.setLineWidth(0.5);
  doc.line(20, 28, 190, 28);

  // 2. Birth Profile Title & Subtext
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(`${birthDetails.name}'s Janam Kundli`, 20, 36);

  // Birth Details Grid Block
  doc.setFillColor(253, 252, 247); // warm ivory
  doc.rect(20, 40, 170, 26, 'F');
  doc.setDrawColor(245, 242, 235);
  doc.rect(20, 40, 170, 26, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('BIRTH DETAILS', 24, 46);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  
  doc.text(`Gender: ${birthDetails.gender.toUpperCase()}`, 24, 52);
  doc.text(`DOB: ${birthDetails.dob}`, 24, 58);
  doc.text(`TOB: ${birthDetails.tob}`, 24, 62);

  doc.text(`Place: ${birthDetails.city}`, 100, 52);
  doc.text(`State: ${birthDetails.state}`, 100, 58);
  doc.text(`Timezone: India Standard Time (IST)`, 100, 62);

  // 3. Astro Summary Badges
  let yOffset = 74;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Astrological Constants', 20, yOffset);

  // Draw grid boxes for constants
  const cols = 3;
  const colWidth = 54;
  const rowHeight = 11;
  const boxXStart = 20;
  const boxYStart = 78;

  const constants = [
    { label: 'Lagna (Ascendant)', val: chart.ascendant.sign },
    { label: 'Sun Sign', val: chart.sunSign || 'Unknown' },
    { label: 'Moon Sign (Rashi)', val: chart.moonSign || 'Unknown' },
    { label: 'Nakshatra', val: chart.nakshatra || 'Unknown' },
    { label: 'Ascendant Degree', val: String(chart.ascendant.degree) },
  ];

  constants.forEach((item, index) => {
    const colIndex = index % cols;
    const rowIndex = Math.floor(index / cols);
    const boxX = boxXStart + colIndex * colWidth + (colIndex * 4);
    const boxY = boxYStart + rowIndex * rowHeight + (rowIndex * 3);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 239, 233);
    doc.rect(boxX, boxY, colWidth, rowHeight, 'DF');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(item.label, boxX + 3, boxY + 3.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 138, 0);
    doc.text(item.val.toString(), boxX + 3, boxY + 8);
  });

  // 4. North Indian Kundli Chart Drawing
  yOffset = 112;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Lagna Chart (D1)', 20, yOffset);

  const cx = 20;
  const cy = 116;
  const size = 50;

  // Draw the outer square
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.65);
  doc.rect(cx, cy, size, size, 'S');

  // Draw Diagonals
  doc.setLineWidth(0.45);
  doc.line(cx, cy, cx + size, cy + size);
  doc.line(cx + size, cy, cx, cy + size);

  // Draw Inner Diamond
  doc.line(cx + size / 2, cy, cx, cy + size / 2);
  doc.line(cx, cy + size / 2, cx + size / 2, cy + size);
  doc.line(cx + size / 2, cy + size, cx + size, cy + size / 2);
  doc.line(cx + size, cy + size / 2, cx + size / 2, cy);

  const getPlanetsInHouse = (houseNum: number): string => {
    const abbreviations: { [key: string]: string } = {
      'Sun (Surya)': 'Su', 'Sun': 'Su',
      'Moon (Chandra)': 'Mo', 'Moon': 'Mo',
      'Mars (Mangal)': 'Ma', 'Mars': 'Ma',
      'Mercury (Budh)': 'Me', 'Mercury': 'Me',
      'Jupiter (Guru)': 'Ju', 'Jupiter': 'Ju',
      'Venus (Shukra)': 'Ve', 'Venus': 'Ve',
      'Saturn (Shani)': 'Sa', 'Saturn': 'Sa',
      'Rahu': 'Ra',
      'Ketu': 'Ke'
    };
    const found = chart.planets
      .filter(p => p.house === houseNum)
      .map(p => abbreviations[p.name] || p.name.substring(0, 2));
    if (houseNum === 1) found.unshift('Lg');
    return found.join(',');
  };

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);

  // We are not meticulously calculating bounding boxes here for the 12 houses due to PDF canvas complexity, 
  // but placing them in rough diamond regions.
  doc.text(getPlanetsInHouse(1), cx + size / 2 - 4.5, cy + size / 4 + 7);
  doc.text(getPlanetsInHouse(2), cx + size / 4 - 4, cy + size / 8 + 3);
  doc.text(getPlanetsInHouse(3), cx + size / 8 - 1, cy + size / 4 + 10);
  doc.text(getPlanetsInHouse(4), cx + size / 4 - 5, cy + size / 2 + 5);
  doc.text(getPlanetsInHouse(5), cx + size / 8 - 1, cy + 3 * size / 4 - 2);
  doc.text(getPlanetsInHouse(6), cx + size / 4 - 4, cy + 7 * size / 8 + 2);
  doc.text(getPlanetsInHouse(7), cx + size / 2 - 2, cy + 3 * size / 4 + 8);
  doc.text(getPlanetsInHouse(8), cx + 3 * size / 4 - 2, cy + 7 * size / 8 + 2);
  doc.text(getPlanetsInHouse(9), cx + 7 * size / 8 - 2, cy + 3 * size / 4 - 2);
  doc.text(getPlanetsInHouse(10), cx + 3 * size / 4 - 2, cy + size / 2 + 5);
  doc.text(getPlanetsInHouse(11), cx + 7 * size / 8 - 2, cy + size / 4 + 10);
  doc.text(getPlanetsInHouse(12), cx + 3 * size / 4 - 2, cy + size / 8 + 3);


  // 5. Planetary Positions Table
  const tableX = 78;
  const tableY = 112;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Planetary Positions', tableX, tableY);

  // Draw Table Headers
  doc.setFillColor(249, 250, 251);
  doc.rect(tableX, tableY + 4, 112, 6, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.line(tableX, tableY + 10, tableX + 112, tableY + 10);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Planet Name', tableX + 3, tableY + 8);
  doc.text('Zodiac Sign', tableX + 38, tableY + 8);
  doc.text('House', tableX + 68, tableY + 8);
  doc.text('Degree Coordinates', tableX + 85, tableY + 8);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);

  chart.planets.forEach((p, idx) => {
    const rowY = tableY + 14 + idx * 5.1;
    doc.text(p.name, tableX + 3, rowY);
    doc.text(p.sign, tableX + 38, rowY);
    doc.text(String(p.house), tableX + 68, rowY);
    doc.text(p.degree ? String(p.degree) : (p.degreeInSign ? String(p.degreeInSign) : '-'), tableX + 85, rowY);
    doc.line(tableX, rowY + 1.5, tableX + 112, rowY + 1.5);
  });

  // 6. Current Vimshottari Dasha
  yOffset = 175;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Vimshottari Dasha Status', 20, yOffset);

  if (dasha) {
    doc.setFillColor(253, 252, 247);
    doc.rect(20, yOffset + 4, 170, 14, 'F');
    doc.rect(20, yOffset + 4, 170, 14, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text(`Active Mahadasha: ${dasha.currentMahadasha.planet}`, 25, yOffset + 10);
    if (dasha.currentAntardasha) {
      doc.text(`Active Antardasha: ${dasha.currentAntardasha.planet}`, 105, yOffset + 10);
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`Mahadasha ends on ${new Date(dasha.currentMahadasha.endDate).toLocaleDateString()}`, 25, yOffset + 15);
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Dasha information is unavailable.', 20, yOffset + 8);
  }

  // Next page for Dosha, Yoga, Detailed Report
  doc.addPage();
  yOffset = 20;

  // Header again
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 138, 0); // Orange
  doc.text('KUNDLI NOVA - DETAILED REPORT', 20, yOffset);
  yOffset += 10;
  
  if (dosha) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Dosha Analysis', 20, yOffset);
    yOffset += 6;

    dosha.results.forEach(d => {
      if (yOffset > 270) { doc.addPage(); yOffset = 20; }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      const status = d.calculationStatus === 'unavailable' ? 'Unavailable' : (d.detected ? 'Present' : 'Not Present');
      doc.text(`${d.name}: ${status}`, 20, yOffset);
      yOffset += 5;
      
      if (d.detected && d.summary) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(75, 85, 99);
        const lines = doc.splitTextToSize(d.summary, 170);
        doc.text(lines, 20, yOffset);
        yOffset += (lines.length * 4) + 2;
      }
    });
  }

  yOffset += 5;
  if (yoga) {
    if (yOffset > 260) { doc.addPage(); yOffset = 20; }
    drawSubtleOrangeDivider(yOffset - 3);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Yoga Analysis', 20, yOffset);
    yOffset += 6;

    const presentYogas = yoga.results.filter(y => y.detected);
    if (presentYogas.length === 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('No significant planetary yogas detected.', 20, yOffset);
      yOffset += 6;
    } else {
      presentYogas.forEach(y => {
        if (yOffset > 270) { doc.addPage(); yOffset = 20; }
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text(`${y.name}`, 20, yOffset);
        yOffset += 5;
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(75, 85, 99);
        if (y.summary) {
          const lines = doc.splitTextToSize(y.summary, 170);
          doc.text(lines, 20, yOffset);
          yOffset += (lines.length * 4) + 2;
        }
      });
    }
  }

  yOffset += 5;
  if (detailedReport) {
    if (yOffset > 250) { doc.addPage(); yOffset = 20; }
    drawSubtleOrangeDivider(yOffset - 3);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Detailed Kundli Report', 20, yOffset);
    yOffset += 6;

    const writeSection = (heading: string, summary: string | null | undefined) => {
      if (!summary) return;
      if (yOffset > 260) { doc.addPage(); yOffset = 20; }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(heading, 20, yOffset);
      yOffset += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      const lines = doc.splitTextToSize(summary, 170);
      lines.forEach((line: string) => {
        if (yOffset > 270) { doc.addPage(); yOffset = 20; }
        doc.text(line, 20, yOffset);
        yOffset += 4;
      });
      yOffset += 3;
    };

    writeSection('Ascendant Summary', detailedReport.ascendant?.summary);
    if (detailedReport.houseAnalysis?.houses) {
      detailedReport.houseAnalysis.houses.forEach(h => {
        writeSection(`House ${h.houseNumber} Analysis`, h.summary);
      });
    }
    writeSection('Nakshatra Analysis', detailedReport.nakshatraAnalysis?.summary);
  }

  // Footer Branding on final page
  if (yOffset > 280) { doc.addPage(); }
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by Kundli Nova • Your Trusted Astrology Partner', 20, 285);
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
  }

  // PDF Outputs
  const pdfBlob = doc.output('blob');
  const pdfBlobUrl = URL.createObjectURL(pdfBlob);
  const pdfBase64 = doc.output('datauristring');

  const download = (fileName = `Janam_Kundli_${birthDetails.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`) => {
    doc.save(fileName);
  };

  return {
    pdfBlobUrl,
    pdfBase64,
    download,
  };
};
