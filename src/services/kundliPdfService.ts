import { jsPDF } from 'jspdf';
import { KundliData } from './kundliStorage';

export interface GeneratedPdfResult {
  pdfBlobUrl: string;
  pdfBase64: string;
  download: (fileName?: string) => void;
}

export const generateKundliPdf = async (data: KundliData): Promise<GeneratedPdfResult> => {
  // Simulate heavy processing for realism
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { birthDetails, astrologySummary, planetaryPositions, currentDasha, lifeInsights } = data;

  // -- Page Styling & Layout Configurations --
  const orangeHex = '#FF8A00';
  const neutralDark = '#111827';
  const neutralGray = '#4B5563';
  const softBorder = '#E5E7EB';

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
  doc.text('Your Personal Astro-AI Companion', 20, 25);
  doc.text(`Generated on: ${data.generatedAt}`, 140, 20);

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

  doc.text(`Place: ${birthDetails.city}, ${birthDetails.district}`, 100, 52);
  doc.text(`State: ${birthDetails.state}`, 100, 58);
  doc.text(`Timezone: India Standard Time (IST)`, 100, 62);

  // 3. Astro Summary Badges
  let yOffset = 74;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Astrological Constants', 20, yOffset);

  // Draw 6 grid boxes for constants
  const cols = 3;
  const colWidth = 54;
  const rowHeight = 11;
  const boxXStart = 20;
  const boxYStart = 78;

  const constants = [
    { label: 'Lagna (Ascendant)', val: astrologySummary.lagna },
    { label: 'Sun Sign', val: astrologySummary.sunSign },
    { label: 'Moon Sign (Rashi)', val: astrologySummary.moonSign },
    { label: 'Nakshatra', val: astrologySummary.nakshatra },
    { label: 'Moolank (Psychic)', val: String(astrologySummary.moolank) },
    { label: 'Bhagyank (Destiny)', val: String(astrologySummary.bhagyank) },
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
    doc.text(item.val, boxX + 3, boxY + 8);
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

  // Add House labels & Planet placements inside triangles
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 138, 0);

  // Helper labels
  doc.setFontSize(7);
  doc.text('Lagna', cx + size / 2 - 4, cy + size / 4 + 3);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Su, Bu', cx + size / 2 - 4.5, cy + size / 4 + 7);

  doc.text('Ch', cx + size / 4 - 4, cy + size / 8 + 3);
  doc.text('Sa, Sk', cx + size / 4 - 5, cy + size / 2 + 5);
  doc.text('Gu', cx + size / 8 - 1, cy + size / 4 + 10);
  doc.text('Ra', cx + size / 4 - 4, cy + 7 * size / 8 - 1);
  doc.text('Ma', cx + size / 2 - 2, cy + 3 * size / 4 + 8);
  doc.text('Ke', cx + 3 * size / 4 - 2, cy + size / 2 + 5);

  // 5. Planetary Positions Table
  const tableX = 78;
  const tableY = 112;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Planetary Positions & Coordinates', tableX, tableY);

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

  planetaryPositions.forEach((p, idx) => {
    const rowY = tableY + 14 + idx * 5.1;
    doc.text(p.name, tableX + 3, rowY);
    doc.text(p.zodiac, tableX + 38, rowY);
    doc.text(String(p.house), tableX + 68, rowY);
    doc.text(p.degree, tableX + 85, rowY);

    doc.line(tableX, rowY + 1.5, tableX + 112, rowY + 1.5);
  });

  // 6. Current Vimshottari Dasha
  yOffset = 175;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Vimshottari Dasha Status', 20, yOffset);

  doc.setFillColor(253, 252, 247);
  doc.rect(20, yOffset + 4, 170, 14, 'F');
  doc.rect(20, yOffset + 4, 170, 14, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`Active Mahadasha: ${currentDasha.mahadasha}`, 25, yOffset + 10);
  doc.text(`Active Antardasha: ${currentDasha.antardasha}`, 105, yOffset + 10);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Note: The current planetary transition phase shows elevated wisdom and auspicious professional beginnings.', 25, yOffset + 15);

  // 7. Life Insights & Guidance
  yOffset = 202;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Personalized Life Insights', 20, yOffset);

  const insights = [
    { label: 'Career & Growth', val: lifeInsights.career },
    { label: 'Marriage & Relationship', val: lifeInsights.marriage },
    { label: 'Wealth & Finance', val: lifeInsights.finance },
    { label: 'Health & Well-being', val: lifeInsights.health },
  ];

  insights.forEach((ins, idx) => {
    const rowY = yOffset + 4 + idx * 13;
    doc.setFillColor(255, 255, 255);
    doc.rect(20, rowY, 170, 11, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 138, 0);
    doc.text(ins.label, 24, rowY + 4);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(ins.val, 24, rowY + 8, { maxWidth: 162 });
  });

  // 8. Dynamic Remedies & Aura Balance
  yOffset = 260;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('Aura Balance Remedies:', 20, yOffset);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text('• Light a ghee lamp every Saturday evening near a peepal tree to support Shani Dev stability.', 20, yOffset + 4.5);
  doc.text('• Offer fresh copper-colored water to Surya Dev every morning during sunrise to energize career confidence.', 20, yOffset + 8.5);

  // Footer Branding
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by Kundli Nova • Your Trusted Astrology Partner', 20, 285);
  doc.text('Page 1 of 1', 170, 285);

  // PDF Outputs
  const pdfBlob = doc.output('blob');
  const pdfBlobUrl = URL.createObjectURL(pdfBlob);
  const pdfBase64 = doc.output('datauristring');

  const download = (fileName = `Janam_Kundli_${birthDetails.name}.pdf`) => {
    doc.save(fileName);
  };

  return {
    pdfBlobUrl,
    pdfBase64,
    download,
  };
};
