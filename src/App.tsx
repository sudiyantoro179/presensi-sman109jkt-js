import React, { useState, useEffect } from 'react';
import { 
  AdminUser, 
  Student, 
  AttendanceRecord, 
  SchoolProfile, 
  AdminActivityLog, 
  NavigationTab,
  AttendanceStatus
} from './types';
import { 
  getStoredSchoolProfile, 
  saveSchoolProfile,
  getStoredAdmins, 
  saveAdmins,
  getStoredStudents, 
  saveStudents,
  getStoredAttendances, 
  saveAttendances,
  getStoredActivityLogs,
  getActiveUser,
  setActiveUser,
  getFormattedToday,
  logAdminActivity,
  INITIAL_STUDENTS,
  INITIAL_ADMINS,
  DEFAULT_SCHOOL_PROFILE
} from './services/storage';
import {
  testFirestoreConnection,
  subscribeStudents,
  subscribeAttendances,
  subscribeAdmins,
  subscribeActivityLogs,
  subscribeSchoolProfile,
  saveStudentDoc,
  deleteStudentDoc,
  saveAttendanceDoc,
  batchSaveAttendances,
  deleteAttendanceDoc,
  saveAdminDoc,
  deleteAdminDoc,
  saveActivityLogDoc,
  saveSchoolProfileDoc,
  logOutFromFirebase
} from './services/firebase';

