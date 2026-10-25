import { jsPDF } from 'jspdf';
import { Student, SchoolProfile } from '../types';

interface GenerateCardsPdfOptions {
  students: Student[];
  schoolProfile: SchoolProfile;
  side: 'front' | 'back' | 'both';
  layout: '8' | '10'; // 8 cards (2x4) or 10 cards (2x5)
  showCutLines: boolean;
  codeType: 'QR' | 'BARCODE';
  qrDataUrls: Record<string, string>; // NISN -> dataURL
  barcodeDataUrls: Record<string, string>; // NISN -> dataURL
}

export const generateStudentCardsPDF = async ({
  students,
  schoolProfile,
  side,
  layout,
  showCutLines,
  codeType,
  qrDataUrls,
  barcodeDataUrls,
}: GenerateCardsPdfOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // A4 dimensions: 210mm x 297mm
  const cardW = 54; // mm (CR80 standard)
  const cardH = 85.6; // mm (CR80 standard)

  const cols = 2;
  const rows = layout === '8' ? 4 : 5;
  const cardsPerPage = cols * rows;

  // Margins
  const totalCardsW = cols * cardW;
  const marginX = (210 - totalCardsW) / (cols + 1);
  const totalCardsH = rows * cardH;
  const marginY = (297 - totalCardsH) / (rows + 1);

  // Helper to draw Front Card
  const drawFrontCard = (s: Student, x: number, y: number) => {
    // Background & Border
    doc.setDrawColor(2, 132, 199); // sky-600
    doc.setLineWidth(0.4);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');

    // Header gradient/colored top bar
    doc.setFillColor(15, 23, 42); // slate-900 / blue-950
    doc.roundedRect(x, y, cardW, 14, 2.5, 2.5, 'F');
    // Square off bottom corners of header
    doc.rect(x, y + 10, cardW, 4, 'F');

    // School Name in Header
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('KARTU PELAJAR RESMI', x + cardW / 2, y + 5.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text(schoolProfile.namaSekolah || 'SMA NEGERI 109 JAKARTA', x + cardW / 2, y + 9.5, { align: 'center' });

    doc.setFontSize(4.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`NPSN: ${schoolProfile.npsn || '20102564'} • Jakarta Selatan`, x + cardW / 2, y + 12.5, { align: 'center' });

    // Photo Area (20mm x 30mm)
    const photoX = x + 3.5;
    const photoY = y + 17;
    const photoW = 19;
    const photoH = 28.5; // ~2:3 ratio

    if (s.foto) {
      try {
        doc.addImage(s.foto, 'JPEG', photoX, photoY, photoW, photoH);
      } catch (e) {
        // Fallback placeholder rect
        doc.setFillColor(226, 232, 240);
        doc.rect(photoX, photoY, photoW, photoH, 'F');
      }
    } else {
      doc.setFillColor(226, 232, 240);
      doc.rect(photoX, photoY, photoW, photoH, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(5);
      doc.text('Pas Foto 2x3', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(photoX, photoY, photoW, photoH, 'D');

    // Student Information
    const infoX = photoX + photoW + 3;
    let textY = y + 19;

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(4.5);
    doc.text('NAMA SISWA:', infoX, textY);

    textY += 3.5;
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    // Ensure student name does not cut off: truncate or size
    const displayName = s.nama.length > 22 ? s.nama.substring(0, 20) + '...' : s.nama;
    doc.setFontSize(6);
    doc.text(displayName, infoX, textY);

    textY += 4.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text('NISN / ID:', infoX, textY);

    textY += 3;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(s.nisn, infoX, textY);

    textY += 4.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text('KELAS:', infoX, textY);

    textY += 3;
    doc.setTextColor(2, 132, 199); // sky-600
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(s.kelas, infoX, textY);

    textY += 4.5;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text('THN AJARAN:', infoX, textY);

    textY += 3;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(s.tahun || schoolProfile.tahunAjaranAktif, infoX, textY);

    // Code area (QR or Barcode)
    const codeAreaY = y + 49;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(x + 3, codeAreaY, x + cardW - 3, codeAreaY);

    if (codeType === 'QR' && qrDataUrls[s.nisn]) {
      try {
        const qrSize = 22;
        doc.addImage(qrDataUrls[s.nisn], 'PNG', x + (cardW - qrSize) / 2, codeAreaY + 3, qrSize, qrSize);
        doc.setFontSize(5);
        doc.setTextColor(71, 85, 105);
        doc.text(`KODE IDENTITAS: ${s.nisn}`, x + cardW / 2, codeAreaY + 28, { align: 'center' });
      } catch (e) {}
    } else if (barcodeDataUrls[s.nisn]) {
      try {
        const bcW = 46;
        const bcH = 18;
        doc.addImage(barcodeDataUrls[s.nisn], 'PNG', x + (cardW - bcW) / 2, codeAreaY + 4, bcW, bcH);
      } catch (e) {}
    }

    // Card Footer Bottom Stripe
    doc.setFillColor(2, 132, 199);
    doc.rect(x, y + cardH - 3, cardW, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text('KARTU PRESI & PELAJAR RESMI DKI JAKARTA', x + cardW / 2, y + cardH - 1, { align: 'center' });
  };

  // Helper to draw Back Card
  const drawBackCard = (s: Student, x: number, y: number) => {
    // Background & Border
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.4);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');

    // Header Back
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(x, y, cardW, 10, 2.5, 2.5, 'F');
    doc.rect(x, y + 7, cardW, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('TATA TERTIB KARTU PELAJAR', x + cardW / 2, y + 6.5, { align: 'center' });

    // Rules Text
    let ruleY = y + 14;
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);

    const rules = schoolProfile.tataTertibKartu || [
      '1. Kartu ini adalah identitas resmi siswa SMA Negeri 109 Jakarta.',
      '2. Wajib dibawa setiap hari sekolah dan saat kegiatan resmi.',
      '3. Kartu digunakan untuk presensi gerbang, perpustakaan & ujian.',
      '4. Dilarang meminjamkan atau memindahtangankan kartu kepada siapapun.',
      '5. Kehilangan kartu harap segera lapor ke bagian Tata Usaha (TU).',
    ];

    rules.slice(0, 5).forEach((rule, idx) => {
      const splitText = doc.splitTextToSize(`${idx + 1}. ${rule.replace(/^[0-9]+[.\s]+/, '')}`, cardW - 7);
      doc.text(splitText, x + 3.5, ruleY);
      ruleY += splitText.length * 2.8 + 1.2;
    });

    // Signature Area
    const sigY = y + cardH - 26;
    doc.setFontSize(4.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Jakarta, 15 Juli 2025`, x + cardW - 4, sigY, { align: 'right' });
    doc.text(`Kepala SMA Negeri 109 Jakarta`, x + cardW - 4, sigY + 3.5, { align: 'right' });

    // Stamp mark representation
    doc.setDrawColor(220, 38, 38); // red stamp
    doc.setLineWidth(0.4);
    doc.circle(x + cardW - 24, sigY + 9, 5, 'D');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(3.5);
    doc.text('SMAN 109', x + cardW - 24, sigY + 8.5, { align: 'center' });
    doc.text('JAKARTA', x + cardW - 24, sigY + 10.5, { align: 'center' });

    // Principal name
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.text(schoolProfile.kepalaSekolah || 'Dr. Hj. Siti Fatimah, M.Pd.', x + cardW - 4, sigY + 16, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4);
    doc.text(`NIP. ${schoolProfile.nipKepalaSekolah || '19680512 199403 2 001'}`, x + cardW - 4, sigY + 19, { align: 'right' });

    // Bottom Stripe
    doc.setFillColor(15, 23, 42);
    doc.rect(x, y + cardH - 3, cardW, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(4);
    doc.text(`ID Siswa: ${s.nisn} • ${s.nama.substring(0, 15)}`, x + cardW / 2, y + cardH - 1, { align: 'center' });
  };

  // Helper for Cut Lines
  const drawCutMarks = (x: number, y: number) => {
    if (!showCutLines) return;
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5, 1.5], 0);

    // Outline around card
    doc.rect(x - 0.5, y - 0.5, cardW + 1, cardH + 1, 'D');
    doc.setLineDashPattern([], 0); // reset
  };

  // Determine what cards to render
  const cardItems: Array<{ student: Student; side: 'front' | 'back' }> = [];
  students.forEach((s) => {
    if (side === 'front') {
      cardItems.push({ student: s, side: 'front' });
    } else if (side === 'back') {
      cardItems.push({ student: s, side: 'back' });
    } else {
      // Both: front then back paired
      cardItems.push({ student: s, side: 'front' });
      cardItems.push({ student: s, side: 'back' });
    }
  });

  // Render pages
  const totalCards = cardItems.length;
  let currentCardIndex = 0;

  while (currentCardIndex < totalCards) {
    if (currentCardIndex > 0) {
      doc.addPage();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentCardIndex >= totalCards) break;

        const item = cardItems[currentCardIndex];
        const posX = marginX + c * (cardW + marginX);
        const posY = marginY + r * (cardH + marginY);

        drawCutMarks(posX, posY);

        if (item.side === 'front') {
          drawFrontCard(item.student, posX, posY);
        } else {
          drawBackCard(item.student, posX, posY);
        }

        currentCardIndex++;
      }
    }
  }

  // Save PDF
  const filename = `Kartu_Pelajar_SMAN109_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
