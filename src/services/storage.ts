import { AdminUser, AdminActivityLog, Student, AttendanceRecord, SchoolProfile } from '../types';

export const DEFAULT_SCHOOL_LOGO = 'https://iili.io/CZUdvRa.jpg';

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  namaSekolah: 'SMA NEGERI 109 JAKARTA',
  namaSingkat: 'SMAN 109 JKT',
  npsn: '20102564',
  alamat: 'Jl. Srengseng Sawah No.109, RT.05/RW.07, Jagakarsa',
  kelurahan: 'Srengseng Sawah',
  kecamatan: 'Jagakarsa',
  kota: 'Kota Jakarta Selatan',
  provinsi: 'DKI Jakarta',
  kodePos: '12640',
  telepon: '(021) 7864456',
  email: 'info@sman109-jkt.sch.id',
  website: 'https://sman109-jkt.sch.id',
  kepalaSekolah: 'Dr. Hj. Siti Fatimah, M.Pd.',
  nipKepalaSekolah: '19680512 199403 2 001',
  tahunAjaranAktif: '2025/2026',
  semesterAktif: 'Ganjil',
  logoUrl: DEFAULT_SCHOOL_LOGO,
  tataTertibKartu: [
    'Kartu ini adalah identitas resmi peserta didik SMA NEGERI 109 JAKARTA.',
    'Wajib dibawa setiap hari dan ditunjukkan saat absensi gerbang & perpustakaan.',
    'Dilarang meminjamkan, mengubah, atau menyalahgunakan kartu kepada pihak lain.',
    'Jika kartu hilang atau rusak, segera melapor kepada Tata Usaha (TU) sekolah.',
    'Kartu ini berlaku selama menjadi peserta didik aktif di SMA NEGERI 109 JAKARTA.',
  ],
};

export const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 'adm_01',
    nama: 'Sudiyantoro, S.T.',
    username: 'sudiyantoro',
    email: 'sudiyantoro62@gmail.com',
    passwordHash: 'admin109',
    role: 'super_admin',
    telepon: '081234567890',
    status: 'Aktif',
    terakhirLogin: '2026-10-13 07:30 WIB',
    dibuatPada: '2025-07-01',
  },
  {
    id: 'adm_02',
    nama: 'Dra. Hj. Nurul Hidayati',
    username: 'nurul_tu',
    email: 'tu.sman109@jakarta.go.id',
    passwordHash: 'tu109',
    role: 'admin',
    telepon: '081388992211',
    status: 'Aktif',
    terakhirLogin: '2026-10-13 07:15 WIB',
    dibuatPada: '2025-07-01',
  },
  {
    id: 'adm_03',
    nama: 'Bambang Sutejo, S.Pd.',
    username: 'piket109',
    email: 'piket.sman109@jakarta.go.id',
    passwordHash: 'piket109',
    role: 'operator',
    telepon: '081577663344',
    status: 'Aktif',
    terakhirLogin: '2026-10-13 06:45 WIB',
    dibuatPada: '2025-07-01',
  },
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: '0081234501',
    nisn: '0081234501',
    nama: 'Aditya Pratama Nugraha',
    kelas: 'X-A',
    tahun: '2025/2026',
    jenisKelamin: 'L',
    telepon: '081299887701',
    foto: null,
  },
  {
    id: '0081234502',
    nisn: '0081234502',
    nama: 'Aisyah Putri Azzahra',
    kelas: 'X-A',
    tahun: '2025/2026',
    jenisKelamin: 'P',
    telepon: '081299887702',
    foto: null,
  },
  {
    id: '0081234503',
    nisn: '0081234503',
    nama: 'Bima Satria Wicaksono',
    kelas: 'X-B',
    tahun: '2025/2026',
    jenisKelamin: 'L',
    telepon: '081299887703',
    foto: null,
  },
  {
    id: '0081234504',
    nisn: '0081234504',
    nama: 'Cantika Dewi Maharani',
    kelas: 'X-B',
    tahun: '2025/2026',
    jenisKelamin: 'P',
    telepon: '081299887704',
    foto: null,
  },
  {
    id: '0071234505',
    nisn: '0071234505',
    nama: 'Dafa Alamsyah',
    kelas: 'XI-MIPA-1',
    tahun: '2025/2026',
    jenisKelamin: 'L',
    telepon: '081299887705',
    foto: null,
  },
  {
    id: '0071234506',
    nisn: '0071234506',
    nama: 'Farah Nabilah',
    kelas: 'XI-MIPA-1',
    tahun: '2025/2026',
    jenisKelamin: 'P',
    telepon: '081299887706',
    foto: null,
  },
  {
    id: '0071234507',
    nisn: '0071234507',
    nama: 'Gilang Ramadhan',
    kelas: 'XI-IPS-1',
    tahun: '2025/2026',
    jenisKelamin: 'L',
    telepon: '081299887707',
    foto: null,
  },
  {
    id: '0061234508',
    nisn: '0061234508',
    nama: 'Hafiz Rayhan',
    kelas: 'XII-MIPA-1',
    tahun: '2025/2026',
    jenisKelamin: 'L',
    telepon: '081299887708',
    foto: null,
  },
  {
    id: '0061234509',
    nisn: '0061234509',
    nama: 'Indah Kusuma Wardani',
    kelas: 'XII-MIPA-1',
    tahun: '2025/2026',
    jenisKelamin: 'P',
    telepon: '081299887709',
    foto: null,
  },
  {
    id: '0061234510',
    nisn: '0061234510',
    nama: 'Kevin Jonathan',
    kelas: 'XII-IPS-2',
    tahun: '2025/2026',
    jenisKelamin: 'L',
    telepon: '081299887710',
    foto: null,
  },
];

