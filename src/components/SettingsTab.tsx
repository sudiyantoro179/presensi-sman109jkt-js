import React, { useState } from 'react';
import { SchoolProfile, Student, AttendanceRecord, AdminUser, AdminActivityLog } from '../types';
import { 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Save, 
  ShieldAlert, 
  CheckCircle2, 
  Building2, 
  Database,
  CloudCheck,
  Volume2
} from 'lucide-react';
import { getFormattedToday, logAdminActivity } from '../services/storage';
import { getSelectedVoice, setSelectedVoice } from '../services/audio';

interface SettingsTabProps {
  schoolProfile: SchoolProfile;
  students: Student[];
  attendances: AttendanceRecord[];
  admins: AdminUser[];
  activityLogs: AdminActivityLog[];
  currentUser: AdminUser;
  onUpdateSchoolProfile: (profile: SchoolProfile) => void;
  onRestoreAllData: (data: {
    schoolProfile?: SchoolProfile;
    students?: Student[];
    attendances?: AttendanceRecord[];
    admins?: AdminUser[];
  }) => void;
  onResetTodayAttendance: () => void;
  onResetAllAttendance: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  schoolProfile,
  students,
  attendances,
  admins,
  activityLogs,
  currentUser,
  onUpdateSchoolProfile,
  onRestoreAllData,
  onResetTodayAttendance,
  onResetAllAttendance,
}) => {
  const [profileForm, setProfileForm] = useState<SchoolProfile>({ ...schoolProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeVoice, setActiveVoice] = useState(getSelectedVoice());

  const isSuperAdmin = currentUser.role === 'super_admin';

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolProfile(profileForm);
    logAdminActivity(currentUser, 'Update Profil Sekolah', `${profileForm.namaSekolah}`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleVoiceChange = (v: string) => {
    setActiveVoice(v);
    setSelectedVoice(v);
  };

  // Backup Full JSON
  const handleDownloadBackup = () => {
    const backupData = {
      app: 'Sistem Presensi & Kartu Pelajar - SMAN 109 Jakarta',
      exportDate: new Date().toISOString(),
      exportedBy: currentUser.nama,
      schoolProfile,
      students,
      attendances,
      admins,
      activityLogs,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Lengkap_SMAN109_${getFormattedToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    logAdminActivity(currentUser, 'Unduh Backup JSON', 'Cadangan database lengkap');
  };

  // Restore from JSON
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        onRestoreAllData(parsed);
        logAdminActivity(currentUser, 'Restore Database', `Dipulihkan dari file backup ${file.name}`);
        setRestoreNotice(`Basis data berhasil dipulihkan dari file ${file.name}`);
        setTimeout(() => setRestoreNotice(null), 5000);
      } catch (err) {
        setRestoreNotice('Gagal: File JSON cadangan tidak valid atau korup.');
        setTimeout(() => setRestoreNotice(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: School Profile Form */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Identitas & Profil Resmi Sekolah
              </h3>
              <p className="text-xs text-slate-500">
                Data ini diterapkan pada kop kartu pelajar, lembar rapor, dan dokumen ekspor.
              </p>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profil sekolah berhasil diperbarui dan disimpan permanen!</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                value={profileForm.namaSekolah}
                onChange={(e) => setProfileForm({ ...profileForm, namaSekolah: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NPSN</label>
                <input
                  type="text"
                  value={profileForm.npsn}
                  onChange={(e) => setProfileForm({ ...profileForm, npsn: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran Aktif</label>
                <input
                  type="text"
                  value={profileForm.tahunAjaranAktif}
                  onChange={(e) => setProfileForm({ ...profileForm, tahunAjaranAktif: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={profileForm.alamat}
                onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={profileForm.kepalaSekolah}
                  onChange={(e) => setProfileForm({ ...profileForm, kepalaSekolah: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={profileForm.nipKepalaSekolah}
                  onChange={(e) => setProfileForm({ ...profileForm, nipKepalaSekolah: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon Sekolah</label>
                <input
                  type="text"
                  value={profileForm.telepon}
                  onChange={(e) => setProfileForm({ ...profileForm, telepon: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Website Resmi</label>
                <input
                  type="text"
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Simpan Perubahan Profil Sekolah
              </button>
            </div>
          </form>
        </div>

        {/* Right: Backup, Restore & Reset Database Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* TTS Voice Persona Config */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-3 text-xs">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-600" /> Karakter Pengumuman Suara Gemini TTS
            </h4>
            <p className="text-slate-500">
              Pilih gaya suara vokal Gemini untuk menyapa siswa saat pemindaian kartu sukses:
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 font-bold">
              {['Kore', 'Puck', 'Zephyr', 'Fenrir', 'Charon'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleVoiceChange(v)}
                  className={`py-2 rounded-xl border text-center transition ${
                    activeVoice === v
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Backup & Restore Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" /> Pencadangan & Pemulihan (Backup JSON)
            </h3>
            <p className="text-xs text-slate-500">
              Unduh cadangan data lengkap mencakup data murid, presensi, akun admin, dan log audit ke format JSON.
            </p>

            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Unduh Cadangan Lengkap (.json)
            </button>

            <div className="border-t pt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pulihkan Database dari File Cadangan JSON:
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="text-xs text-slate-500 block w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {restoreNotice && (
                <p className="text-xs font-semibold text-indigo-700 mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                  {restoreNotice}
                </p>
              )}
            </div>
          </div>

          {/* Reset Actions Card (Super Admin protected) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-rose-200 space-y-4">
            <h3 className="font-extrabold text-base text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Tindakan Reset Database
            </h3>
            <p className="text-xs text-slate-500">
              Gunakan dengan penuh kehati-hatian saat pergantian tahun ajaran baru atau membersihkan data simulasi.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={onResetTodayAttendance}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Absensi Hari Ini Saja
              </button>

              {isSuperAdmin && (
                <button
                  onClick={onResetAllAttendance}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Seluruh Riwayat Absensi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
