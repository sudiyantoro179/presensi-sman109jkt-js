import React, { useState } from 'react';
import { Student, AttendanceRecord, SchoolProfile, AdminUser, AttendanceStatus } from '../types';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  Printer, 
  Search, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Award, 
  Users,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getFormattedToday, logAdminActivity } from '../services/storage';

interface ReportTabProps {
  students: Student[];
  attendances: AttendanceRecord[];
  schoolProfile: SchoolProfile;
  currentUser: AdminUser;
  onUpdateAttendanceStatus: (nisn: string, date: string, status: AttendanceStatus) => void;
}

export const ReportTab: React.FC<ReportTabProps> = ({
  students,
  attendances,
  schoolProfile,
  currentUser,
  onUpdateAttendanceStatus,
}) => {
  const today = getFormattedToday();

  // Tab View Modes inside Report Tab
  const [reportView, setReportView] = useState<'daily' | 'monthly_matrix' | 'individual'>(
    'daily'
  );

  // Daily Filter
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Month & Year Selector for Monthly Reports
  const currentDateObj = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDateObj.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState(currentDateObj.getFullYear());

  // Individual Student Selection
  const [selectedStudentNisn, setSelectedStudentNisn] = useState<string>(
    students[0]?.nisn || ''
  );

  // Classes list
  const classesList = Array.from(new Set(students.map((s) => s.kelas))).sort();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Fast Month Navigation
  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const resetThisMonth = () => {
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
  };

  // 1. Daily Records Filter
  const filteredDailyRecords = attendances
    .filter((a) => {
      const matchDate = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
      const matchClass = filterClass === 'ALL' || a.kelas === filterClass;
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const matchSearch =
        a.nama.toLowerCase().includes(search.toLowerCase()) ||
        a.nisn.includes(search);
      return matchDate && matchClass && matchStatus && matchSearch;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // Daily KPI summary
  const totalRecords = filteredDailyRecords.length;
  const countHadir = filteredDailyRecords.filter((a) => a.status === 'Hadir').length;
  const countSakit = filteredDailyRecords.filter((a) => a.status === 'Sakit').length;
  const countIjin = filteredDailyRecords.filter((a) => a.status === 'Ijin').length;
  const countAlpa = filteredDailyRecords.filter((a) => a.status === 'Alpa').length;

  const pctHadir = totalRecords > 0 ? Math.round((countHadir / totalRecords) * 100) : 0;
  const pctSakit = totalRecords > 0 ? Math.round((countSakit / totalRecords) * 100) : 0;
  const pctIjin = totalRecords > 0 ? Math.round((countIjin / totalRecords) * 100) : 0;
  const pctAlpa = totalRecords > 0 ? Math.round((countAlpa / totalRecords) * 100) : 0;

  // 2. Export Daily Attendance to Excel (.xlsx)
  const exportDailyExcel = () => {
    if (filteredDailyRecords.length === 0) {
      alert('Tidak ada data kehadiran yang sesuai filter untuk diekspor.');
      return;
    }

    const rows = filteredDailyRecords.map((a, idx) => ({
      No: idx + 1,
      Tanggal: a.date,
      'Waktu Presensi': `${a.time} WIB`,
      NISN: a.nisn,
      'Nama Siswa': a.nama,
      Kelas: a.kelas,
      'Status Kehadiran': a.status,
      Keterangan: a.keterangan || '-',
      Petugas: a.petugas || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 32 },
      { wch: 14 },
      { wch: 18 },
      { wch: 25 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Presensi');
    const filename = `Laporan_Presensi_SMAN109_${startDate}_sd_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);

    logAdminActivity(currentUser, 'Ekspor Excel Harian', `Mengunduh file ${filename}`);
  };

  // 3. Monthly Matrix (Days 1 to 28/30/31)
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Month string format: "YYYY-MM"
  const monthString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const matrixStudents = students.filter(
    (s) => filterClass === 'ALL' || s.kelas === filterClass
  );

  // Export Monthly Matrix to Excel
  const exportMonthlyMatrixExcel = () => {
    const rows = matrixStudents.map((s, idx) => {
      const rowObj: any = {
        No: idx + 1,
        NISN: s.nisn,
        Nama: s.nama,
        Kelas: s.kelas,
      };

      let h = 0, sk = 0, ij = 0, al = 0;

      daysArray.forEach((d) => {
        const dateStr = `${monthString}-${String(d).padStart(2, '0')}`;
        const record = attendances.find((a) => a.nisn === s.nisn && a.date === dateStr);
        if (record) {
          rowObj[`Tgl_${d}`] = record.status.charAt(0);
          if (record.status === 'Hadir') h++;
          else if (record.status === 'Sakit') sk++;
          else if (record.status === 'Ijin') ij++;
          else if (record.status === 'Alpa') al++;
        } else {
          // Check Sunday
          const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
          rowObj[`Tgl_${d}`] = dayOfWeek === 0 ? 'L' : '-';
        }
      });

      rowObj['Total_H'] = h;
      rowObj['Total_S'] = sk;
      rowObj['Total_I'] = ij;
      rowObj['Total_A'] = al;
      const totalEfektif = h + sk + ij + al;
      rowObj['Persen_Hadir'] = totalEfektif > 0 ? `${Math.round((h / totalEfektif) * 100)}%` : '0%';

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Matriks_${monthNames[selectedMonth - 1]}`);
    XLSX.writeFile(workbook, `Matriks_Presensi_Bulanan_SMAN109_${monthString}.xlsx`);
  };

  // 4. Individual Student Monthly Report Data
  const targetStudent = students.find((s) => s.nisn === selectedStudentNisn) || students[0];

  // Records for this individual student in selected month
  const individualMonthRecords = attendances.filter(
    (a) => a.nisn === targetStudent?.nisn && a.date.startsWith(monthString)
  );

  const indHadir = individualMonthRecords.filter((a) => a.status === 'Hadir').length;
  const indSakit = individualMonthRecords.filter((a) => a.status === 'Sakit').length;
  const indIjin = individualMonthRecords.filter((a) => a.status === 'Ijin').length;
  const indAlpa = individualMonthRecords.filter((a) => a.status === 'Alpa').length;

  const effectiveDaysInMonth = 22; // Typical school days per month
  const indPercent = Math.min(100, Math.round((indHadir / (effectiveDaysInMonth || 1)) * 100));

  let disciplineGrade = 'Perlu Pembinaan';
  if (indPercent >= 90) disciplineGrade = 'Sangat Baik (A)';
  else if (indPercent >= 80) disciplineGrade = 'Baik (B)';
  else if (indPercent >= 70) disciplineGrade = 'Cukup (C)';

  return (
    <div className="space-y-6">
      {/* Top Header & Main Mode Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Rekapitulasi & Laporan Kehadiran
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {schoolProfile.namaSekolah} • Filter rentang tanggal, cetak matriks bulanan A4, dan rapor individu per murid.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setReportView('daily')}
              className={`px-3.5 py-2 rounded-xl transition ${
                reportView === 'daily'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Rentang Tanggal
            </button>
            <button
              onClick={() => setReportView('monthly_matrix')}
              className={`px-3.5 py-2 rounded-xl transition ${
                reportView === 'monthly_matrix'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Bulanan (1-31)
            </button>
            <button
              onClick={() => setReportView('individual')}
              className={`px-3.5 py-2 rounded-xl transition ${
                reportView === 'individual'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rapor Individu (1 Bulan)
            </button>
          </div>
        </div>

        {/* VIEW 1: Daily / Date Range Recap */}
        {reportView === 'daily' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-slate-50 border rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dari Tanggal:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sampai Tanggal:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filter Kelas:</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classesList.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Kehadiran:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Ijin">Ijin</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportDailyExcel}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-4 h-4" /> Ekspor Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* KPI Cards Real-Time */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Hadir</span>
                  <div className="text-xl font-black text-emerald-700">{countHadir} Siswa</div>
                  <span className="text-[10px] font-bold text-emerald-600">{pctHadir}% dari total</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-200/60 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  H
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-800 uppercase">Total Sakit</span>
                  <div className="text-xl font-black text-blue-700">{countSakit} Siswa</div>
                  <span className="text-[10px] font-bold text-blue-600">{pctSakit}% dari total</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-200/60 text-blue-800 flex items-center justify-center font-bold text-xs">
                  S
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Total Izin</span>
                  <div className="text-xl font-black text-amber-700">{countIjin} Siswa</div>
                  <span className="text-[10px] font-bold text-amber-600">{pctIjin}% dari total</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-200/60 text-amber-800 flex items-center justify-center font-bold text-xs">
                  I
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase">Total Alpa</span>
                  <div className="text-xl font-black text-rose-700">{countAlpa} Siswa</div>
                  <span className="text-[10px] font-bold text-rose-600">{pctAlpa}% dari total</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-200/60 text-rose-800 flex items-center justify-center font-bold text-xs">
                  A
                </div>
              </div>
            </div>

            {/* Daily Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[11px] border-b">
                  <tr>
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5">Waktu WIB</th>
                    <th className="p-3.5">NISN</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Tidak ada riwayat kehadiran pada rentang tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyRecords.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-800">{a.date}</td>
                        <td className="p-3 font-mono text-slate-600">{a.time} WIB</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{a.nisn}</td>
                        <td className="p-3 font-extrabold text-slate-900">{a.nama}</td>
                        <td className="p-3 font-bold text-blue-700">{a.kelas}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                              a.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : a.status === 'Sakit'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : a.status === 'Ijin'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{a.petugas || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: Monthly Attendance Matrix (A4 Landscape Form) */}
        {reportView === 'monthly_matrix' && (
          <div className="space-y-4">
            {/* Month & Year Navigation Bar */}
            <div className="p-4 bg-slate-50 border rounded-2xl flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 bg-white hover:bg-slate-100 border rounded-xl text-slate-700"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Bulan {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={nextMonth}
                  className="p-2 bg-white hover:bg-slate-100 border rounded-xl text-slate-700"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={resetThisMonth}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Bulan Ini
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classesList.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={exportMonthlyMatrixExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Unduh Matriks Excel
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Lembar A4 (Landscape)
                </button>
              </div>
            </div>

            {/* Printable A4 Landscape Matrix Container */}
            <div className="overflow-x-auto border border-slate-300 rounded-2xl bg-white p-4 shadow-sm">
              {/* School Official Header on Sheet */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                <h3 className="font-black text-sm uppercase text-slate-900">
                  REKAPITULASI PRESENSI BULANAN PESERTA DIDIK
                </h3>
                <h4 className="font-extrabold text-base text-blue-900">
                  {schoolProfile.namaSekolah}
                </h4>
                <p className="text-[11px] text-slate-600">
                  Bulan: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> • Kelas:{' '}
                  <strong>{filterClass === 'ALL' ? 'Seluruh Kelas' : filterClass}</strong> • TA:{' '}
                  {schoolProfile.tahunAjaranAktif}
                </p>
              </div>

              {/* Matrix Table */}
              <table className="w-full text-center border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border">
                    <th className="p-1.5 border text-left w-8">No</th>
                    <th className="p-1.5 border text-left min-w-[120px]">Nama Siswa</th>
                    <th className="p-1.5 border w-12">Kelas</th>
                    {daysArray.map((d) => (
                      <th key={d} className="p-1 border w-6 text-slate-700">
                        {d}
                      </th>
                    ))}
                    <th className="p-1.5 border bg-emerald-50 text-emerald-800 w-8">H</th>
                    <th className="p-1.5 border bg-blue-50 text-blue-800 w-8">S</th>
                    <th className="p-1.5 border bg-amber-50 text-amber-800 w-8">I</th>
                    <th className="p-1.5 border bg-rose-50 text-rose-800 w-8">A</th>
                    <th className="p-1.5 border bg-sky-50 text-sky-800 w-12">%</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixStudents.map((s, idx) => {
                    let hCount = 0, sCount = 0, iCount = 0, aCount = 0;

                    return (
                      <tr key={s.nisn} className="hover:bg-slate-50 border">
                        <td className="p-1 border text-left font-mono">{idx + 1}</td>
                        <td className="p-1 border text-left font-bold text-slate-900 truncate max-w-[140px]">
                          {s.nama}
                        </td>
                        <td className="p-1 border font-bold text-blue-700">{s.kelas}</td>
                        {daysArray.map((d) => {
                          const dateStr = `${monthString}-${String(d).padStart(2, '0')}`;
                          const record = attendances.find(
                            (a) => a.nisn === s.nisn && a.date === dateStr
                          );
                          const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
                          const isSunday = dayOfWeek === 0;

                          if (record) {
                            if (record.status === 'Hadir') hCount++;
                            else if (record.status === 'Sakit') sCount++;
                            else if (record.status === 'Ijin') iCount++;
                            else if (record.status === 'Alpa') aCount++;

                            return (
                              <td
                                key={d}
                                className={`p-1 border font-bold ${
                                  record.status === 'Hadir'
                                    ? 'text-emerald-700 bg-emerald-50/50'
                                    : record.status === 'Sakit'
                                    ? 'text-blue-700 bg-blue-50/50'
                                    : record.status === 'Ijin'
                                    ? 'text-amber-700 bg-amber-50/50'
                                    : 'text-rose-700 bg-rose-50/50'
                                }`}
                              >
                                {record.status.charAt(0)}
                              </td>
                            );
                          }

                          return (
                            <td
                              key={d}
                              className={`p-1 border text-slate-300 ${
                                isSunday ? 'bg-rose-50 text-rose-400 font-bold' : ''
                              }`}
                            >
                              {isSunday ? 'L' : '·'}
                            </td>
                          );
                        })}

                        {/* Sums */}
                        <td className="p-1 border font-extrabold text-emerald-800 bg-emerald-50">
                          {hCount}
                        </td>
                        <td className="p-1 border font-extrabold text-blue-800 bg-blue-50">
                          {sCount}
                        </td>
                        <td className="p-1 border font-extrabold text-amber-800 bg-amber-50">
                          {iCount}
                        </td>
                        <td className="p-1 border font-extrabold text-rose-800 bg-rose-50">
                          {aCount}
                        </td>
                        <td className="p-1 border font-black text-sky-900 bg-sky-50">
                          {hCount + sCount + iCount + aCount > 0
                            ? `${Math.round(
                                (hCount / (hCount + sCount + iCount + aCount)) * 100
                              )}%`
                            : '0%'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Official Signatures Row (Kepala Sekolah & Wali Kelas) */}
              <div className="grid grid-cols-2 gap-8 mt-8 text-xs text-slate-800 pt-4 border-t">
                <div className="text-left pl-6">
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala SMA Negeri 109 Jakarta</p>
                  <div className="h-16 flex items-center">
                    <span className="text-[10px] text-red-600 border border-red-500 rounded px-1.5 py-0.5">
                      [STEMPEL RESMI SEKOLAH]
                    </span>
                  </div>
                  <p className="font-black underline text-slate-900">{schoolProfile.kepalaSekolah}</p>
                  <p className="text-[11px] text-slate-500">NIP. {schoolProfile.nipKepalaSekolah}</p>
                </div>

                <div className="text-right pr-6">
                  <p>Jakarta, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                  <p className="font-bold">Wali Kelas / Petugas Presensi</p>
                  <div className="h-16"></div>
                  <p className="font-black underline text-slate-900">{currentUser.nama}</p>
                  <p className="text-[11px] text-slate-500">NIP. - / Petugas Piket</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Individual Student Monthly Attendance Report Sheet */}
        {reportView === 'individual' && (
          <div className="space-y-4">
            {/* Student Picker & Action Bar */}
            <div className="p-4 bg-slate-50 border rounded-2xl flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-700">Pilih Siswa:</label>
                <select
                  value={selectedStudentNisn}
                  onChange={(e) => setSelectedStudentNisn(e.target.value)}
                  className="px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                >
                  {students.map((s) => (
                    <option key={s.nisn} value={s.nisn}>
                      {s.nama} ({s.kelas} - {s.nisn})
                    </option>
                  ))}
                </select>

                {/* Month navigation */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Bulan {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Rapor Lembar A4 (Potret)
                </button>
              </div>
            </div>

            {/* Individual Printable Sheet (Model Rapor Bulanan Siswa Resmi) */}
            <div className="max-w-3xl mx-auto bg-white p-8 border-2 border-slate-300 rounded-3xl shadow-lg space-y-6 text-slate-800">
              {/* Header Kop Surat SMAN 109 */}
              <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-4">
                <img
                  src={schoolProfile.logoUrl || 'https://iili.io/CZUdvRa.jpg'}
                  alt="Logo SMAN 109"
                  className="w-16 h-16 object-contain"
                />
                <div className="text-center flex-grow">
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700">
                    PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA
                  </h3>
                  <h2 className="font-black text-base text-blue-950 uppercase">
                    DINAS PENDIDIKAN • {schoolProfile.namaSekolah}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    {schoolProfile.alamat}, {schoolProfile.kota} • Telp: {schoolProfile.telepon}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    NPSN: {schoolProfile.npsn} • Website: {schoolProfile.website}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <h4 className="font-black text-sm uppercase tracking-wide underline text-slate-900">
                  LEMBAR RAPOR KEHADIRAN BULANAN PESERTA DIDIK
                </h4>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Periode: Bulan {monthNames[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              {/* Biodata Siswa */}
              <div className="p-4 bg-slate-50 border rounded-2xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px]">NAMA SISWA:</span>
                  <strong className="text-sm text-slate-900">{targetStudent?.nama}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px]">NISN / ID:</span>
                  <span className="font-mono font-bold text-slate-900">{targetStudent?.nisn}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px]">KELAS / TINGKAT:</span>
                  <strong className="text-blue-800">{targetStudent?.kelas}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px]">TAHUN AJARAN:</span>
                  <span>{targetStudent?.tahun || schoolProfile.tahunAjaranAktif}</span>
                </div>
              </div>

              {/* KPI Badges Real-Time */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs font-bold">
                <div className="p-2.5 bg-slate-100 rounded-xl border">
                  <span className="text-[10px] text-slate-500 block">Hari Efektif</span>
                  <span className="text-base font-black text-slate-900">{effectiveDaysInMonth} Hari</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block">Total Hadir</span>
                  <span className="text-base font-black text-emerald-700">{indHadir} Hari</span>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-blue-800 block">Sakit (S)</span>
                  <span className="text-base font-black text-blue-700">{indSakit}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 block">Izin (I)</span>
                  <span className="text-base font-black text-amber-700">{indIjin}</span>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-800 block">Alpa (A)</span>
                  <span className="text-base font-black text-rose-700">{indAlpa}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-700" />
                  <div>
                    <span className="font-bold text-blue-900">Persentase Kehadiran: {indPercent}%</span>
                    <p className="text-[11px] text-slate-600">
                      Predikat Disiplin Kehadiran:{' '}
                      <strong className="text-blue-800">{disciplineGrade}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-extrabold text-[11px] border-b text-slate-700">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Waktu Scan (WIB)</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Keterangan Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {individualMonthRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Belum ada riwayat kehadiran pada bulan terpilih.
                        </td>
                      </tr>
                    ) : (
                      individualMonthRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2 font-medium">{r.date}</td>
                          <td className="p-2 font-mono text-slate-500">{r.time} WIB</td>
                          <td className="p-2 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                r.status === 'Hadir'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'Sakit'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.status === 'Ijin'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">
                            {r.keterangan || `Tercatat oleh ${r.petugas || 'Sistem'}`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Exact 3 Official Signatures Specified in Prompt:
                  Paling Kiri: Mengetahui, Kepala Sekolah
                  Di Tengah: Diketahui, Orang Tua / Wali Murid
                  Paling Kanan: Jakarta, [Tanggal], Wali Kelas */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-slate-300 text-xs text-center text-slate-800">
                {/* Left: Kepala Sekolah */}
                <div className="flex flex-col justify-between items-center h-40">
                  <div>
                    <p className="text-[11px]">Mengetahui,</p>
                    <p className="font-extrabold text-slate-900">Kepala SMA Negeri 109 Jakarta</p>
                  </div>
                  <div className="w-14 h-14 rounded-full border border-red-500 text-red-600 font-bold text-[6px] flex flex-col items-center justify-center opacity-80 my-1">
                    <span>STEMPEL RESMI</span>
                    <span>SMAN 109 JKT</span>
                  </div>
                  <div>
                    <p className="font-black underline text-slate-900">{schoolProfile.kepalaSekolah}</p>
                    <p className="text-[10px] text-slate-500 font-mono">NIP. {schoolProfile.nipKepalaSekolah}</p>
                  </div>
                </div>

                {/* Middle: Orang Tua / Wali Murid */}
                <div className="flex flex-col justify-between items-center h-40">
                  <div>
                    <p className="text-[11px]">Diketahui,</p>
                    <p className="font-extrabold text-slate-900">Orang Tua / Wali Murid</p>
                  </div>
                  <div className="h-14 flex items-center justify-center text-slate-300 italic text-[11px]">
                    (Tanda Tangan)
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-800">( ........................................ )</p>
                    <p className="text-[10px] text-slate-400">Nama Terang & Tanda Tangan</p>
                  </div>
                </div>

                {/* Right: Wali Kelas */}
                <div className="flex flex-col justify-between items-center h-40">
                  <div>
                    <p className="text-[11px]">
                      Jakarta, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </p>
                    <p className="font-extrabold text-slate-900">Wali Kelas {targetStudent?.kelas}</p>
                  </div>
                  <div className="h-14"></div>
                  <div>
                    <p className="font-black underline text-slate-900">{currentUser.nama}</p>
                    <p className="text-[10px] text-slate-500 font-mono">NIP. 19780815 200501 1 004</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