// LocalStorage Keys
const KEYS = {
  ADMINS: 'sman109_admins',
  STUDENTS: 'sman109_students',
  ATTENDANCES: 'sman109_attendances',
  ACTIVITY_LOGS: 'sman109_activity_logs',
  SCHOOL_PROFILE: 'sman109_school_profile',
  ACTIVE_USER: 'sman109_current_user',
};

// Storage helper methods
export const getStoredSchoolProfile = (): SchoolProfile => {
  try {
    const raw = localStorage.getItem(KEYS.SCHOOL_PROFILE);
    if (raw) return { ...DEFAULT_SCHOOL_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SCHOOL_PROFILE;
};

export const saveSchoolProfile = (profile: SchoolProfile) => {
  try {
    localStorage.setItem(KEYS.SCHOOL_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save school profile', e);
  }
};

export const getStoredAdmins = (): AdminUser[] => {
  try {
    const raw = localStorage.getItem(KEYS.ADMINS);
    if (raw) return JSON.parse(raw);
  } catch {}
  saveAdmins(INITIAL_ADMINS);
  return INITIAL_ADMINS;
};

export const saveAdmins = (admins: AdminUser[]) => {
  try {
    localStorage.setItem(KEYS.ADMINS, JSON.stringify(admins));
  } catch (e) {
    console.error('Failed to save admins', e);
  }
};

export const getStoredStudents = (): Student[] => {
  try {
    const raw = localStorage.getItem(KEYS.STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  saveStudents(INITIAL_STUDENTS);
  return INITIAL_STUDENTS;
};

export const saveStudents = (students: Student[]) => {
  try {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students', e);
  }
};

export const getStoredAttendances = (): AttendanceRecord[] => {
  try {
    const raw = localStorage.getItem(KEYS.ATTENDANCES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const saveAttendances = (attendances: AttendanceRecord[]) => {
  try {
    localStorage.setItem(KEYS.ATTENDANCES, JSON.stringify(attendances));
  } catch (e) {
    console.error('Failed to save attendances', e);
  }
};

export const getStoredActivityLogs = (): AdminActivityLog[] => {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVITY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const logAdminActivity = (
  admin: AdminUser | null,
  aksi: string,
  detail: string
) => {
  try {
    const currentLogs = getStoredActivityLogs();
    const newLog: AdminActivityLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      waktu: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      adminUsername: admin?.username || 'system',
      adminNama: admin?.nama || 'Sistem',
      peran: admin?.role || 'super_admin',
      aksi,
      detail,
    };
    const updated = [newLog, ...currentLogs].slice(0, 500); // keep last 500
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to log admin activity', e);
  }
};

export const getActiveUser = (): AdminUser | null => {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_USER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const setActiveUser = (user: AdminUser | null) => {
  try {
    if (user) {
      localStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.ACTIVE_USER);
    }
  } catch (e) {
    console.error('Failed to set active user', e);
  }
};

// Client-side image compression: Standard portrait 2:3 ratio (~25 - 40 KB, 300x450px)
export const compressStudentPhoto = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Target 2:3 ratio, e.g. 300 x 450 px
        const targetWidth = 300;
        const targetHeight = 450;
        const targetRatio = 2 / 3;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        // Center crop to 2:3
        const srcRatio = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;

        if (srcRatio > targetRatio) {
          // Source is wider than 2:3
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          // Source is taller than 2:3
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

        // Export as WebP / JPEG with 0.85 quality (~25-35KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// Date utilities
export const getFormattedToday = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getFormattedTime = (): string => {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
};
