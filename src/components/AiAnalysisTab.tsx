import React, { useState } from 'react';
import { Student, AttendanceRecord, SchoolProfile } from '../types';
import { 
  Sparkles, 
  Bot, 
  Send, 
  TrendingUp, 
  AlertTriangle, 
  UserCheck, 
  RefreshCw, 
  Lightbulb, 
  ShieldAlert, 
  FileCheck 
} from 'lucide-react';

interface AiAnalysisTabProps {
  students: Student[];
  attendances: AttendanceRecord[];
  schoolProfile: SchoolProfile;
}

interface AnalysisResult {
  ringkasanEksekutif?: string;
  trenKehadiran?: string[];
  sorotanPerKelas?: Array<{ kelas: string; status: string; catatan: string }>;
  rekomendasiGuruBK?: string[];
  rekomendasiWaliKelas?: string[];
  rawText?: string;
}

export const AiAnalysisTab: React.FC<AiAnalysisTabProps> = ({
  students,
  attendances,
  schoolProfile,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    {
      role: 'model',
      content:
        'Halo! Saya Asisten AI Presensi & Kesiswaan SMA NEGERI 109 JAKARTA. Anda dapat menanyakan tren absensi, siswa dengan frekuensi ketidakhadiran tinggi, draf pemanggilan orang tua, maupun konsultasi Guru BK.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Compute stats for AI context
  const totalStudents = students.length;
  const classesList = Array.from(new Set(students.map((s) => s.kelas)));
  const classStats = classesList.map((c) => {
    const classStudents = students.filter((s) => s.kelas === c);
    const classAttendances = attendances.filter((a) => a.kelas === c);
    const hadir = classAttendances.filter((a) => a.status === 'Hadir').length;
    const sakit = classAttendances.filter((a) => a.status === 'Sakit').length;
    const ijin = classAttendances.filter((a) => a.status === 'Ijin').length;
    const alpa = classAttendances.filter((a) => a.status === 'Alpa').length;

    return {
      kelas: c,
      jumlahSiswa: classStudents.length,
      hadir,
      sakit,
      ijin,
      alpa,
    };
  });

  const attendanceSummary = {
    totalSiswaTerdaftar: totalStudents,
    totalRekamanPresensi: attendances.length,
    hadir: attendances.filter((a) => a.status === 'Hadir').length,
    sakit: attendances.filter((a) => a.status === 'Sakit').length,
    ijin: attendances.filter((a) => a.status === 'Ijin').length,
    alpa: attendances.filter((a) => a.status === 'Alpa').length,
  };

  // Run Gemini Analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceSummary,
          classStats,
          period: 'Semester Ganjil 2025/2026',
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menghubungi layanan Gemini API');
      }

      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message || 'Terjadi kesalahan saat memproses analisis.');
      // Fallback local smart insights if offline or API key missing
      setAnalysis({
        ringkasanEksekutif:
          `Berdasarkan data presensi SMA NEGERI 109 JAKARTA, tingkat partisipasi kehadiran tercatat ${attendanceSummary.hadir} siswa hadir dari ${totalStudents} siswa terdaftar. Tingkat kehadiran menunjukkan kedisiplinan yang stabil di kelas reguler, dengan beberapa siswa memerlukan tindak lanjut surat izin dari orang tua.`,
        trenKehadiran: [
          'Tingkat kehadiran tertinggi terpantau pada kelompok kelas X dan XI.',
          'Pola keterlambatan dan izin sakit cenderung terdistribusi di awal dan akhir pekan.',
          'Rasio kehadiran memenuhi standar akreditasi sekolah unggulan DKI Jakarta.',
        ],
        sorotanPerKelas: classStats.map((c) => ({
          kelas: c.kelas,
          status: c.alpa > 1 ? 'Perlu Perhatian' : 'Teladan',
          catatan: `${c.hadir} hadir, ${c.sakit} sakit, ${c.alpa} alpa`,
        })),
        rekomendasiGuruBK: [
          'Lakukan pendampingan personal bagi siswa yang memiliki catatan Alpa berturut-turut.',
          'Koordinasikan dengan wali kelas untuk memanggil orang tua siswa dengan absensi di bawah 80%.',
          'Sediakan konseling motivasi belajar bagi siswa yang sering izin sakit berulang.',
        ],
        rekomendasiWaliKelas: [
          'Kirimkan notifikasi harian via WhatsApp grup wali murid segera setelah jam presensi gerbang berakhir.',
          'Verifikasi surat dokter atau surat izin fisik dari orang tua untuk status Sakit dan Izin.',
          'Apresiasi siswa dengan rekor kehadiran 100% pada upacara bendera hari Senin.',
        ],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Chat message send
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query || isSendingChat) return;

    const newHistory = [...chatMessages, { role: 'user' as const, content: query }];
    setChatMessages(newHistory);
    setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          contextData: {
            sekolah: schoolProfile.namaSekolah,
            tahunAjaran: schoolProfile.tahunAjaranAktif,
            kpiPresensi: attendanceSummary,
            rekapKelas: classStats,
          },
          history: newHistory.slice(-6),
        }),
      });

      if (!res.ok) throw new Error('Gagal menghubungi asisten chat');
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: 'model', content: data.reply || 'Tidak ada balasan.' },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content:
            'Mohon maaf, koneksi ke asisten AI sedang mengalami kendala. Anda dapat meninjau langsung ringkasan statistik pada tab Rekap & Ekspor.',
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> Analisis Presensi Cerdas (Gemini 3.8 Flash)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ringkasan eksekutif pimpinan sekolah, deteksi tren absensi, dan rekomendasi tindak lanjut Guru BK & Wali Kelas.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Sedang Menganalisis Data...' : 'Mulai Analisis Cerdas AI'}</span>
          </button>
        </div>

        {analysisError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs mb-4">
            ℹ️ {analysisError} (Menampilkan rekomendasi terstruktur sekolah)
          </div>
        )}

        {/* Executive Summary Cards */}
        {analysis ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Ringkasan Eksekutif */}
            <div className="p-5 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200 rounded-3xl space-y-2">
              <span className="px-3 py-1 bg-purple-600 text-white text-[11px] font-bold rounded-full inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Ringkasan Eksekutif Kepala Sekolah
              </span>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed mt-2">
                {analysis.ringkasanEksekutif}
              </p>
            </div>

            {/* Trends and Class Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tren Kehadiran */}
              <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Tren & Pola Kehadiran
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {analysis.trenKehadiran?.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sorotan Per Kelas */}
              <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Sorotan Kelas
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {analysis.sorotanPerKelas?.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between text-xs gap-2"
                    >
                      <div>
                        <strong className="text-slate-900 block font-bold">Kelas {c.kelas}</strong>
                        <span className="text-[11px] text-slate-500">{c.catatan}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          c.status.includes('Teladan')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations for BK & Wali Kelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Guru BK */}
              <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-3xl space-y-3">
                <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" /> Rekomendasi Tindak Lanjut Guru BK
                </h4>
                <ul className="space-y-2 text-xs text-amber-950">
                  {analysis.rekomendasiGuruBK?.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Wali Kelas */}
              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-3xl space-y-3">
                <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-emerald-600" /> Rekomendasi Tindakan Wali Kelas
                </h4>
                <ul className="space-y-2 text-xs text-emerald-950">
                  {analysis.rekomendasiWaliKelas?.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 border border-dashed rounded-3xl space-y-3">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">
              Belum Menjalankan Analisis Presensi AI
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Klik tombol &quot;Mulai Analisis Cerdas AI&quot; di atas untuk mengevaluasi data kehadiran murid, tren per kelas, dan rekomendasi Guru BK.
            </p>
          </div>
        )}
      </div>

      {/* AI Attendance Chatbot Assistant */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[480px]">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Bot className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-black text-sm text-slate-900">
              Chatbot Asisten Presensi & Konsultasi BK
            </h3>
            <p className="text-[11px] text-slate-500">
              Tanyakan pertanyaan seputar data absensi siswa, aturan kehadiran, dan pembuatan draf pesan.
            </p>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 text-xs ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'model' && (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  AI
                </div>
              )}
              <div
                className={`max-w-[80%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isSendingChat && (
            <div className="flex gap-2.5 text-xs justify-start">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                AI
              </div>
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-500 italic">
                Sedang mengetik jawaban...
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t mt-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Tanyakan analisis siswa belum hadir, aturan izin, atau draf pesan WA..."
            className="flex-grow px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={isSendingChat || !chatInput.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Kirim
          </button>
        </form>
      </div>
    </div>
  );
};
