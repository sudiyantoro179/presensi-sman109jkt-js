import React, { useState } from 'react';
import { AdminUser, AdminActivityLog, UserRole } from '../types';
import { 
  ShieldCheck, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  User,
  Activity
} from 'lucide-react';
import { logAdminActivity } from '../services/storage';

interface AdminTabProps {
  admins: AdminUser[];
  activityLogs: AdminActivityLog[];
  currentUser: AdminUser;
  onSaveAdmin: (admin: AdminUser) => void;
  onDeleteAdmin: (id: string) => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  admins,
  activityLogs,
  currentUser,
  onSaveAdmin,
  onDeleteAdmin,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [telepon, setTelepon] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formError, setFormError] = useState('');

  // Tab view: Accounts or Activity Log
  const [subView, setSubView] = useState<'accounts' | 'logs'>('accounts');

  const openAddModal = () => {
    setEditingAdmin(null);
    setNama('');
    setUsername('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setTelepon('');
    setRole('operator');
    setStatus('Aktif');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (adm: AdminUser) => {
    setEditingAdmin(adm);
    setNama(adm.nama);
    setUsername(adm.username);
    setEmail(adm.email);
    setPassword(adm.passwordHash);
    setShowPassword(false);
    setTelepon(adm.telepon);
    setRole(adm.role);
    setStatus(adm.status);
    setFormError('');
    setShowModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim();
    const cleanPass = password.trim();

    if (!cleanNama || !cleanUsername || !cleanEmail || !cleanPass) {
      setFormError('Harap isi semua kolom wajib (*)');
      return;
    }

    // Check unique username and email
    const duplicate = admins.find(
      (a) =>
        (!editingAdmin || a.id !== editingAdmin.id) &&
        (a.username.toLowerCase() === cleanUsername || a.email.toLowerCase() === cleanEmail)
    );

    if (duplicate) {
      setFormError('Username atau Email sudah terdaftar pada akun lain.');
      return;
    }

    // Prevent demoting the last active super_admin
    const superAdmins = admins.filter((a) => a.role === 'super_admin' && a.status === 'Aktif');
    if (
      editingAdmin &&
      editingAdmin.role === 'super_admin' &&
      role !== 'super_admin' &&
      superAdmins.length <= 1
    ) {
      setFormError('Tidak dapat mengubah peran: Harus ada minimal 1 Admin Super aktif dalam sistem.');
      return;
    }

    const adminToSave: AdminUser = {
      id: editingAdmin ? editingAdmin.id : 'adm_' + Date.now(),
      nama: cleanNama,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: cleanPass,
      role,
      telepon: telepon.trim() || '-',
      status,
      dibuatPada: editingAdmin ? editingAdmin.dibuatPada : new Date().toISOString().slice(0, 10),
      terakhirLogin: editingAdmin ? editingAdmin.terakhirLogin : undefined,
    };

    onSaveAdmin(adminToSave);
    logAdminActivity(
      currentUser,
      editingAdmin ? 'Edit Akun Admin' : 'Tambah Akun Admin',
      `${cleanNama} (@${cleanUsername}) Peran: ${role}`
    );
    setShowModal(false);
  };

  const handleDelete = (adm: AdminUser) => {
    // Safety protection against deleting the last Super Admin
    if (adm.role === 'super_admin') {
      const superAdmins = admins.filter((a) => a.role === 'super_admin');
      if (superAdmins.length <= 1) {
        setAdminNotice({
          type: 'error',
          message: 'Tindakan Ditolak: Anda tidak dapat menghapus satu-satunya akun Admin Super dalam sistem!',
        });
        setTimeout(() => setAdminNotice(null), 5000);
        return;
      }
    }

    if (adm.id === currentUser.id) {
      setAdminNotice({
        type: 'error',
        message: 'Tindakan Ditolak: Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.',
      });
      setTimeout(() => setAdminNotice(null), 5000);
      return;
    }

    setAdminToDelete(adm);
  };

  const handleConfirmDelete = () => {
    if (!adminToDelete) return;
    const target = adminToDelete;
    onDeleteAdmin(target.id);
    logAdminActivity(currentUser, 'Hapus Akun Admin', `${target.nama} (@${target.username})`);
    setAdminToDelete(null);
    setAdminNotice({
      type: 'success',
      message: `Akun administrator "${target.nama}" (@${target.username}) berhasil dihapus.`,
    });
    setTimeout(() => setAdminNotice(null), 4000);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'super_admin':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">Admin Super (Penuh)</span>;
      case 'admin':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">Presensi & TU</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Operator Piket</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-view Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" /> Manajemen Akun Administrator & Audit Log
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kontrol Hak Akses Berbasis Peran (RBAC) dan Pelaporan Riwayat Aktivitas Admin Komprehensif.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-2xl bg-slate-100 p-1 border text-xs font-bold">
              <button
                onClick={() => setSubView('accounts')}
                className={`px-3.5 py-2 rounded-xl transition ${
                  subView === 'accounts' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Daftar Administrator ({admins.length})
              </button>
              <button
                onClick={() => setSubView('logs')}
                className={`px-3.5 py-2 rounded-xl transition ${
                  subView === 'logs' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Laporan Aktivitas ({activityLogs.length})
              </button>
            </div>

            {subView === 'accounts' && (
              <button
                onClick={openAddModal}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" /> Tambah Admin Baru
              </button>
            )}
          </div>
        </div>

        {/* Notice Banner */}
        {adminNotice && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-4 animate-fadeIn border ${
              adminNotice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {adminNotice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{adminNotice.message}</span>
          </div>
        )}

        {/* SUBVIEW 1: Admin Accounts Table */}
        {subView === 'accounts' && (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[11px] border-b">
                <tr>
                  <th className="p-3.5">Nama & Profil</th>
                  <th className="p-3.5">Username</th>
                  <th className="p-3.5">Email Resmi</th>
                  <th className="p-3.5">No. WhatsApp</th>
                  <th className="p-3.5">Peran Hak Akses</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Terakhir Aktif</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                        {adm.nama.charAt(0)}
                      </div>
                      <div>
                        <div>{adm.nama}</div>
                        {adm.id === currentUser.id && (
                          <span className="text-[10px] text-blue-600 font-semibold">(Sesi Aktif Anda)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700 font-bold">@{adm.username}</td>
                    <td className="p-3.5 text-slate-600">{adm.email}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">{adm.telepon}</td>
                    <td className="p-3.5">{getRoleBadge(adm.role)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          adm.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {adm.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">{adm.terakhirLogin || 'Baru dibuat'}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(adm)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                          title="Edit Akun"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(adm)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBVIEW 2: Admin Activity Log (Comprehensive Audit Trail) */}
        {subView === 'logs' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-950">
              <span className="font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-700" />
                Catatan Jejak Audit Keamanan (Security Audit Logs)
              </span>
              <span>Menampilkan {activityLogs.length} tindakan tercatat</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[11px] border-b">
                  <tr>
                    <th className="p-3.5">Waktu WIB</th>
                    <th className="p-3.5">Petugas / Admin</th>
                    <th className="p-3.5">Peran</th>
                    <th className="p-3.5">Jenis Tindakan</th>
                    <th className="p-3.5">Rincian & Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        Belum ada aktivitas admin tercatat.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                          {log.waktu}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {log.adminNama} <span className="font-mono text-slate-500 font-normal">(@{log.adminUsername})</span>
                        </td>
                        <td className="p-3">{getRoleBadge(log.peran)}</td>
                        <td className="p-3 font-bold text-blue-800">{log.aksi}</td>
                        <td className="p-3 text-slate-600">{log.detail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tambah / Edit Akun Administrator */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingAdmin ? 'Edit Akun Administrator' : 'Tambah Akun Admin Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="mis. Sudiyantoro, S.T."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pengguna (Username) *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mis. sudiyantoro"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Resmi *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@sekolah.sch.id"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Sandi / PIN Akun *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ketik password baru..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran Hak Akses (RBAC) *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="super_admin">Administrator Super (8 Menu - Akses Penuh)</option>
                  <option value="admin">Admin Presensi & TU (7 Menu - Presensi & Cetak)</option>
                  <option value="operator">Operator Piket Harian (4 Menu - Operasional Scan)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Akun Admin */}
      {adminToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Konfirmasi Hapus Admin</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border rounded-2xl space-y-1.5 text-xs">
              <p className="text-slate-600">Yakin ingin menghapus akses akun administrator berikut?</p>
              <div className="pt-1">
                <p className="font-extrabold text-slate-900 text-sm">{adminToDelete.nama}</p>
                <p className="text-slate-500 font-mono text-[11px]">@{adminToDelete.username} • {adminToDelete.email}</p>
                <div className="mt-1">{getRoleBadge(adminToDelete.role)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
