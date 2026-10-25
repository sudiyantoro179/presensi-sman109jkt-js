import React, { useState } from 'react';
import { AdminUser, NavigationTab, SchoolProfile } from '../types';
import { 
  QrCode, 
  UserX, 
  Users, 
  FileSpreadsheet, 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Volume2, 
  VolumeX, 
  Calendar,
  CloudCheck
} from 'lucide-react';
import { getMuted, setMuted, getSelectedVoice, setSelectedVoice } from '../services/audio';

interface NavbarProps {
  currentUser: AdminUser;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onLogout: () => void;
  schoolProfile: SchoolProfile;
  activeDate: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onLogout,
  schoolProfile,
  activeDate,
}) => {
  const [muted, setLocalMuted] = useState(getMuted());
  const [voice, setLocalVoice] = useState(getSelectedVoice());
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setLocalMuted(next);
    setMuted(next);
  };

  const changeVoice = (v: string) => {
    setLocalVoice(v);
    setSelectedVoice(v);
    setShowVoiceMenu(false);
  };

  // Role permissions
  const canAccessAdmin = currentUser.role === 'super_admin';
  const canAccessCardsAndAiAndSettings = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  // Navigation items config
  const navItems: Array<{ id: NavigationTab; label: string; icon: any; allowed: boolean; color: string }> = [
    { id: 'scan', label: 'Pindai Absensi', icon: QrCode, allowed: true, color: 'text-blue-500' },
    { id: 'absent', label: 'Belum Absen', icon: UserX, allowed: true, color: 'text-rose-500' },
    { id: 'students', label: 'Data Murid', icon: Users, allowed: true, color: 'text-sky-500' },
    { id: 'report', label: 'Rekap & Ekspor', icon: FileSpreadsheet, allowed: true, color: 'text-emerald-500' },
    { id: 'cards', label: 'Cetak Kartu', icon: CreditCard, allowed: canAccessCardsAndAiAndSettings, color: 'text-amber-500' },
    { id: 'ai', label: 'Analisis AI', icon: Sparkles, allowed: canAccessCardsAndAiAndSettings, color: 'text-purple-500' },
    { id: 'admin', label: 'Kelola Admin', icon: ShieldCheck, allowed: canAccessAdmin, color: 'text-indigo-500' },
    { id: 'settings', label: 'Pencadangan & Pengaturan', icon: Settings, allowed: canAccessCardsAndAiAndSettings, color: 'text-slate-500' },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 border border-amber-300">Admin Super</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-200 text-sky-900 border border-sky-300">Admin Presensi & TU</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">Operator Piket</span>;
    }
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl sticky top-0 z-40 border-b border-blue-900/40 no-print">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap justify-between items-center gap-3">
        {/* School Emblem & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white p-1 rounded-2xl shadow-md border-2 border-sky-400/50 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src={schoolProfile.logoUrl || 'https://iili.io/CZUdvRa.jpg'} 
              alt="Logo SMAN 109" 
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://iili.io/CZUdvRa.jpg';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-white">
                PRESENSI & KARTU PELAJAR
              </h1>
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-blue-500/20 text-sky-300 font-mono text-[10px] border border-blue-400/30">
                CR80 & AI
              </span>
            </div>
            <p className="text-xs text-sky-300 font-semibold tracking-wide mt-0.5">
              {schoolProfile.namaSekolah} • TA {schoolProfile.tahunAjaranAktif}
            </p>
          </div>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cloud Firestore Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-blue-500/30 text-emerald-300 font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Awan Abadi Firestore</span>
          </div>

          {/* Active Date Indicator */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-200 font-medium">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">{activeDate}</span>
          </div>

          {/* Audio TTS & Voice Character Menu */}
          <div className="relative">
            <button
              onClick={toggleMute}
              title={muted ? 'Suara Dinonaktifkan (Klik untuk aktifkan)' : 'Suara Aktif (Klik untuk bisukan)'}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                muted 
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900/60' 
                  : 'bg-blue-900/50 text-sky-200 border-blue-600/40 hover:bg-blue-800/60'
              }`}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
              <span className="hidden md:inline">{muted ? 'Muted' : `TTS: ${voice}`}</span>
            </button>

            {/* Voice Dropdown toggle button */}
            {!muted && (
              <button
                onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                className="ml-1 text-[10px] text-sky-300 hover:text-white underline"
              >
                Ganti
              </button>
            )}

            {showVoiceMenu && !muted && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Karakter Suara Gemini</div>
                {['Kore', 'Puck', 'Zephyr', 'Fenrir', 'Charon'].map((v) => (
                  <button
                    key={v}
                    onClick={() => changeVoice(v)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                      voice === v ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Suara {v} {voice === v && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Admin User Profile & Logout */}
          <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-1.5 py-1 rounded-xl border border-slate-700">
            <div className="text-right">
              <div className="text-xs font-bold text-white leading-tight flex items-center justify-end gap-1.5">
                <span>{currentUser.nama}</span>
              </div>
              <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
            </div>

            <button
              onClick={onLogout}
              title="Keluar / Logout Sesi"
              className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-950/70 border-t border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-thin">
          {navItems.filter(item => item.allowed).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 whitespace-nowrap transition-all shadow-sm ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-blue-900/50 shadow-md ring-1 ring-sky-300/40'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
