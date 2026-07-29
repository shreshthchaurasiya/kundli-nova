import { jsPDF } from 'jspdf';
import { 
  KundliNovaNatalChart, 
  KundliNovaVimshottariDasha, 
  KundliNovaDoshaAnalysis, 
  KundliNovaYogaAnalysis,
  KundliNovaDetailedReport,
  KundliNovaCompatibilityAnalysis,
  KundliNovaManglikAnalysis
} from '../server/types/astrologyProvider';
import {
  getKootaMetadata,
  getCompatibilityCategory,
  buildMatchSummary
} from '../features/astrology/compatibilityMetadata';

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
  await new Promise((resolve) => setTimeout(resolve, 300));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { birthDetails, chart, dasha, dosha, yoga, detailedReport, generatedAt } = data;

  const drawSubtleOrangeDivider = (y: number) => {
    doc.setDrawColor(255, 138, 0); // Orange
    doc.setLineWidth(0.2);
    doc.line(20, y, 190, y);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
  };

  const getLagnaZodiacNumber = (): number => {
    const lagnaLower = (chart.ascendant?.sign || 'Aries').toLowerCase();
    if (lagnaLower.includes('mesh') || lagnaLower.includes('aries')) return 1;
    if (lagnaLower.includes('vrishabha') || lagnaLower.includes('taurus')) return 2;
    if (lagnaLower.includes('mithuna') || lagnaLower.includes('gemini')) return 3;
    if (lagnaLower.includes('karka') || lagnaLower.includes('cancer')) return 4;
    if (lagnaLower.includes('simha') || lagnaLower.includes('leo')) return 5;
    if (lagnaLower.includes('kanya') || lagnaLower.includes('virgo')) return 6;
    if (lagnaLower.includes('tula') || lagnaLower.includes('libra')) return 7;
    if (lagnaLower.includes('vrishchika') || lagnaLower.includes('scorpio')) return 8;
    if (lagnaLower.includes('dhanu') || lagnaLower.includes('sagittarius')) return 9;
    if (lagnaLower.includes('makara') || lagnaLower.includes('capricorn')) return 10;
    if (lagnaLower.includes('kumbha') || lagnaLower.includes('aquarius')) return 11;
    if (lagnaLower.includes('meena') || lagnaLower.includes('pisces')) return 12;
    return 1;
  };

  const getZodiacNumberForHouse = (houseNum: number): number => {
    const base = getLagnaZodiacNumber();
    const result = (base + houseNum - 1) % 12;
    return result === 0 ? 12 : result;
  };

  // 1. Title Header & Branding
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 138, 0);
  doc.text('KUNDLI NOVA', 20, 20);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Vedic Astrological Report & Life Analysis', 20, 25);
  doc.text(`Generated on: ${generatedAt}`, 140, 20);

  doc.setDrawColor(245, 242, 235);
  doc.setLineWidth(0.5);
  doc.line(20, 28, 190, 28);

  // 2. Birth Profile Title & Details Block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(`${birthDetails.name}'s Complete Janam Kundli`, 20, 36);

  doc.setFillColor(253, 252, 247);
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

  // 3. Essential Astrological Constants Grid
  let yOffset = 74;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Astrological Constants', 20, yOffset);

  const cols = 3;
  const colWidth = 54;
  const rowHeight = 11;
  const boxXStart = 20;
  const boxYStart = 78;

  const constants = [
    { label: 'Lagna (Ascendant)', val: chart.ascendant?.sign || 'Aries' },
    { label: 'Sun Sign', val: chart.sunSign || chart.planets?.find(p => p.name.toLowerCase() === 'sun')?.sign || 'Aries' },
    { label: 'Moon Sign (Rashi)', val: chart.moonSign || chart.planets?.find(p => p.name.toLowerCase() === 'moon')?.sign || 'Taurus' },
    { label: 'Nakshatra', val: chart.nakshatra || 'Rohini' },
    { label: 'Ascendant Degree', val: chart.ascendant?.degree !== undefined ? `${Number(chart.ascendant.degree).toFixed(2)}°` : 'Unknown' },
    { label: 'Current Dasha', val: dasha?.currentMahadasha?.planet ? `${dasha.currentMahadasha.planet} Mahadasha` : 'Active' },
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

  // 4. North Indian Kundli Chart Drawing with Sign Numbers (1-12) & Planet Placements
  yOffset = 112;
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Lagna Chart (D1)', 20, yOffset);

  const cx = 20;
  const cy = 116;
  const size = 52;

  // Outer boundary square
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.65);
  doc.rect(cx, cy, size, size, 'S');

  // Diagonals
  doc.setLineWidth(0.45);
  doc.line(cx, cy, cx + size, cy + size);
  doc.line(cx + size, cy, cx, cy + size);

  // Inner Diamond
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
      'Rahu': 'Ra', 'Ketu': 'Ke'
    };
    const found = (chart.planets || [])
      .filter(p => p.house === houseNum)
      .map(p => abbreviations[p.name] || p.name.substring(0, 2));
    if (houseNum === 1) found.unshift('Lg');
    return found.join(', ');
  };

  // Render Zodiac Sign Numbers (1-12) & Planets in exact North Indian Chart Positions
  const houseCoords = [
    { house: 1, signX: cx + size / 2, signY: cy + size / 4 + 2, plX: cx + size / 2, plY: cy + size / 4 - 3 },
    { house: 2, signX: cx + size / 4 + 2, signY: cy + size / 8 + 3, plX: cx + size / 4 - 3, plY: cy + size / 8 - 1 },
    { house: 3, signX: cx + size / 8 + 3, signY: cy + size / 4 + 4, plX: cx + size / 8 - 1, plY: cy + size / 4 - 1 },
    { house: 4, signX: cx + size / 4 + 4, signY: cy + size / 2 + 1, plX: cx + size / 4 - 3, plY: cy + size / 2 + 1 },
    { house: 5, signX: cx + size / 8 + 3, signY: cy + 3 * size / 4 - 1, plX: cx + size / 8 - 1, plY: cy + 3 * size / 4 + 4 },
    { house: 6, signX: cx + size / 4 + 2, signY: cy + 7 * size / 8 - 1, plX: cx + size / 4 - 3, plY: cy + 7 * size / 8 + 3 },
    { house: 7, signX: cx + size / 2, signY: cy + 3 * size / 4 - 2, plX: cx + size / 2, plY: cy + 3 * size / 4 + 4 },
    { house: 8, signX: cx + 3 * size / 4 - 2, signY: cy + 7 * size / 8 - 1, plX: cx + 3 * size / 4 + 3, plY: cy + 7 * size / 8 + 3 },
    { house: 9, signX: cx + 7 * size / 8 - 3, signY: cy + 3 * size / 4 - 1, plX: cx + 7 * size / 8 + 1, plY: cy + 3 * size / 4 + 4 },
    { house: 10, signX: cx + 3 * size / 4 - 4, signY: cy + size / 2 + 1, plX: cx + 3 * size / 4 + 3, plY: cy + size / 2 + 1 },
    { house: 11, signX: cx + 7 * size / 8 - 3, signY: cy + size / 4 + 4, plX: cx + 7 * size / 8 + 1, plY: cy + size / 4 - 1 },
    { house: 12, signX: cx + 3 * size / 4 - 2, signY: cy + size / 8 + 3, plX: cx + 3 * size / 4 + 3, plY: cy + size / 8 - 1 },
  ];

  houseCoords.forEach(pos => {
    // Zodiac Sign Number in Orange
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 138, 0);
    doc.text(String(getZodiacNumberForHouse(pos.house)), pos.signX, pos.signY, { align: 'center' });

    // Planets in House in Dark Color
    const planetsStr = getPlanetsInHouse(pos.house);
    if (planetsStr) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(17, 24, 39);
      doc.text(planetsStr, pos.plX, pos.plY, { align: 'center' });
    }
  });

  // 5. Planetary Positions Table
  const tableX = 78;
  const tableY = 112;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Planetary Positions (9 Grahas)', tableX, tableY);

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

  (chart.planets || []).forEach((p, idx) => {
    const rowY = tableY + 14 + idx * 5.1;
    doc.text(p.name, tableX + 3, rowY);
    doc.text(p.sign, tableX + 38, rowY);
    doc.text(String(p.house), tableX + 68, rowY);
    const degreeText = p.degree !== undefined 
      ? `${Number(p.degree).toFixed(2)}°` 
      : (p.degreeInSign !== undefined ? `${Number(p.degreeInSign).toFixed(2)}°` : 'Direct');
    doc.text(degreeText, tableX + 85, rowY);
    doc.line(tableX, rowY + 1.5, tableX + 112, rowY + 1.5);
  });

  const tableBottom = tableY + 14 + (chart.planets?.length || 0) * 5.1;

  // 6. Educational Astrological Explanation Box: Lagna vs Moon Sign
  yOffset = Math.max(175, tableBottom + 10);
  drawSubtleOrangeDivider(yOffset - 3.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Understanding Your Chart: Lagna vs Moon Sign (Rashi)', 20, yOffset);

  doc.setFillColor(253, 252, 247);
  doc.rect(20, yOffset + 4, 170, 22, 'F');
  doc.setDrawColor(245, 242, 235);
  doc.rect(20, yOffset + 4, 170, 22, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 138, 0);
  doc.text('Lagna (Ascendant):', 24, yOffset + 9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(`Your Lagna is ${chart.ascendant?.sign || 'Aries'}. It governs your physical self, outer personality, health, and life direction.`, 55, yOffset + 9);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(255, 138, 0);
  doc.text('Moon Sign (Rashi):', 24, yOffset + 15);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(`Your Rashi is ${chart.moonSign || 'Taurus'}. It governs your inner mind, emotions, subconscious reactions, and mental peace.`, 55, yOffset + 15);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(255, 138, 0);
  doc.text('Nakshatra:', 24, yOffset + 21);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(`Your Birth Nakshatra is ${chart.nakshatra || 'Rohini'}, ruling your innate instincts, temperaments, and karmic traits.`, 44, yOffset + 21);

  // PAGE 2: Vimshottari Dasha & Complete Timeline
  doc.addPage();
  yOffset = 20;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 138, 0);
  doc.text('KUNDLI NOVA - VIMSHOTTARI DASHA TIMELINE', 20, yOffset);
  yOffset += 10;

  if (dasha) {
    doc.setFillColor(253, 252, 247);
    doc.rect(20, yOffset, 170, 16, 'F');
    doc.rect(20, yOffset, 170, 16, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(`Active Mahadasha: ${dasha.currentMahadasha.planet}`, 25, yOffset + 6);
    if (dasha.currentAntardasha) {
      doc.text(`Active Antardasha: ${dasha.currentAntardasha.planet}`, 105, yOffset + 6);
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Current Mahadasha is active from ${new Date(dasha.currentMahadasha.startDate).toLocaleDateString('en-IN')} to ${new Date(dasha.currentMahadasha.endDate).toLocaleDateString('en-IN')}`, 25, yOffset + 12);
    
    yOffset += 24;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Vimshottari 120-Year Planetary Timeline', 20, yOffset);
    yOffset += 6;

    // Table of Mahadashas
    doc.setFillColor(249, 250, 251);
    doc.rect(20, yOffset, 170, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('Mahadasha Planet', 25, yOffset + 4);
    doc.text('Start Date', 85, yOffset + 4);
    doc.text('End Date', 145, yOffset + 4);
    yOffset += 7;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);

    dasha.mahadashaTimeline.forEach((period) => {
      const isCurrent = period.planet === dasha.currentMahadasha.planet;
      if (isCurrent) {
        doc.setFillColor(254, 243, 199);
        doc.rect(20, yOffset - 1, 170, 5.5, 'F');
      }
      doc.text(`${period.planet} Mahadasha`, 25, yOffset + 3);
      doc.text(new Date(period.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), 85, yOffset + 3);
      doc.text(new Date(period.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), 145, yOffset + 3);
      doc.line(20, yOffset + 4.5, 190, yOffset + 4.5);
      yOffset += 6;
    });
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Vimshottari Dasha calculations are based on exact birth time and Moon nakshatra degrees.', 20, yOffset);
  }

  // PAGE 3: Dosha & Planetary Yoga Deep-Dive
  doc.addPage();
  yOffset = 20;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 138, 0);
  doc.text('KUNDLI NOVA - DOSHA & YOGA ANALYSIS', 20, yOffset);
  yOffset += 10;

  if (dosha) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Vedic Dosha Evaluation', 20, yOffset);
    yOffset += 6;

    dosha.results.forEach(d => {
      if (yOffset > 260) { doc.addPage(); yOffset = 20; }
      const statusText = d.calculationStatus === 'unavailable' ? 'Unavailable' : (d.detected ? 'PRESENT' : 'NOT PRESENT');
      
      doc.setFillColor(d.detected ? 254 : 240, d.detected ? 243 : 253, d.detected ? 199 : 244);
      doc.rect(20, yOffset, 170, 7, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text(d.name, 24, yOffset + 5);

      doc.setFontSize(8);
      doc.setTextColor(d.detected ? 180 : 16, d.detected ? 83 : 185, d.detected ? 9 : 129);
      doc.text(statusText, 160, yOffset + 5);
      yOffset += 9;

      if (d.summary) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(75, 85, 99);
        const lines = doc.splitTextToSize(d.summary, 165);
        doc.text(lines, 24, yOffset);
        yOffset += (lines.length * 4) + 4;
      }
    });
  }

  yOffset += 4;
  if (yoga) {
    if (yOffset > 240) { doc.addPage(); yOffset = 20; }
    drawSubtleOrangeDivider(yOffset - 3);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Auspicious Planetary Yogas Detected', 20, yOffset);
    yOffset += 6;

    const presentYogas = (yoga.results || []).filter(y => y.detected);
    if (presentYogas.length === 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text('No adverse or extreme planetary yogas detected.', 20, yOffset);
      yOffset += 6;
    } else {
      presentYogas.forEach(y => {
        if (yOffset > 260) { doc.addPage(); yOffset = 20; }
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 138, 0);
        doc.text(`• ${y.name}`, 20, yOffset);
        yOffset += 4;

        if (y.summary) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(75, 85, 99);
          const lines = doc.splitTextToSize(y.summary, 165);
          doc.text(lines, 24, yOffset);
          yOffset += (lines.length * 4) + 3;
        }
      });
    }
  }

  // PAGE 4: Detailed Life Predictions & Vedic Remedies
  doc.addPage();
  yOffset = 20;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 138, 0);
  doc.text('KUNDLI NOVA - LIFE PREDICTIONS & VEDIC REMEDIES', 20, yOffset);
  yOffset += 10;

  if (detailedReport) {
    const writeSection = (heading: string, summary: string | null | undefined) => {
      if (!summary) return;
      if (yOffset > 250) { doc.addPage(); yOffset = 20; }
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
        yOffset += 4.2;
      });
      yOffset += 3;
    };

    writeSection('Executive Summary', detailedReport.executiveSummary);
    writeSection('Ascendant & Personality Analysis', detailedReport.ascendant?.summary);
    
    if (detailedReport.lifeDomains) {
      if (yOffset > 240) { doc.addPage(); yOffset = 20; }
      drawSubtleOrangeDivider(yOffset - 3);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 138, 0);
      doc.text('Core Life Domains', 20, yOffset);
      yOffset += 8;
      
      writeSection('Career & Profession', detailedReport.lifeDomains.career);
      writeSection('Wealth & Finances', detailedReport.lifeDomains.wealthAndProperty);
      writeSection('Education & Intellect', detailedReport.lifeDomains.education);
      writeSection('Love, Marriage & Relationships', detailedReport.lifeDomains.loveAndMarriage);
      writeSection('Health & Vitality', detailedReport.lifeDomains.health);
      writeSection('Family & Children', detailedReport.lifeDomains.familyAndChildren);
    }

    if (detailedReport.houseAnalysis?.houses) {
      detailedReport.houseAnalysis.houses.forEach(h => {
        writeSection(`House ${h.houseNumber} Astrological Analysis`, h.summary);
      });
    }
    writeSection('Nakshatra & Soul Purpose', detailedReport.nakshatraAnalysis?.summary);
    writeSection('Vimshottari Dasha Analysis', (detailedReport.dashaSummary as any)?.summary);
    
    // Dynamic Dosha Summary
    let doshaText = 'No major doshas detected in your chart.';
    const detectedDoshas = detailedReport.bundledDosha?.results?.filter((d: any) => d.detected) || [];
    if (detectedDoshas.length > 0) {
      doshaText = `The analysis indicates the presence of ${detectedDoshas.map((d: any) => d.name).join(' and ')}. Please refer to the Dosha Analysis section for detailed effects and remedies.`;
    }
    writeSection('Dosha & Challenges Evaluation', doshaText);

    // Dynamic Yoga Summary
    let yogaText = 'No prominent yogas detected in the basic analysis.';
    const detectedYogas = detailedReport.bundledYoga?.results?.filter((y: any) => y.detected) || [];
    if (detectedYogas.length > 0) {
      yogaText = `Your chart is blessed with auspicious yogas including ${detectedYogas.map((y: any) => y.name).join(', ')}. Please see the Yoga section for their positive implications.`;
    }
    writeSection('Auspicious Yoga Implications', yogaText);
  }

  // Vedic Remedies Section
  if (yOffset > 220) { doc.addPage(); yOffset = 20; }
  drawSubtleOrangeDivider(yOffset - 3);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Personalized Vedic Remedies & Fasting Advice', 20, yOffset);
  yOffset += 6;

  const getGemstoneForSign = (sign: string | undefined | null) => {
    if (!sign) return 'an appropriate gemstone';
    const s = sign.toUpperCase();
    if (['ARIES', 'SCORPIO'].includes(s)) return 'Red Coral (Moonga)';
    if (['TAURUS', 'LIBRA'].includes(s)) return 'Diamond or White Sapphire (Opal/Zircon)';
    if (['GEMINI', 'VIRGO'].includes(s)) return 'Emerald (Panna)';
    if (['CANCER'].includes(s)) return 'Pearl (Moti)';
    if (['LEO'].includes(s)) return 'Ruby (Manik)';
    if (['SAGITTARIUS', 'PISCES'].includes(s)) return 'Yellow Sapphire (Pukhraj)';
    if (['CAPRICORN', 'AQUARIUS'].includes(s)) return 'Blue Sapphire (Neelam)';
    return 'an appropriate gemstone';
  };

  const remedies = [
    { title: 'Gemstone Advice', desc: `Based on your ${chart.ascendant?.sign || 'Lagna'} ascendant, wearing a ${getGemstoneForSign(chart.ascendant?.sign)} is recommended to strengthen planetary vibrations. Wear only after proper ritual energizing.` },
    { title: 'Auspicious Mantras', desc: 'Recite Vishnu Sahasranama or Gayatri Mantra daily morning for mental peace and prosperity.' },
    { title: 'Favourable Days & Colors', desc: 'Thursdays and Sundays bring enhanced luck and positivity. Favor warm orange and yellow shades.' },
  ];

  remedies.forEach((r) => {
    if (yOffset > 260) { doc.addPage(); yOffset = 20; }
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 138, 0);
    doc.text(`• ${r.title}`, 20, yOffset);
    yOffset += 4;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    const lines = doc.splitTextToSize(r.desc, 165);
    doc.text(lines, 24, yOffset);
    yOffset += (lines.length * 4) + 3;
  });

  if (detailedReport?.luckyItems) {
    if (yOffset > 240) { doc.addPage(); yOffset = 20; }
    yOffset += 5;
    drawSubtleOrangeDivider(yOffset - 3);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Auspicious & Lucky Elements', 20, yOffset);
    yOffset += 6;
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(`Favorable Colors: ${detailedReport.luckyItems.colors?.join(', ') || 'Warm neutral tones'}`, 24, yOffset);
    yOffset += 5;
    doc.text(`Lucky Days: ${detailedReport.luckyItems.days?.join(', ') || 'Thursdays'}`, 24, yOffset);
    yOffset += 5;
    doc.text(`Auspicious Numbers: ${detailedReport.luckyItems.numbers?.join(', ') || '1, 9'}`, 24, yOffset);
    yOffset += 10;
  }

  // Footer Pagination across all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by Kundli Nova • Authentic Vedic Astrology Engine', 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, 175, 285);
  }

  // PDF Outputs
  const pdfBlob = doc.output('blob');
  const pdfBlobUrl = URL.createObjectURL(pdfBlob);
  const pdfBase64 = doc.output('datauristring');

  const download = (fileName = `Kundli_Nova_Report_${birthDetails.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`) => {
    doc.save(fileName);
  };

  return {
    pdfBlobUrl,
    pdfBase64,
    download,
  };
};

export interface KundliMatchingPdfPayload {
  profileA: {
    name: string;
    gender: string;
    dob: string;
    tob: string;
    city: string;
    state: string;
  };
  profileB: {
    name: string;
    gender: string;
    dob: string;
    tob: string;
    city: string;
    state: string;
  };
  compatibility: KundliNovaCompatibilityAnalysis;
  manglik?: KundliNovaManglikAnalysis | null;
  generatedAt: string;
}

export const generateKundliMatchingPdf = async (data: KundliMatchingPdfPayload): Promise<GeneratedPdfResult> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { profileA, profileB, compatibility, generatedAt } = data;

  const cleanNameA = profileA.name.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanNameB = profileB.name.replace(/[^a-zA-Z0-9]/g, '_');

  const matchCategoryLabel = getCompatibilityCategory(compatibility.totalScore);
  const matchSummary = buildMatchSummary(
    profileA.name,
    profileB.name,
    compatibility.totalScore,
    compatibility.maximumScore || 36,
    compatibility.factors || [],
    'compatible'
  );

  // Title Header & Branding
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 138, 0);
  doc.text('KUNDLI NOVA', 20, 20);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Kundli Matching & Ashtakoota Guna Milan Report', 20, 25);
  doc.text(`Generated on: ${generatedAt}`, 140, 20);

  doc.setDrawColor(245, 242, 235);
  doc.setLineWidth(0.5);
  doc.line(20, 28, 190, 28);

  // Profiles comparison summary
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(`${profileA.name} & ${profileB.name}`, 20, 36);

  // Total Score Banner
  doc.setFillColor(253, 252, 247);
  doc.rect(20, 42, 170, 24, 'F');
  doc.setDrawColor(245, 242, 235);
  doc.rect(20, 42, 170, 24, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 138, 0);
  doc.text(`${compatibility.totalScore} / ${compatibility.maximumScore || 36} Gunas`, 26, 54);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(`Compatibility: ${matchCategoryLabel}`, 100, 54);

  // Ashtakoota Breakdown Table
  let yOffset = 76;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Ashtakoota 8-Koota Breakdown', 20, yOffset);
  yOffset += 6;

  doc.setFillColor(249, 250, 251);
  doc.rect(20, yOffset, 170, 6, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Koota Name', 25, yOffset + 4);
  doc.text('Obtained / Max', 95, yOffset + 4);
  doc.text('Significance', 140, yOffset + 4);
  yOffset += 7;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);

  (compatibility.factors || []).forEach(k => {
    const meta = getKootaMetadata(k.code || k.name);
    doc.text(meta.title || k.name, 25, yOffset + 3);
    doc.text(`${k.score} / ${k.maximumScore}`, 95, yOffset + 3);
    doc.text(meta.description ? meta.description.substring(0, 30) + '...' : 'Harmonious', 140, yOffset + 3);
    doc.line(20, yOffset + 4.5, 190, yOffset + 4.5);
    yOffset += 6;
  });

  // Summary
  yOffset += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Vedic Astrological Match Commentary', 20, yOffset);
  yOffset += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  const lines = doc.splitTextToSize(matchSummary, 170);
  doc.text(lines, 20, yOffset);

  // Footer Pagination
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by Kundli Nova • Kundli Matching Engine', 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, 175, 285);
  }

  const pdfBlob = doc.output('blob');
  const pdfBlobUrl = URL.createObjectURL(pdfBlob);
  const pdfBase64 = doc.output('datauristring');

  const download = (fileName = `Kundli_Matching_${cleanNameA}_${cleanNameB}.pdf`) => {
    doc.save(fileName);
  };

  return {
    pdfBlobUrl,
    pdfBase64,
    download,
  };
};