import { Navbar } from './components/Navbar';
import { LoginGate } from './components/LoginGate';
import { ScanTab } from './components/ScanTab';
import { AbsentTab } from './components/AbsentTab';
import { StudentsTab } from './components/StudentsTab';
import { ReportTab } from './components/ReportTab';
import { CardsTab } from './components/CardsTab';
import { AiAnalysisTab } from './components/AiAnalysisTab';
import { AdminTab } from './components/AdminTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  // Global States (Offline-first initialized)
  const [currentUser, setCurrentUserState] = useState<AdminUser | null>(() => getActiveUser());
  const [activeTab, setActiveTab] = useState<NavigationTab>('scan');
  const [activeDate, setActiveDate] = useState<string>(() => getFormattedToday());

  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getStoredSchoolProfile());
  const [admins, setAdmins] = useState<AdminUser[]>(() => getStoredAdmins());
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() => getStoredAttendances());
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>(() => getStoredActivityLogs());
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);

  // Firestore Live Realtime Synchronization
  useEffect(() => {
    // Test initial connection as required
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    });

    // 1. Subscribe Students
    const unsubStudents = subscribeStudents(
      (cloudStudents) => {
        if (cloudStudents && cloudStudents.length > 0) {
          setStudents(cloudStudents);
          saveStudents(cloudStudents);
        } else {
          // If Firestore is newly provisioned and empty, seed initial students
          INITIAL_STUDENTS.forEach((st) => saveStudentDoc(st));
        }
      },
      () => setFirestoreConnected(false)
    );

    // 2. Subscribe Attendances
    const unsubAttendances = subscribeAttendances(
      (cloudAttendances) => {
        if (cloudAttendances) {
          setAttendances(cloudAttendances);
          saveAttendances(cloudAttendances);
        }
      },
      () => setFirestoreConnected(false)
    );

    // 3. Subscribe Admins
    const unsubAdmins = subscribeAdmins(
      (cloudAdmins) => {
        if (cloudAdmins && cloudAdmins.length > 0) {
          setAdmins(cloudAdmins);
          saveAdmins(cloudAdmins);
        } else {
          // If Firestore admins empty, seed initial admins
          INITIAL_ADMINS.forEach((adm) => saveAdminDoc(adm));
        }
      },
      () => setFirestoreConnected(false)
    );

    // 4. Subscribe Activity Logs
    const unsubLogs = subscribeActivityLogs(
      (cloudLogs) => {
        if (cloudLogs) {
          setActivityLogs(cloudLogs);
        }
      },
      () => setFirestoreConnected(false)
    );

    // 5. Subscribe School Profile
    const unsubProfile = subscribeSchoolProfile(
      (cloudProfile) => {
        if (cloudProfile && cloudProfile.namaSekolah) {
          setSchoolProfile(cloudProfile);
          saveSchoolProfile(cloudProfile);
        } else {
          saveSchoolProfileDoc(DEFAULT_SCHOOL_PROFILE);
        }
      },
      () => setFirestoreConnected(false)
    );

    return () => {
      unsubStudents();
      unsubAttendances();
      unsubAdmins();
      unsubLogs();
      unsubProfile();
    };
  }, []);

  // Automatic route protection based on role
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'operator') {
      const allowedForOperator: NavigationTab[] = ['scan', 'absent', 'students', 'report'];
      if (!allowedForOperator.includes(activeTab)) {
        setActiveTab('scan');
      }
    } else if (currentUser.role === 'admin') {
      if (activeTab === 'admin') {
        setActiveTab('scan');
      }
    }
  }, [currentUser, activeTab]);

  // Login handler
  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUserState(user);
    setActiveUser(user);
    setActiveTab('scan');
  };

  // Logout handler
  const handleLogout = () => {
    if (currentUser) {
      logAdminActivity(currentUser, 'Logout Sesi', `Pengguna keluar dari aplikasi`);
    }
    logOutFromFirebase();
    setCurrentUserState(null);
    setActiveUser(null);
    setActiveTab('scan');
  };

  // Record Attendance
  const handleRecordAttendance = (record: AttendanceRecord) => {
    // 1. Update Cloud Firestore
    saveAttendanceDoc(record);

    // 2. Update local state & storage for instant UI update
    setAttendances((prev) => {
      const idx = prev.findIndex((a) => a.id === record.id);
      let updated: AttendanceRecord[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = record;
      } else {
        updated = [record, ...prev];
      }
      saveAttendances(updated);
      return updated;
    });
  };

  // Bulk Record Attendance (Super Admin)
  const handleBulkRecordAttendance = (records: AttendanceRecord[]) => {
    // 1. Write batch to Cloud Firestore
    batchSaveAttendances(records);

    // 2. Update local state
    setAttendances((prev) => {
      const recordMap = new Map<string, AttendanceRecord>();
      prev.forEach((r) => recordMap.set(r.id, r));
      records.forEach((r) => recordMap.set(r.id, r));
      const updated = Array.from(recordMap.values());
      saveAttendances(updated);
      return updated;
    });
  };

  // Student CRUD
  const handleSaveStudent = (student: Student) => {
    // 1. Cloud Firestore sync
    saveStudentDoc(student);

    // 2. Local state sync
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.nisn === student.nisn);
      let updated: Student[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = student;
      } else {
        updated = [student, ...prev];
      }
      saveStudents(updated);
      return updated;
    });
  };

  const handleDeleteStudent = (nisn: string) => {
    // 1. Cloud Firestore sync
    deleteStudentDoc(nisn);

    // 2. Local state & attendances cleanup
    setStudents((prev) => {
      const updated = prev.filter((s) => s.nisn !== nisn);
      saveStudents(updated);
      return updated;
    });
    setAttendances((prev) => {
      const updated = prev.filter((a) => a.nisn !== nisn);
      saveAttendances(updated);
      return updated;
    });
  };

  const handleBulkSaveStudents = (newStudents: Student[]) => {
    // 1. Save all to Cloud Firestore
    newStudents.forEach((s) => saveStudentDoc(s));

    // 2. Update local state
    setStudents((prev) => {
      const studentMap = new Map<string, Student>();
      prev.forEach((s) => studentMap.set(s.nisn, s));
      newStudents.forEach((s) => studentMap.set(s.nisn, s));
      const updated = Array.from(studentMap.values());
      saveStudents(updated);
      return updated;
    });
  };

  // Admin CRUD
  const handleSaveAdmin = (adm: AdminUser) => {
    saveAdminDoc(adm);
    setAdmins((prev) => {
      const idx = prev.findIndex((a) => a.id === adm.id);
      let updated: AdminUser[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = adm;
      } else {
        updated = [...prev, adm];
      }
      saveAdmins(updated);
      return updated;
    });
  };

  const handleDeleteAdmin = (id: string) => {
    deleteAdminDoc(id);
    setAdmins((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveAdmins(updated);
      return updated;
    });
  };

  // School Profile Update
  const handleUpdateSchoolProfile = (profile: SchoolProfile) => {
    saveSchoolProfileDoc(profile);
    setSchoolProfile(profile);
    saveSchoolProfile(profile);
  };

  // Reset Today Attendance
  const handleResetTodayAttendance = () => {
    const today = getFormattedToday();
    const todayAttendances = attendances.filter((a) => a.date === today);
    todayAttendances.forEach((a) => deleteAttendanceDoc(a.id));

    setAttendances((prev) => {
      const updated = prev.filter((a) => a.date !== today);
      saveAttendances(updated);
      return updated;
    });
    logAdminActivity(currentUser, 'Reset Presensi Hari Ini', `Menghapus presensi ${today}`);
  };

  // Reset All Attendance
  const handleResetAllAttendance = () => {
    attendances.forEach((a) => deleteAttendanceDoc(a.id));
    setAttendances([]);
    saveAttendances([]);
    logAdminActivity(currentUser, 'Reset Seluruh Presensi', 'Mengosongkan seluruh riwayat absensi');
  };

  // Restore All Data from JSON
  const handleRestoreAllData = (data: {
    schoolProfile?: SchoolProfile;
    students?: Student[];
    attendances?: AttendanceRecord[];
    admins?: AdminUser[];
  }) => {
    if (data.schoolProfile) {
      saveSchoolProfileDoc(data.schoolProfile);
      setSchoolProfile(data.schoolProfile);
      saveSchoolProfile(data.schoolProfile);
    }
    if (data.students && Array.isArray(data.students)) {
      data.students.forEach((s) => saveStudentDoc(s));
      setStudents(data.students);
      saveStudents(data.students);
    }
    if (data.attendances && Array.isArray(data.attendances)) {
      batchSaveAttendances(data.attendances);
      setAttendances(data.attendances);
      saveAttendances(data.attendances);
    }
    if (data.admins && Array.isArray(data.admins)) {
      data.admins.forEach((a) => saveAdminDoc(a));
      setAdmins(data.admins);
      saveAdmins(data.admins);
    }
  };

  // If user is not logged in, show initial Login Gate
  if (!currentUser) {
    return (
      <LoginGate
        admins={admins}
        schoolProfile={schoolProfile}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Header and Nav */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        schoolProfile={schoolProfile}
        activeDate={activeDate}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 flex-grow no-print">
        {activeTab === 'scan' && (
          <ScanTab
            students={students}
            attendances={attendances}
            currentUser={currentUser}
            activeDate={activeDate}
            onActiveDateChange={setActiveDate}
            onRecordAttendance={handleRecordAttendance}
            onBulkRecordAttendance={handleBulkRecordAttendance}
          />
        )}

        {activeTab === 'absent' && (
          <AbsentTab
            students={students}
            attendances={attendances}
            currentUser={currentUser}
            activeDate={activeDate}
            schoolProfile={schoolProfile}
            onRecordAttendance={handleRecordAttendance}
          />
        )}

        {activeTab === 'students' && (
          <StudentsTab
            students={students}
            currentUser={currentUser}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            onBulkSaveStudents={handleBulkSaveStudents}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            students={students}
            attendances={attendances}
            schoolProfile={schoolProfile}
            currentUser={currentUser}
            onUpdateAttendanceStatus={(nisn, date, status) => {
              const rec = attendances.find((a) => a.nisn === nisn && a.date === date);
              if (rec) {
                handleRecordAttendance({ ...rec, status, petugas: currentUser.nama });
              }
            }}
          />
        )}

        {activeTab === 'cards' && (
          <CardsTab
            students={students}
            schoolProfile={schoolProfile}
            currentUser={currentUser}
            onUpdateSchoolProfile={handleUpdateSchoolProfile}
          />
        )}

        {activeTab === 'ai' && (
          <AiAnalysisTab
            students={students}
            attendances={attendances}
            schoolProfile={schoolProfile}
          />
        )}

        {activeTab === 'admin' && currentUser.role === 'super_admin' && (
          <AdminTab
            admins={admins}
            activityLogs={activityLogs}
            currentUser={currentUser}
            onSaveAdmin={handleSaveAdmin}
            onDeleteAdmin={handleDeleteAdmin}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            schoolProfile={schoolProfile}
            students={students}
            attendances={attendances}
            admins={admins}
            activityLogs={activityLogs}
            currentUser={currentUser}
            onUpdateSchoolProfile={handleUpdateSchoolProfile}
            onRestoreAllData={handleRestoreAllData}
            onResetTodayAttendance={handleResetTodayAttendance}
            onResetAllAttendance={handleResetAllAttendance}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 text-center border-t border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2025/2026 {schoolProfile.namaSekolah}. Hak Cipta Dilindungi.</p>
          <p className="text-[11px] text-slate-500">
            Terhubung ke Google Cloud Firestore (presensi-sman-109) • Real-time Sync & Awan Abadi
          </p>
        </div>
      </footer>
    </div>
  );
}
