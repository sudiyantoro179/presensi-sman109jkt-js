import React, { useState, useRef } from 'react';
import { Student, AdminUser } from '../types';
import { 
  Users, 
  UserPlus, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Camera, 
  Trash2, 
  Edit3, 
  CloudCheck, 
  Images, 
  AlertCircle, 
  CheckCircle2, 
  Phone,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { compressStudentPhoto, logAdminActivity } from '../services/storage';

interface StudentsTabProps {
  students: Student[];
  currentUser: AdminUser;
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (nisn: string) => void;
  onBulkSaveStudents: (newStudents: Student[]) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  currentUser,
  onSaveStudent,
  onDeleteStudent,
  onBulkSaveStudents,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form states
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [tahun, setTahun] = useState('2025/2026');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [telepon, setTelepon] = useState('');
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Bulk photo upload notification
  const [bulkPhotoStatus, setBulkPhotoStatus] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkPhotoInputRef = useRef<HTMLInputElement>(null);
  const rowPhotoInputRef = useRef<HTMLInputElement>(null);
  const [targetRowNisn, setTargetRowNisn] = useState<string | null>(null);

  // Filters
  const classesList = Array.from(new Set(students.map((s) => s.kelas))).sort();
  const yearsList = Array.from(new Set(students.map((s) => s.tahun))).sort();

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search) ||
      (s.telepon && s.telepon.includes(search));
    const matchClass = selectedClass === 'ALL' || s.kelas === selectedClass;
    const matchYear = selectedYear === 'ALL' || s.tahun === selectedYear;
    return matchSearch && matchClass && matchYear;
  });

  const photoCount = students.filter((s) => !!s.foto).length;

  const openAddModal = () => {
    setEditingStudent(null);
    setNisn('');
    setNama('');
    setKelas('');
    setTahun('2025/2026');
    setJenisKelamin('L');
    setTelepon('');
    setTempPhoto(null);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setNisn(s.nisn);
    setNama(s.nama);
    setKelas(s.kelas);
    setTahun(s.tahun || '2025/2026');
    setJenisKelamin(s.jenisKelamin || 'L');
    setTelepon(s.telepon || '');
    setTempPhoto(s.foto || null);
    setFormError('');
    setShowFormModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressStudentPhoto(file);
      setTempPhoto(compressed);
    } catch (err) {
      setFormError('Gagal memproses pas foto. Format didukung: JPG, PNG, WebP.');
    }
  };

  const handleRowQuickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetRowNisn) return;

    try {
      const compressed = await compressStudentPhoto(file);
      const student = students.find((s) => s.nisn === targetRowNisn);
      if (student) {
        const updated = { ...student, foto: compressed, fotoUpdatedAt: new Date().toISOString() };
        onSaveStudent(updated);
        logAdminActivity(currentUser, 'Upload Foto Cepat', `Upload foto 2:3 untuk ${student.nama} (${student.nisn})`);
      }
    } catch (err) {
      setBulkPhotoStatus('Gagal memproses pas foto.');
      setTimeout(() => setBulkPhotoStatus(null), 4000);
    }
    setTargetRowNisn(null);
  };

  // Bulk Photo Upload by NISN: Matches files like 0081234501.jpg, 0081234502.png
  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let matched = 0;
    const updatedStudentsList: Student[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Extract NISN from file name (e.g. "0081234501.jpg" -> "0081234501")
      const baseName = file.name.split('.')[0].trim();
      const student = students.find((s) => s.nisn === baseName || s.id === baseName);

      if (student) {
        try {
          const compressed = await compressStudentPhoto(file);
          updatedStudentsList.push({
            ...student,
            foto: compressed,
            fotoUpdatedAt: new Date().toISOString(),
          });
          matched++;
        } catch {}
      }
    }

    if (updatedStudentsList.length > 0) {
      onBulkSaveStudents(updatedStudentsList);
      logAdminActivity(currentUser, 'Unggah Massal Foto', `Berhasil memadankan dan menyimpan ${matched} foto murid`);
      setBulkPhotoStatus(`Sukses! ${matched} dari ${files.length} pas foto berhasil dipadankan dengan NISN siswa.`);
      setTimeout(() => setBulkPhotoStatus(null), 5000);
    } else {
      setBulkPhotoStatus(`Tidak ada file foto yang cocok dengan NISN murid. Pastikan nama file adalah nomor NISN (contoh: 0081234501.jpg).`);
      setTimeout(() => setBulkPhotoStatus(null), 5000);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNisn = nisn.trim();
    const cleanNama = nama.trim();
    const cleanKelas = kelas.trim();

    if (!cleanNisn || !cleanNama || !cleanKelas) {
      setFormError('Harap lengkapi semua kolom wajib (*)');
      return;
    }

    // Check duplicate NISN on new student
    if (!editingStudent && students.some((s) => s.nisn === cleanNisn)) {
      setFormError(`Siswa dengan NISN ${cleanNisn} sudah terdaftar dalam sistem.`);
      return;
    }

    const studentToSave: Student = {
      id: cleanNisn,
      nisn: cleanNisn,
      nama: cleanNama,
      kelas: cleanKelas,
      tahun: tahun.trim() || '2025/2026',
      jenisKelamin,
      telepon: telepon.trim() || undefined,
      foto: tempPhoto,
      fotoUpdatedAt: tempPhoto ? new Date().toISOString() : undefined,
    };

    onSaveStudent(studentToSave);
    logAdminActivity(
      currentUser,
      editingStudent ? 'Edit Siswa' : 'Tambah Siswa',
      `${cleanNama} (${cleanNisn}) Kelas ${cleanKelas}`
    );
    setShowFormModal(false);
  };

  const handleDelete = (s: Student) => {
    setStudentToDelete(s);
  };

  const handleConfirmDelete = () => {
    if (!studentToDelete) return;
    const target = studentToDelete;
    onDeleteStudent(target.nisn);
    logAdminActivity(currentUser, 'Hapus Siswa', `${target.nama} (${target.nisn}) Kelas ${target.kelas}`);
    setStudentToDelete(null);
    setSuccessBanner(`Data murid "${target.nama}" (NISN: ${target.nisn}) berhasil dihapus.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Download official Excel template
  const downloadTemplate = () => {
    const templateRows = [
      {
        nisn: '0081234501',
        nama: 'Aditya Pratama Nugraha',
        kelas: 'X-A',
        tahun_ajaran: '2025/2026',
        jenis_kelamin: 'L',
        telepon: '081299887701',
      },
      {
        nisn: '0081234502',
        nama: 'Aisyah Putri Azzahra',
        kelas: 'X-A',
        tahun_ajaran: '2025/2026',
        jenis_kelamin: 'P',
        telepon: '081299887702',
      },
      {
        nisn: '0081234503',
        nama: 'Bima Satria Wicaksono',
        kelas: 'X-B',
        tahun_ajaran: '2025/2026',
        jenis_kelamin: 'L',
        telepon: '081299887703',
      },
      {
        nisn: '0071234505',
        nama: 'Dafa Alamsyah',
        kelas: 'XI-MIPA-1',
        tahun_ajaran: '2025/2026',
        jenis_kelamin: 'L',
        telepon: '081299887705',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Murid');
    XLSX.writeFile(workbook, 'Template_Import_Murid_SMAN109.xlsx');
  };

  // Import Excel file
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const newStudents: Student[] = [];
        rows.forEach((r) => {
          const nisnVal = String(r.nisn || r.NISN || r['Nomor Induk'] || '').trim();
          const namaVal = String(r.nama || r.NAMA || r['Nama Murid'] || '').trim();
          const kelasVal = String(r.kelas || r.KELAS || '').trim();
          const tahunVal = String(r.tahun_ajaran || r.tahun || r.TAHUN || '2025/2026').trim();
          const jkVal = (String(r.jenis_kelamin || r.jk || 'L').toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P';
          const telVal = String(r.telepon || r.hp || r.wa || '').trim();

          if (nisnVal && namaVal && kelasVal) {
            newStudents.push({
              id: nisnVal,
              nisn: nisnVal,
              nama: namaVal,
              kelas: kelasVal,
              tahun: tahunVal,
              jenisKelamin: jkVal,
              telepon: telVal || undefined,
              foto: null,
            });
          }
        });

        if (newStudents.length > 0) {
          onBulkSaveStudents(newStudents);
          logAdminActivity(currentUser, 'Import Excel Murid', `Berhasil mengimpor ${newStudents.length} siswa`);
          setSuccessBanner(`Berhasil mengimpor ${newStudents.length} data murid ke database.`);
          setTimeout(() => setSuccessBanner(null), 5000);
          setShowImportModal(false);
        } else {
          setBulkPhotoStatus('Tidak ada baris data murid yang valid ditemukan pada file Excel.');
          setTimeout(() => setBulkPhotoStatus(null), 5000);
        }
      } catch (err) {
        setBulkPhotoStatus('Gagal membaca file Excel/CSV. Pastikan format kolom sesuai.');
        setTimeout(() => setBulkPhotoStatus(null), 5000);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for one-click row photo upload */}
      <input
        ref={rowPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleRowQuickPhoto}
      />

      {/* Hidden file input for bulk photo upload */}
      <input
        ref={bulkPhotoInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleBulkPhotoUpload}
      />

      {/* Header & Action Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-slate-800">
                Manajemen Data Murid SMA NEGERI 109 JAKARTA
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Basis data kesiswaan terpadu, pas foto standar 2:3, dan cetak kartu pelajar resmi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" /> Tambah Siswa
            </button>

            <button
              onClick={() => bulkPhotoInputRef.current?.click()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Images className="w-4 h-4" /> Unggah Massal Foto (NIS)
            </button>

            <button
              onClick={downloadTemplate}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Unduh Template Excel
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Upload className="w-4 h-4" /> Import Excel / CSV
            </button>
          </div>
        </div>

        {/* Cloud Foto Status Indicator */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5 text-xs text-blue-950">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold">Status Penyimpanan Foto Permanen (Awan Abadi):</span>
            <span className="bg-white px-2.5 py-0.5 rounded-full border border-blue-300 font-extrabold text-blue-700">
              {photoCount} dari {students.length} Siswa Memiliki Pas Foto
            </span>
          </div>
          <span className="text-[11px] text-blue-800">
            Kompresi Otomatis 2:3 (~25-40 KB) • Tersimpan di Basis Data Firestore
          </span>
        </div>

        {/* Success Notification Banner */}
        {successBanner && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-4 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Bulk Photo Upload Result Banner */}
        {bulkPhotoStatus && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-4 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{bulkPhotoStatus}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan Nama Siswa, NISN, atau No Telp..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Kelas ({students.length})</option>
              {classesList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c} ({students.filter((s) => s.kelas === c).length})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Tahun Ajaran</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-extrabold text-[11px] border-b tracking-wider">
              <tr>
                <th className="p-3.5">Pas Foto (2:3)</th>
                <th className="p-3.5">NISN / ID</th>
                <th className="p-3.5">Nama Lengkap</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">L/P</th>
                <th className="p-3.5">Thn Ajaran</th>
                <th className="p-3.5">Telepon</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Tidak ada siswa yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.nisn} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div className="relative group w-10 h-14 shrink-0">
                        {s.foto ? (
                          <img
                            src={s.foto}
                            alt={s.nama}
                            className="w-full h-full object-cover rounded-lg border border-slate-300 shadow-xs"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
                            <Camera className="w-4 h-4" />
                            <span className="text-[8px] font-bold">2x3</span>
                          </div>
                        )}
                        {/* Quick photo upload button on hover */}
                        <button
                          type="button"
                          onClick={() => {
                            setTargetRowNisn(s.nisn);
                            rowPhotoInputRef.current?.click();
                          }}
                          title="Klik untuk upload foto satuan cepat"
                          className="absolute inset-0 bg-blue-900/70 text-white rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-800">{s.nisn}</td>
                    <td className="p-3 font-extrabold text-slate-900 text-sm">{s.nama}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200">
                        {s.kelas}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-600">
                      {s.jenisKelamin === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
                    </td>
                    <td className="p-3 text-slate-600">{s.tahun || '2025/2026'}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{s.telepon || '-'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                          title="Edit Data Siswa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Siswa */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingStudent ? 'Edit Data Murid' : 'Tambah Murid Baru'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NISN / Nomor Induk Siswa *</label>
                <input
                  type="text"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="mis. 0081234501"
                  required
                  readOnly={!!editingStudent}
                  className={`w-full px-3 py-2 border rounded-xl font-mono outline-none ${
                    editingStudent ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Murid *</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama sesuai ijazah/akta..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas *</label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="mis. X-A / XI-MIPA-1"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran *</label>
                  <input
                    type="text"
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    placeholder="2025/2026"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={jenisKelamin}
                    onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    placeholder="0812xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Photo Upload with 2:3 preview */}
              <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-3">
                <div className="w-16 h-24 bg-white border border-slate-300 rounded-lg overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                  {tempPhoto ? (
                    <img src={tempPhoto} alt="Pas Foto 2x3" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-slate-400 text-center font-bold">Pas Foto 2x3</span>
                  )}
                </div>

                <div className="flex-grow space-y-1.5">
                  <label className="block font-bold text-slate-700 text-xs">
                    Pas Foto Murid (Rasio 2:3 Otomatis)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-[11px] text-slate-500 block w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                  <p className="text-[10px] text-slate-400">
                    Ukuran dikompresi otomatis ke 2:3 (~30KB) untuk rendering kartu tajam.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Data Murid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import Excel / CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-800">Import Data Murid dari Excel / CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Pastikan file Excel atau CSV memiliki baris header baku:{' '}
                <strong className="text-slate-900 font-mono">
                  nisn, nama, kelas, tahun_ajaran, jenis_kelamin, telepon
                </strong>
              </p>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-blue-900">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-800">Format Kolom Baku Resmi</p>
                    <p className="text-[11px] text-slate-500">Unduh contoh template jika belum memiliki file.</p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
                >
                  Unduh Template
                </button>
              </div>

              <div className="p-6 border-2 border-dashed border-emerald-400 rounded-2xl bg-emerald-50/30 text-center hover:bg-emerald-50/60 transition cursor-pointer">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleExcelImport}
                />
                <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                  <span className="font-extrabold text-slate-800 text-sm">Pilih File Excel / CSV</span>
                  <span className="text-slate-400 text-[11px]">Klik untuk menjelajahi file dari perangkat</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Murid */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Konfirmasi Hapus Murid</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border rounded-2xl space-y-2 text-xs">
              <p className="text-slate-600">Yakin ingin menghapus data murid berikut dari sistem?</p>
              <div className="flex items-center gap-3 pt-1">
                {studentToDelete.foto ? (
                  <img
                    src={studentToDelete.foto}
                    alt={studentToDelete.nama}
                    className="w-10 h-14 object-cover rounded-lg border shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                    {studentToDelete.nama.charAt(0)}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-extrabold text-slate-900 text-sm truncate">{studentToDelete.nama}</p>
                  <p className="text-slate-500 font-mono text-[11px]">NISN: {studentToDelete.nisn}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                    Kelas {studentToDelete.kelas}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-medium">
              ⚠️ Data siswa ini beserta riwayat presensinya akan dihapus permanen.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
