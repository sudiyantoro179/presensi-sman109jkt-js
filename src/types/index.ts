export type UserRole = 'super_admin' | 'admin' | 'operator';

export interface AdminUser {
  id: string;
  nama: string;
  username: string;
  email: string;
  passwordHash: string; // Plain PIN/Password in demo or hashed
  role: UserRole;
  telepon: string;
  status: 'Aktif' | 'Nonaktif';
  terakhirLogin?: string;
  dibuatPada: string;
}

export interface AdminActivityLog {
  id: string;
  waktu: string;
  adminUsername: string;
  adminNama: string;
  peran: UserRole;
  aksi: string;
  detail: string;
  ipAddress?: string;
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Ijin' | 'Alpa';

export interface Student {
  id: string; // usually nisn
  nisn: string;
  nama: string;
  kelas: string;
  tahun: string;
  jenisKelamin?: 'L' | 'P';
  telepon?: string;
  foto?: string | null; // Base64 data URI (2:3 aspect ratio compressed)
  fotoUpdatedAt?: string;
}

export interface AttendanceRecord {
  id: string; // nisn_date
  nisn: string;
  nama: string;
  kelas: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  keterangan?: string;
  petugas?: string; // admin who recorded/scanned
}

export interface SchoolProfile {
  namaSekolah: string;
  namaSingkat: string;
  npsn: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  tahunAjaranAktif: string;
  semesterAktif: 'Ganjil' | 'Genap';
  logoUrl: string | null;
  tataTertibKartu: string[];
}

export type NavigationTab = 
  | 'scan'
  | 'absent'
  | 'students'
  | 'report'
  | 'cards'
  | 'ai'
  | 'admin'
  | 'settings';
