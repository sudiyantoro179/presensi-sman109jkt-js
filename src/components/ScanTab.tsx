import React, { useState, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, AdminUser, AttendanceStatus } from '../types';
import { 
  Camera, 
  FlipHorizontal, 
  QrCode, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Edit3, 
  Calendar, 
  Layers, 
  Search, 
  Sparkles,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import { playSoundEffect, speakAnnouncement } from '../services/audio';
import { getFormattedToday, getFormattedTime } from '../services/storage';

interface ScanTabProps {
  students: Student[];
  attendances: AttendanceRecord[];
  currentUser: AdminUser;
  activeDate: string;
  onActiveDateChange: (date: string) => void;
  onRecordAttendance: (record: AttendanceRecord) => void;
  onBulkRecordAttendance: (records: AttendanceRecord[]) => void;
}

export const ScanTab: React.FC<ScanTabProps> = ({
  students,
  attendances,
  currentUser,
  activeDate,
  onActiveDateChange,
  onRecordAttendance,
  onBulkRecordAttendance,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanResultToast, setScanResultToast] = useState<{
    type: 'success' | 'warning' | 'error';
    student?: Student;
    record?: AttendanceRecord;
    message: string;
    detail: string;
  } | null>(null);

  // Status edit modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('Hadir');

  // Super Admin Bulk Attendance Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClass, setBulkClass] = useState<string>('ALL');
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('Hadir');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';

  // Classes list
  const classesList = Array.from(new Set(students.map((s) => s.kelas))).sort();

  // Initialize camera scanner
  const startCameraScanner = async (facing: 'environment' | 'user') => {
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch {}
      }

      const qrScanner = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: facing },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScannedCode(decodedText.trim());
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera failed to start:', err);
      setCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCameraScanner(facingMode);
    return () => {
      stopCameraScanner();
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  // Main scan processor
  const handleScannedCode = (code: string) => {
    if (!code) return;

    const student = students.find((s) => s.nisn === code || s.id === code);

    if (!student) {
      // Unrecognized card
      playSoundEffect('error');
      setScanResultToast({
        type: 'error',
        message: 'Kartu Tidak Dikenal',
        detail: `Kode: "${code}" tidak terdaftar pada basis data murid SMAN 109.`,
      });
      speakAnnouncement('Perhatian, kartu pelajar tidak terdaftar.');
      return;
    }

    // Check duplicate presence for current active date
    const existing = attendances.find(
      (a) => a.nisn === student.nisn && a.date === activeDate
    );

    if (existing) {
      // Already scanned
      playSoundEffect('warning');
      setScanResultToast({
        type: 'warning',
        student,
        record: existing,
        message: `${student.nama} Sudah Absen`,
        detail: `Sudah tercatat sebagai "${existing.status}" pukul ${existing.time} WIB pada tanggal ${activeDate}.`,
      });
      speakAnnouncement(`Peringatan, ${student.nama} sudah tercatat presensi hari ini.`);
      return;
    }

    // Success: create attendance record
    const record: AttendanceRecord = {
      id: `${student.nisn}_${activeDate}`,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      date: activeDate,
      time: getFormattedTime(),
      status: 'Hadir',
      petugas: currentUser.nama,
    };

    onRecordAttendance(record);

    // Audio chime & Confetti
    playSoundEffect('success');
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#0284c7', '#38bdf8', '#10b981', '#f59e0b'],
    });

    setScanResultToast({
      type: 'success',
      student,
      record,
      message: `Presensi Berhasil: ${student.nama}`,
      detail: `Kelas ${student.kelas} • NISN ${student.nisn} • Waktu: ${record.time} WIB`,
    });

    // Smart TTS speech announcement
    speakAnnouncement(`Selamat pagi ${student.nama}, Anda berhasil presensi di kelas ${student.kelas}.`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScannedCode(manualInput.trim());
      setManualInput('');
      if (manualInputRef.current) manualInputRef.current.focus();
    }
  };

  // Handle saving edited status
  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const updated: AttendanceRecord = {
      ...editingRecord,
      status: newStatus,
      petugas: currentUser.nama,
    };
    onRecordAttendance(updated);
    setEditingRecord(null);
  };

  // Handle Super Admin Bulk Attendance Setter
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudents = students.filter(
      (s) => bulkClass === 'ALL' || s.kelas === bulkClass
    );

    const currentTime = getFormattedTime();
    const newRecords: AttendanceRecord[] = targetStudents.map((s) => ({
      id: `${s.nisn}_${activeDate}`,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      date: activeDate,
      time: currentTime,
      status: bulkStatus,
      keterangan: `Input massal oleh ${currentUser.nama}`,
      petugas: currentUser.nama,
    }));

    onBulkRecordAttendance(newRecords);
    setShowBulkModal(false);
    playSoundEffect('success');
    confetti({ particleCount: 60, spread: 70 });
  };

  // Attendances recorded on active date
  const activeDateLogs = attendances
    .filter((a) => a.date === activeDate)
    .sort((a, b) => b.time.localeCompare(a.time));

  const totalHadir = activeDateLogs.filter((a) => a.status === 'Hadir').length;
  const totalSakit = activeDateLogs.filter((a) => a.status === 'Sakit').length;
  const totalIjin = activeDateLogs.filter((a) => a.status === 'Ijin').length;
  const totalAlpa = activeDateLogs.filter((a) => a.status === 'Alpa').length;

  return (
    <div className="space-y-6">
      {/* Super Admin Date Selector & Bulk Attendance Bar */}
      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                Tanggal Presensi Aktif: <span className="text-blue-700">{activeDate}</span>
              </h3>
              {activeDate === getFormattedToday() ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full border border-emerald-300">
                  Hari Ini
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[11px] rounded-full border border-amber-300">
                  Tanggal Kustom
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isSuperAdmin
                ? 'Super Admin dapat mengubah tanggal aktif untuk input presensi tanggal lampau.'
                : 'Presensi otomatis dicatat sesuai tanggal kerja aktif.'}
            </p>
          </div>
        </div>

        {/* Action Controls for Date & Bulk Input */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={activeDate}
                onChange={(e) => onActiveDateChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => onActiveDateChange(getFormattedToday())}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border transition"
              >
                Reset Hari Ini
              </button>
            </div>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Layers className="w-3.5 h-3.5" /> Input Presensi Massal Kelas
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Scanner & Right Today's Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Barcode Gun */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" /> Pemindai Barcode / QR Code
              </h2>
              <p className="text-xs text-slate-500">Mendukung kamera HP/laptop & Barcode Scanner USB</p>
            </div>

            <button
              onClick={toggleFacingMode}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
            </button>
          </div>

          {/* Camera Viewport with Visual Aim Target */}
          <div className="w-full max-w-md bg-slate-950 rounded-3xl overflow-hidden relative shadow-inner flex flex-col items-center justify-center min-h-[300px] border-4 border-slate-900">
            <div id="qr-reader-container" className="w-full h-full"></div>

            {/* Visual Crosshair Aim Box Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-dashed border-sky-400 rounded-3xl animate-pulse flex flex-col items-center justify-between p-3 bg-sky-500/5">
                <span className="text-[10px] uppercase font-bold text-sky-200 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-sky-400/40">
                  Arahkan QR / Barcode
                </span>
                <div className="w-full h-0.5 bg-red-500/60 shadow-[0_0_8px_#ef4444] animate-bounce"></div>
                <span className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded">
                  Pencegahan Absen Ganda Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Instant Scan Result Toast Banner */}
          {scanResultToast && (
            <div
              className={`w-full max-w-md mt-4 p-4 rounded-2xl border transition-all animate-fadeIn flex items-center gap-3.5 shadow-md ${
                scanResultToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : scanResultToast.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="shrink-0">
                {scanResultToast.student?.foto ? (
                  <img
                    src={scanResultToast.student.foto}
                    alt={scanResultToast.student.nama}
                    className="w-12 h-16 object-cover rounded-xl border border-white shadow"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${
                      scanResultToast.type === 'success'
                        ? 'bg-emerald-600'
                        : scanResultToast.type === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-rose-600'
                    }`}
                  >
                    {scanResultToast.type === 'success' && <CheckCircle className="w-6 h-6" />}
                    {scanResultToast.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                    {scanResultToast.type === 'error' && <XCircle className="w-6 h-6" />}
                  </div>
                )}
              </div>

              <div className="flex-grow overflow-hidden">
                <h4 className="font-extrabold text-sm truncate">{scanResultToast.message}</h4>
                <p className="text-xs opacity-90 mt-0.5">{scanResultToast.detail}</p>
                {scanResultToast.type === 'success' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                    🔊 Diumumkan via Suara Gemini TTS
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Manual Input & Barcode Gun Scanner Form */}
          <div className="w-full max-w-md mt-5 pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Input Manual NISN / Barcode Gun USB:</span>
              <span className="text-[11px] text-blue-600 font-normal">Tekan Enter untuk scan cepat</span>
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                ref={manualInputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ketik atau tembak NISN siswa..."
                className="flex-grow px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0"
              >
                Catat Presensi
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Attendance Log for Active Date */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" /> Presensi ({activeDate})
              </h2>
              <p className="text-xs text-slate-500">Log kehadiran waktu nyata</p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-full border border-emerald-200">
                {activeDateLogs.length} Siswa Dicatat
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 p-2.5 rounded-2xl border text-center">
            <div className="bg-white p-1.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-slate-500 block">Hadir</span>
              <span className="text-sm font-extrabold text-emerald-600">{totalHadir}</span>
            </div>
            <div className="bg-white p-1.5 rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-slate-500 block">Sakit</span>
              <span className="text-sm font-extrabold text-blue-600">{totalSakit}</span>
            </div>
            <div className="bg-white p-1.5 rounded-xl border border-amber-100">
              <span className="text-[10px] font-bold text-slate-500 block">Izin</span>
              <span className="text-sm font-extrabold text-amber-600">{totalIjin}</span>
            </div>
            <div className="bg-white p-1.5 rounded-xl border border-rose-100">
              <span className="text-[10px] font-bold text-slate-500 block">Alpa</span>
              <span className="text-sm font-extrabold text-rose-600">{totalAlpa}</span>
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-grow overflow-y-auto max-h-[460px] space-y-2 pr-1 scrollbar-thin">
            {activeDateLogs.length === 0 ? (
              <div className="text-center text-slate-400 py-16 text-xs space-y-2">
                <QrCode className="w-10 h-10 mx-auto text-slate-300" />
                <p>Belum ada presensi yang dicatat pada tanggal {activeDate}.</p>
                <p className="text-[11px] text-slate-400">Silakan scan kartu atau lakukan input manual.</p>
              </div>
            ) : (
              activeDateLogs.map((log) => {
                const studentData = students.find((s) => s.nisn === log.nisn);
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {studentData?.foto ? (
                        <img
                          src={studentData.foto}
                          alt={log.nama}
                          className="w-10 h-14 object-cover rounded-xl border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {log.nama.charAt(0)}
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">{log.nama}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {log.kelas} • NISN: {log.nisn}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Jam: <span className="font-mono font-semibold text-slate-600">{log.time} WIB</span>
                          {log.petugas && ` • Petugas: ${log.petugas}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          log.status === 'Hadir'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : log.status === 'Sakit'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : log.status === 'Ijin'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>

                      <button
                        onClick={() => {
                          setEditingRecord(log);
                          setNewStatus(log.status);
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border shadow-xs transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3 text-blue-600" /> Ubah
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Edit Attendance Status */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-800">Ubah Status Kehadiran</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                <p className="font-bold text-slate-900 text-sm">{editingRecord.nama}</p>
                <p className="text-slate-500">Kelas: {editingRecord.kelas} • NISN: {editingRecord.nisn}</p>
                <p className="text-slate-500">Tanggal: {editingRecord.date}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Kehadiran Baru:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Ijin">Ijin</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Super Admin Bulk Attendance Setter */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-800">
                  Input Presensi Massal (Khusus Super Admin)
                </h3>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Fitur ini mengatur status presensi seluruh siswa pada kelas terpilih untuk tanggal:{' '}
                <strong className="text-blue-700">{activeDate}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Kelas Sasaran:</label>
                <select
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Kelas ({students.length} Murid)</option>
                  {classesList.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c} ({students.filter((s) => s.kelas === c).length} Murid)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Setel Status Kehadiran:</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Ijin">Ijin</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                ⚠️ Siswa yang sudah terdata pada tanggal {activeDate} akan ditimpa dengan status baru ini.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Terapkan Presensi Massal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
