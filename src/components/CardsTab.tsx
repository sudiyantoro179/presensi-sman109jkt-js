import React, { useState, useEffect, useRef } from 'react';
import { Student, SchoolProfile, AdminUser } from '../types';
import { 
  CreditCard, 
  Printer, 
  Download, 
  Eye, 
  RotateCw, 
  CheckSquare, 
  Square, 
  Layers, 
  Edit3, 
  Upload, 
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2
} from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { generateStudentCardsPDF } from '../services/pdfGenerator';
import { logAdminActivity } from '../services/storage';

interface CardsTabProps {
  students: Student[];
  schoolProfile: SchoolProfile;
  currentUser: AdminUser;
  onUpdateSchoolProfile: (profile: SchoolProfile) => void;
}

export const CardsTab: React.FC<CardsTabProps> = ({
  students,
  schoolProfile,
  currentUser,
  onUpdateSchoolProfile,
}) => {
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [codeType, setCodeType] = useState<'QR' | 'BARCODE'>('QR');
  const [selectedNisns, setSelectedNisns] = useState<Set<string>>(new Set());

  // Data URLs cache for QR and Barcode rendering
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [bcMap, setBcMap] = useState<Record<string, string>>({});

  // Single card 3D flip zoom modal
  const [zoomStudent, setZoomStudent] = useState<Student | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Full A4 Sheet Preview Modal
  const [showA4Modal, setShowA4Modal] = useState(false);
  const [a4Side, setA4Side] = useState<'front' | 'back' | 'both'>('front');
  const [a4Layout, setA4Layout] = useState<'8' | '10'>('8');
  const [a4Zoom, setA4Zoom] = useState(90);
  const [a4Page, setA4Page] = useState(1);
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Edit Card Back (Tata Tertib) Modal
  const [showEditBackModal, setShowEditBackModal] = useState(false);
  const [backRulesText, setBackRulesText] = useState(
    schoolProfile.tataTertibKartu.join('\n')
  );

  const classesList = Array.from(new Set(students.map((s) => s.kelas))).sort();

  const filteredStudents = students.filter(
    (s) => selectedClass === 'ALL' || s.kelas === selectedClass
  );

  // Initialize all selected by default
  useEffect(() => {
    setSelectedNisns(new Set(filteredStudents.map((s) => s.nisn)));
  }, [selectedClass, students.length]);

  // Generate QR and Barcode Data URLs for each student
  useEffect(() => {
    const generateCodes = async () => {
      const newQr: Record<string, string> = {};
      const newBc: Record<string, string> = {};

      for (const s of filteredStudents) {
        try {
          // QR code
          const qrUrl = await QRCode.toDataURL(s.nisn, {
            margin: 1,
            width: 140,
            color: { dark: '#0284c7', light: '#ffffff' },
          });
          newQr[s.nisn] = qrUrl;

          // Barcode canvas to dataURL
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, s.nisn, {
            format: 'CODE128',
            height: 38,
            width: 1.4,
            displayValue: true,
            fontSize: 10,
            margin: 2,
            lineColor: '#0f172a',
          });
          newBc[s.nisn] = canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('Code render error:', e);
        }
      }
      setQrMap(newQr);
      setBcMap(newBc);
    };

    generateCodes();
  }, [filteredStudents.length, selectedClass]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNisns(new Set(filteredStudents.map((s) => s.nisn)));
    } else {
      setSelectedNisns(new Set());
    }
  };

  const toggleStudentSelection = (nisn: string) => {
    const next = new Set(selectedNisns);
    if (next.has(nisn)) next.delete(nisn);
    else next.add(nisn);
    setSelectedNisns(next);
  };

  // Upload Custom School Logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const newLogo = evt.target?.result as string;
      const updated = { ...schoolProfile, logoUrl: newLogo };
      onUpdateSchoolProfile(updated);
      logAdminActivity(currentUser, 'Kustomisasi Logo', 'Memperbarui logo sekolah untuk kartu pelajar');
    };
    reader.readAsDataURL(file);
  };

  // Save Back Rules
  const handleSaveBackRules = (e: React.FormEvent) => {
    e.preventDefault();
    const rulesArray = backRulesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const updated = { ...schoolProfile, tataTertibKartu: rulesArray };
    onUpdateSchoolProfile(updated);
    setShowEditBackModal(false);
    logAdminActivity(currentUser, 'Edit Belakang Kartu', 'Memperbarui tata tertib kartu pelajar');
  };

  // PDF Export
  const handleExportPDF = async () => {
    const studentsToPrint = filteredStudents.filter((s) => selectedNisns.has(s.nisn));
    if (studentsToPrint.length === 0) {
      alert('Pilih setidaknya 1 siswa untuk cetak kartu.');
      return;
    }

    await generateStudentCardsPDF({
      students: studentsToPrint,
      schoolProfile,
      side: a4Side,
      layout: a4Layout,
      showCutLines: showCutMarks,
      codeType,
      qrDataUrls: qrMap,
      barcodeDataUrls: bcMap,
    });

    logAdminActivity(
      currentUser,
      'Ekspor PDF Kartu',
      `Mencetak PDF ${studentsToPrint.length} kartu (${a4Side})`
    );
  };

  // Direct Browser Print
  const handleBrowserPrint = () => {
    window.print();
  };

  const selectedCount = filteredStudents.filter((s) => selectedNisns.has(s.nisn)).length;

  // Pagination for A4 Sheet Simulation
  const cardsPerPage = a4Layout === '8' ? 8 : 10;
  const itemsToRender = filteredStudents
    .filter((s) => selectedNisns.has(s.nisn))
    .flatMap((s) => {
      if (a4Side === 'front') return [{ student: s, side: 'front' as const }];
      if (a4Side === 'back') return [{ student: s, side: 'back' as const }];
      return [
        { student: s, side: 'front' as const },
        { student: s, side: 'back' as const },
      ];
    });

  const totalPages = Math.max(1, Math.ceil(itemsToRender.length / cardsPerPage));
  const currentSheetItems = itemsToRender.slice(
    (a4Page - 1) * cardsPerPage,
    a4Page * cardsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" /> Cetak Kartu Pelajar Standar (CR80)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dimensi potret standar fisik 5.4 cm × 8.56 cm, pas foto 2x3, CODE128 & QR Code otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowA4Modal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Eye className="w-4 h-4" /> Pratinjau Lembar A4 (Preview)
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Unduh File PDF Resmi (.pdf)
            </button>

            <button
              onClick={handleBrowserPrint}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Cetak Browser
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-slate-50 border rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-3 items-center mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Filter Kelas Siswa:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Kelas ({students.length})</option>
              {classesList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c} ({students.filter((s) => s.kelas === c).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Format Kode Kartu:
            </label>
            <select
              value={codeType}
              onChange={(e) => setCodeType(e.target.value as 'QR' | 'BARCODE')}
              className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="QR">QR Code (Standar Smartphone)</option>
              <option value="BARCODE">Barcode 1D (CODE128 Gun Scanner)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Logo Sekolah Kustom:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="text-[11px] text-slate-500 block w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowEditBackModal(true)}
              className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Edit Tata Tertib Belakang
            </button>
          </div>
        </div>

        {/* Selection summary */}
        <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-600">
          <span>
            {selectedCount} dari {filteredStudents.length} kartu siswa terpilih untuk dicetak
          </span>
          <label className="cursor-pointer flex items-center gap-1.5 text-blue-600 hover:text-blue-800">
            <input
              type="checkbox"
              checked={selectedCount === filteredStudents.length && filteredStudents.length > 0}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              className="rounded"
            />
            <span>Pilih Semua Siswa</span>
          </label>
        </div>

        {/* Cards Grid Preview */}
        <div className="bg-slate-100 p-4 sm:p-6 rounded-3xl max-h-[620px] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                Tidak ada data murid pada kelas terpilih.
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedNisns.has(s.nisn);
                return (
                  <div key={s.nisn} className="flex flex-col items-center gap-2">
                    {/* Card Actions Header */}
                    <div className="flex items-center justify-between w-[5.4cm] px-1 text-xs font-bold">
                      <label className="flex items-center gap-1 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(s.nisn)}
                          className="rounded"
                        />
                        <span>Cetak</span>
                      </label>

                      <button
                        onClick={() => {
                          setZoomStudent(s);
                          setIsFlipped(false);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px]"
                      >
                        <Maximize2 className="w-3 h-3" /> Zoom 3D
                      </button>
                    </div>

                    {/* Physical CR80 Card Front Display (5.4cm x 8.56cm) */}
                    <div className="w-[5.4cm] h-[8.56cm] bg-white rounded-xl shadow-md border-2 border-sky-600 relative overflow-hidden flex flex-col justify-between text-slate-800 select-none">
                      {/* Card Header Top */}
                      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-1.5 flex items-center gap-1.5 border-b-2 border-sky-400">
                        <img
                          src={schoolProfile.logoUrl || 'https://iili.io/CZUdvRa.jpg'}
                          alt="Logo"
                          className="w-7 h-7 object-contain bg-white rounded-md p-0.5 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://iili.io/CZUdvRa.jpg';
                          }}
                        />
                        <div className="overflow-hidden leading-tight text-left">
                          <h5 className="font-black text-[7.5px] uppercase tracking-tight text-white truncate">
                            KARTU PELAJAR RESMI
                          </h5>
                          <p className="font-extrabold text-[8px] text-sky-400 truncate">
                            {schoolProfile.namaSekolah}
                          </p>
                          <p className="text-[6px] text-slate-300">
                            NPSN: {schoolProfile.npsn} • DKI Jakarta
                          </p>
                        </div>
                      </div>

                      {/* Card Body: Photo 2x3 & Info */}
                      <div className="px-2 py-1.5 flex gap-2 items-center flex-grow">
                        {/* 2x3 Photo */}
                        <div className="w-[1.9cm] h-[2.85cm] bg-slate-100 border border-slate-300 rounded overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                          {s.foto ? (
                            <img src={s.foto} alt={s.nama} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-slate-400 text-center font-bold">
                              Pas Foto<br />2x3
                            </span>
                          )}
                        </div>

                        {/* Student Details (Auto scaled so text doesn't truncate badly) */}
                        <div className="text-[7.5px] space-y-1 overflow-hidden leading-tight text-left flex-grow">
                          <div>
                            <span className="text-[6px] text-slate-400 block font-bold">NAMA SISWA:</span>
                            <strong className="block font-black text-slate-950 text-[8.5px] truncate leading-tight">
                              {s.nama}
                            </strong>
                          </div>

                          <div>
                            <span className="text-[6px] text-slate-400 block font-bold">NISN / ID:</span>
                            <span className="font-mono font-bold text-slate-900 text-[8px]">{s.nisn}</span>
                          </div>

                          <div>
                            <span className="text-[6px] text-slate-400 block font-bold">KELAS:</span>
                            <span className="font-extrabold text-blue-700 text-[8px]">{s.kelas}</span>
                          </div>

                          <div>
                            <span className="text-[6px] text-slate-400 block font-bold">THN AJARAN:</span>
                            <span className="text-slate-700">{s.tahun || schoolProfile.tahunAjaranAktif}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Code Area */}
                      <div className="p-1 border-t border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-h-[38px]">
                        {codeType === 'QR' && qrMap[s.nisn] ? (
                          <div className="flex flex-col items-center">
                            <img src={qrMap[s.nisn]} alt="QR" className="w-10 h-10 object-contain" />
                            <span className="text-[6px] text-slate-500 font-mono mt-0.5">{s.nisn}</span>
                          </div>
                        ) : bcMap[s.nisn] ? (
                          <img src={bcMap[s.nisn]} alt="Barcode" className="w-full max-h-7 object-contain" />
                        ) : (
                          <span className="text-[7px] text-slate-400">Generating code...</span>
                        )}
                      </div>

                      {/* Bottom Color Stripe */}
                      <div className="bg-sky-600 text-white text-[5.5px] py-0.5 text-center font-bold tracking-wider">
                        KARTU PRESI & PELAJAR RESMI DKI JAKARTA
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Single Card 3D Flip Zoom Inspection */}
      {zoomStudent && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border flex flex-col items-center space-y-4 animate-scaleUp">
            <div className="w-full flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-800">Inspeksi Detail Kartu CR80</h3>
              <button
                onClick={() => setZoomStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Ukuran kartu standar 5.4 cm × 8.56 cm. Klik tombol putar balik untuk melihat sisi tata tertib & tanda tangan.
            </p>

            {/* 3D Flipping Card Container */}
            <div className="perspective-1000 my-2">
              <div
                className={`w-[5.4cm] h-[8.56cm] transition-transform duration-700 rounded-xl shadow-2xl relative ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front Side */}
                {!isFlipped ? (
                  <div className="w-full h-full bg-white rounded-xl border-2 border-sky-600 flex flex-col justify-between overflow-hidden text-slate-800">
                    <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-2 flex items-center gap-1.5 border-b-2 border-sky-400">
                      <img
                        src={schoolProfile.logoUrl || 'https://iili.io/CZUdvRa.jpg'}
                        alt="Logo"
                        className="w-8 h-8 object-contain bg-white rounded p-0.5 shrink-0"
                      />
                      <div>
                        <h5 className="font-black text-[8px] text-white">KARTU PELAJAR RESMI</h5>
                        <p className="font-extrabold text-[8.5px] text-sky-400 truncate">
                          {schoolProfile.namaSekolah}
                        </p>
                        <p className="text-[6.5px] text-slate-300">NPSN: {schoolProfile.npsn}</p>
                      </div>
                    </div>

                    <div className="px-2 py-1 flex gap-2 items-center flex-grow">
                      <div className="w-[1.9cm] h-[2.85cm] bg-slate-100 border rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {zoomStudent.foto ? (
                          <img
                            src={zoomStudent.foto}
                            alt={zoomStudent.nama}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400 font-bold">Pas Foto 2x3</span>
                        )}
                      </div>

                      <div className="text-[8px] space-y-1 overflow-hidden leading-tight flex-grow text-left">
                        <div>
                          <span className="text-[6.5px] text-slate-400 block font-bold">NAMA SISWA:</span>
                          <strong className="block font-black text-slate-950 text-[9px]">
                            {zoomStudent.nama}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[6.5px] text-slate-400 block font-bold">NISN / ID:</span>
                          <span className="font-mono font-bold text-slate-900 text-[8.5px]">
                            {zoomStudent.nisn}
                          </span>
                        </div>
                        <div>
                          <span className="text-[6.5px] text-slate-400 block font-bold">KELAS:</span>
                          <span className="font-extrabold text-blue-700 text-[8.5px]">
                            {zoomStudent.kelas}
                          </span>
                        </div>
                        <div>
                          <span className="text-[6.5px] text-slate-400 block font-bold">THN AJARAN:</span>
                          <span>{zoomStudent.tahun || schoolProfile.tahunAjaranAktif}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-1 border-t bg-slate-50 flex flex-col items-center justify-center min-h-[42px]">
                      {codeType === 'QR' && qrMap[zoomStudent.nisn] ? (
                        <div className="flex flex-col items-center">
                          <img src={qrMap[zoomStudent.nisn]} alt="QR" className="w-12 h-12 object-contain" />
                          <span className="text-[7px] text-slate-500 font-mono mt-0.5">
                            {zoomStudent.nisn}
                          </span>
                        </div>
                      ) : bcMap[zoomStudent.nisn] ? (
                        <img
                          src={bcMap[zoomStudent.nisn]}
                          alt="Barcode"
                          className="w-full max-h-8 object-contain"
                        />
                      ) : null}
                    </div>

                    <div className="bg-sky-600 text-white text-[6px] py-0.5 text-center font-bold">
                      KARTU PRESI & PELAJAR RESMI DKI JAKARTA
                    </div>
                  </div>
                ) : (
                  /* Back Side */
                  <div className="w-full h-full bg-white rounded-xl border-2 border-sky-600 flex flex-col justify-between overflow-hidden text-slate-800 p-2 text-[7.5px]">
                    <div className="bg-slate-900 text-white p-1 text-center font-black text-[8px] rounded">
                      TATA TERTIB KARTU PELAJAR
                    </div>

                    <div className="space-y-1.5 text-slate-700 my-1 text-left">
                      {schoolProfile.tataTertibKartu.slice(0, 5).map((rule, idx) => (
                        <p key={idx} className="leading-tight">
                          <strong>{idx + 1}.</strong> {rule}
                        </p>
                      ))}
                    </div>

                    {/* Official Signature Area */}
                    <div className="border-t border-slate-200 pt-1 text-right space-y-0.5">
                      <p className="text-[7px]">Jakarta, 15 Juli 2025</p>
                      <p className="text-[7px] font-bold">Kepala SMA Negeri 109 Jakarta</p>
                      <div className="h-7 flex items-center justify-end pr-2 relative">
                        <div className="w-7 h-7 rounded-full border border-red-500 text-red-600 font-bold text-[5px] flex flex-col items-center justify-center opacity-80">
                          <span>SMAN 109</span>
                          <span>JAKARTA</span>
                        </div>
                      </div>
                      <p className="font-extrabold text-[8px] text-slate-900">
                        {schoolProfile.kepalaSekolah}
                      </p>
                      <p className="text-[6.5px] text-slate-500">
                        NIP. {schoolProfile.nipKepalaSekolah}
                      </p>
                    </div>

                    <div className="bg-slate-900 text-white text-[6px] py-0.5 text-center font-bold rounded">
                      ID Siswa: {zoomStudent.nisn}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 w-full pt-2">
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <RotateCw className="w-4 h-4" /> Putar Balik Sisi ({isFlipped ? 'Lihat Depan' : 'Lihat Belakang'})
              </button>
              <button
                type="button"
                onClick={() => setZoomStudent(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full A4 Sheet Preview Modal */}
      {showA4Modal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl border overflow-hidden animate-scaleUp">
            {/* Modal Header & Controls */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-400" /> Pratinjau Lembar Kertas A4 (CR80)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Simulasi cetak presisi A4 • Halaman {a4Page} dari {totalPages}
                </p>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {/* Sisi Kartu */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => { setA4Side('front'); setA4Page(1); }}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      a4Side === 'front' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Depan Saja
                  </button>
                  <button
                    onClick={() => { setA4Side('back'); setA4Page(1); }}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      a4Side === 'back' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Belakang Saja
                  </button>
                  <button
                    onClick={() => { setA4Side('both'); setA4Page(1); }}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      a4Side === 'both' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Depan & Belakang
                  </button>
                </div>

                {/* Grid Layout 8 or 10 */}
                <select
                  value={a4Layout}
                  onChange={(e) => {
                    setA4Layout(e.target.value as '8' | '10');
                    setA4Page(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 text-white rounded-xl font-bold border border-slate-700 outline-none"
                >
                  <option value="8">8 Kartu / Lembar (2×4)</option>
                  <option value="10">10 Kartu / Lembar (2×5)</option>
                </select>

                {/* Cut marks toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showCutMarks}
                    onChange={(e) => setShowCutMarks(e.target.checked)}
                    className="rounded"
                  />
                  <span>Garis Potong</span>
                </label>

                {/* Zoom Slider */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl">
                  <span className="text-[10px] text-slate-400">Zoom:</span>
                  <input
                    type="range"
                    min="50"
                    max="140"
                    value={a4Zoom}
                    onChange={(e) => setA4Zoom(Number(e.target.value))}
                    className="w-16 accent-blue-500"
                  />
                  <span className="text-[10px] font-mono text-slate-200">{a4Zoom}%</span>
                </div>

                <button
                  onClick={() => setShowA4Modal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* A4 Sheet Viewport Canvas (Scrollable) */}
            <div className="flex-grow bg-slate-200 overflow-auto p-6 flex justify-center items-start">
              <div
                className="bg-white shadow-2xl transition-all border border-slate-300 relative"
                style={{
                  width: `${(210 * 3.78 * a4Zoom) / 100}px`,
                  minHeight: `${(297 * 3.78 * a4Zoom) / 100}px`,
                  padding: `${(15 * 3.78 * a4Zoom) / 100}px`,
                }}
              >
                {/* Header note on sheet */}
                <div className="text-[10px] text-slate-400 text-center border-b pb-2 mb-4">
                  LEMBAR SIMULASI CETAK A4 • {schoolProfile.namaSekolah} • KARTU PELAJAR CR80 (5.4 × 8.56 CM)
                </div>

                {/* Cards Grid on A4 Sheet */}
                <div
                  className={`grid grid-cols-2 gap-4 justify-items-center`}
                  style={{
                    transform: `scale(${a4Zoom / 100})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {currentSheetItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`relative ${
                        showCutMarks ? 'border border-dashed border-slate-400' : ''
                      }`}
                    >
                      {item.side === 'front' ? (
                        /* Front Card Preview */
                        <div className="w-[5.4cm] h-[8.56cm] bg-white rounded-lg border border-sky-600 flex flex-col justify-between overflow-hidden text-slate-800">
                          <div className="bg-slate-900 text-white p-1 flex items-center gap-1 border-b border-sky-400">
                            <img
                              src={schoolProfile.logoUrl || 'https://iili.io/CZUdvRa.jpg'}
                              alt="Logo"
                              className="w-6 h-6 object-contain bg-white rounded p-0.5 shrink-0"
                            />
                            <div className="overflow-hidden leading-tight text-left">
                              <h5 className="font-bold text-[7px] text-white">KARTU PELAJAR</h5>
                              <p className="font-extrabold text-[7.5px] text-sky-400 truncate">
                                {schoolProfile.namaSekolah}
                              </p>
                            </div>
                          </div>

                          <div className="px-2 py-1 flex gap-2 items-center flex-grow">
                            <div className="w-[1.9cm] h-[2.85cm] bg-slate-100 border rounded overflow-hidden shrink-0 flex items-center justify-center">
                              {item.student.foto ? (
                                <img
                                  src={item.student.foto}
                                  alt={item.student.nama}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[8px] text-slate-400 font-bold">2x3</span>
                              )}
                            </div>

                            <div className="text-[7.5px] space-y-1 overflow-hidden leading-tight text-left">
                              <div>
                                <span className="text-[6px] text-slate-400 block font-bold">NAMA:</span>
                                <strong className="block font-black text-slate-950 text-[8.5px] truncate">
                                  {item.student.nama}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[6px] text-slate-400 block font-bold">NISN:</span>
                                <span className="font-mono font-bold text-slate-900 text-[8px]">
                                  {item.student.nisn}
                                </span>
                              </div>
                              <div>
                                <span className="text-[6px] text-slate-400 block font-bold">KELAS:</span>
                                <span className="font-extrabold text-blue-700 text-[8px]">
                                  {item.student.kelas}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-1 border-t bg-slate-50 flex flex-col items-center justify-center min-h-[36px]">
                            {codeType === 'QR' && qrMap[item.student.nisn] ? (
                              <img
                                src={qrMap[item.student.nisn]}
                                alt="QR"
                                className="w-10 h-10 object-contain"
                              />
                            ) : bcMap[item.student.nisn] ? (
                              <img
                                src={bcMap[item.student.nisn]}
                                alt="BC"
                                className="w-full max-h-7 object-contain"
                              />
                            ) : null}
                          </div>

                          <div className="bg-sky-600 text-white text-[5.5px] py-0.5 text-center font-bold">
                            KARTU PELAJAR RESMI SMAN 109 JAKARTA
                          </div>
                        </div>
                      ) : (
                        /* Back Card Preview */
                        <div className="w-[5.4cm] h-[8.56cm] bg-white rounded-lg border border-sky-600 flex flex-col justify-between overflow-hidden text-slate-800 p-2 text-[7px]">
                          <div className="bg-slate-900 text-white p-1 text-center font-bold text-[7.5px] rounded">
                            TATA TERTIB KARTU PELAJAR
                          </div>

                          <div className="space-y-1 text-slate-700 text-left my-1">
                            {schoolProfile.tataTertibKartu.slice(0, 5).map((rule, idx) => (
                              <p key={idx} className="leading-tight">
                                {idx + 1}. {rule}
                              </p>
                            ))}
                          </div>

                          <div className="border-t border-slate-200 pt-1 text-right space-y-0.5">
                            <p className="text-[6.5px]">Jakarta, 15 Juli 2025</p>
                            <p className="text-[6.5px] font-bold">Kepala Sekolah</p>
                            <div className="h-5 flex items-center justify-end">
                              <span className="text-[5px] text-red-600 border border-red-500 rounded px-1">
                                [STEMPEL RESMI]
                              </span>
                            </div>
                            <p className="font-extrabold text-[7.5px] text-slate-900">
                              {schoolProfile.kepalaSekolah}
                            </p>
                            <p className="text-[6px] text-slate-500">
                              NIP. {schoolProfile.nipKepalaSekolah}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer Actions */}
            <div className="p-4 bg-white border-t flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  disabled={a4Page <= 1}
                  onClick={() => setA4Page((p) => p - 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Halaman {a4Page} dari {totalPages}
                </span>
                <button
                  disabled={a4Page >= totalPages}
                  onClick={() => setA4Page((p) => p + 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Unduh Dokumen PDF Ini
                </button>
                <button
                  onClick={handleBrowserPrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Dokumen Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Back Side Rules */}
      {showEditBackModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-slate-800">
                Edit Tata Tertib Bagian Belakang Kartu
              </h3>
              <button
                onClick={() => setShowEditBackModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBackRules} className="space-y-3 text-xs">
              <p className="text-slate-500">
                Ketik poin tata tertib (1 baris per poin aturan):
              </p>

              <textarea
                rows={6}
                value={backRulesText}
                onChange={(e) => setBackRulesText(e.target.value)}
                className="w-full p-3 bg-slate-50 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-slate-800"
              />

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditBackModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Tata Tertib
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
