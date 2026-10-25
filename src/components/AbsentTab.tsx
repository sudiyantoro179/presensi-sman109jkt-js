import React, { useState } from 'react';
import { Student, AttendanceRecord, AdminUser, AttendanceStatus, SchoolProfile } from '../types';
import { 
  UserX, 
  Copy, 
  Check, 
  Search, 
  TrendingUp, 
  Share2, 
  Calendar,
  AlertTriangle,
  Send
} from 'lucide-react';
import { getFormattedTime, logAdminActivity } from '../services/storage';

interface AbsentTabProps {
  students: Student[];
  attendances: AttendanceRecord[];
  currentUser: AdminUser;
  activeDate: string;
  schoolProfile: SchoolProfile;
  onRecordAttendance: (record: AttendanceRecord) => void;
}

export const AbsentTab: React.FC<AbsentTabProps> = ({
  students,
  attendances,
  currentUser,
  activeDate,
  schoolProfile,
  onRecordAttendance,
}) => {
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  // Set of recorded NISNs on active date
  const recordedMap = new Map<string, AttendanceRecord>();
  attendances
    .filter((a) => a.date === activeDate)
    .forEach((a) => recordedMap.set(a.nisn, a));

  // Absent students (not yet recorded on active date)
  const absentStudents = students.filter((s) => {
    const isAbsent = !recordedMap.has(s.nisn);
    const matchClass = selectedClass === 'ALL' || s.kelas === selectedClass;
    const matchSearch =
      s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn.includes(search);
    return isAbsent && matchClass && matchSearch;
  });

  const classesList = Array.from(new Set(students.map((s) => s.kelas))).sort();

  // Class attendance percentage calculation
  const totalStudentsInSelection = students.filter(
    (s) => selectedClass === 'ALL' || s.kelas === selectedClass
  ).length;

  const presentStudentsInSelection = students.filter(
    (s) =>
      (selectedClass === 'ALL' || s.kelas === selectedClass) &&
      recordedMap.get(s.nisn)?.status === 'Hadir'
  ).length;

  const attendancePercent =
    totalStudentsInSelection > 0
      ? Math.round((presentStudentsInSelection / totalStudentsInSelection) * 100)
      : 0;

  // 1-Click Quick status setter
  const handleQuickStatus = (s: Student, status: AttendanceStatus) => {
    const record: AttendanceRecord = {
      id: `${s.nisn}_${activeDate}`,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      date: activeDate,
      time: getFormattedTime(),
      status,
      keterangan: `Disetel via tab Belum Absen oleh ${currentUser.nama}`,
      petugas: currentUser.nama,
    };
    onRecordAttendance(record);
    logAdminActivity(currentUser, 'Set Kehadiran Cepat', `${s.nama} (${s.kelas}) -> ${status}`);
  };

  // Copy WhatsApp Formatted Text
  const copyWhatsAppFormat = () => {
    let msg = `*LAPORAN SISWA BELUM PRESENSI*\n`;
    msg += `*${schoolProfile.namaSekolah}*\n`;
    msg += `Tanggal: ${activeDate} (Pukul ${getFormattedTime()} WIB)\n`;
    msg += `Filter: ${selectedClass === 'ALL' ? 'Semua Kelas' : `Kelas ${selectedClass}`}\n`;
    msg += `Persentase Kehadiran: ${attendancePercent}%\n`;
    msg += `------------------------------------\n`;

    if (absentStudents.length === 0) {
      msg += `Alhamdulillah, seluruh siswa telah melakukan presensi kehadiran!\n`;
    } else {
      absentStudents.forEach((s, idx) => {
        msg += `${idx + 1}. *${s.nama}* (Kelas: ${s.kelas} | NISN: ${s.nisn})\n`;
      });
      msg += `------------------------------------\n`;
      msg += `Total Belum Absen: ${absentStudents.length} siswa\n`;
      msg += `_Mohon Bapak/Ibu Wali Kelas & Orang Tua untuk konfirmasi kehadiran atau keterangan ijin/sakit. Terima kasih._`;
    }

    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" /> Siswa Belum Absen ({activeDate})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daftar murid yang belum memindai kartu pada tanggal aktif. Atur status langsung atau kirim rekap ke grup wali murid.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copyWhatsAppFormat}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Teks Tersalin ke Clipboard!' : 'Salin Format WA / Telegram'}</span>
            </button>
          </div>
        </div>

        {/* Attendance Rate & KPI Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 block uppercase tracking-wide">
                Belum Hadir
              </span>
              <span className="text-2xl font-black text-rose-700">{absentStudents.length} Siswa</span>
            </div>
            <div className="p-3 bg-rose-200/50 rounded-xl text-rose-700">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wide">
                Sudah Hadir
              </span>
              <span className="text-2xl font-black text-emerald-700">
                {presentStudentsInSelection} / {totalStudentsInSelection}
              </span>
            </div>
            <div className="p-3 bg-emerald-200/50 rounded-xl text-emerald-700">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 block uppercase tracking-wide">
                Persentase Kehadiran
              </span>
              <span className="text-2xl font-black text-blue-700">{attendancePercent}%</span>
            </div>
            <div className="w-14 h-14 relative flex items-center justify-center font-black text-xs text-blue-900 bg-white rounded-full border-2 border-blue-400">
              {attendancePercent}%
            </div>
          </div>
        </div>

        {/* Search & Class Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa belum hadir berdasarkan nama atau NISN..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {classesList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards Grid for Absent Students */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {absentStudents.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 font-bold text-lg">
                ✓
              </div>
              <h4 className="font-extrabold text-sm text-slate-800">
                Semua Siswa Telah Dicatat Kehadirannya! 🎉
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada murid yang berstatus belum absen pada filter kelas ini.
              </p>
            </div>
          ) : (
            absentStudents.map((s) => (
              <div
                key={s.nisn}
                className="p-4 bg-white hover:bg-rose-50/20 border-2 border-rose-100 hover:border-rose-300 rounded-2xl shadow-xs transition flex flex-col justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {s.foto ? (
                    <img
                      src={s.foto}
                      alt={s.nama}
                      className="w-12 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                      2x3
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">{s.nama}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kelas: <strong className="text-blue-700">{s.kelas}</strong> • NISN: {s.nisn}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Belum Memindai Kartu
                    </span>
                  </div>
                </div>

                {/* 1-Click Status Setter Buttons */}
                <div className="border-t border-slate-100 pt-2.5">
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                    Set Kehadiran 1-Klik:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    <button
                      onClick={() => handleQuickStatus(s, 'Hadir')}
                      className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition"
                    >
                      Hadir
                    </button>
                    <button
                      onClick={() => handleQuickStatus(s, 'Sakit')}
                      className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
                    >
                      Sakit
                    </button>
                    <button
                      onClick={() => handleQuickStatus(s, 'Ijin')}
                      className="py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-xs transition"
                    >
                      Izin
                    </button>
                    <button
                      onClick={() => handleQuickStatus(s, 'Alpa')}
                      className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition"
                    >
                      Alpa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
