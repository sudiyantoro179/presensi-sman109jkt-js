import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Student, AttendanceRecord, AdminUser, AdminActivityLog, SchoolProfile } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test Connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline-cached mode.');
    }
    return false;
  }
}

// Google Sign-In via Popup
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

export async function logOutFromFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('Sign out warning:', err);
  }
}

// ----------------------------------------------------
// Realtime Sync Listeners with Offline-Fallback
// ----------------------------------------------------

export function subscribeStudents(
  onUpdate: (students: Student[]) => void,
  onError?: (err: any) => void
) {
  const path = 'students';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: Student[] = snapshot.docs.map((d) => d.data() as Student);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export function subscribeAttendances(
  onUpdate: (attendances: AttendanceRecord[]) => void,
  onError?: (err: any) => void
) {
  const path = 'attendances';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: AttendanceRecord[] = snapshot.docs.map((d) => d.data() as AttendanceRecord);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export function subscribeAdmins(
  onUpdate: (admins: AdminUser[]) => void,
  onError?: (err: any) => void
) {
  const path = 'admins';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: AdminUser[] = snapshot.docs.map((d) => d.data() as AdminUser);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export function subscribeActivityLogs(
  onUpdate: (logs: AdminActivityLog[]) => void,
  onError?: (err: any) => void
) {
  const path = 'activityLogs';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: AdminActivityLog[] = snapshot.docs.map((d) => d.data() as AdminActivityLog);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export function subscribeSchoolProfile(
  onUpdate: (profile: SchoolProfile) => void,
  onError?: (err: any) => void
) {
  const path = 'settings';
  return onSnapshot(
    doc(db, path, 'schoolProfile'),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SchoolProfile);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${path}/schoolProfile`);
      if (onError) onError(error);
    }
  );
}

// ----------------------------------------------------
// Firestore Write Functions
// ----------------------------------------------------

export async function saveStudentDoc(student: Student) {
  const path = `students/${student.nisn}`;
  try {
    await setDoc(doc(db, 'students', student.nisn), student, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteStudentDoc(nisn: string) {
  const path = `students/${nisn}`;
  try {
    await deleteDoc(doc(db, 'students', nisn));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveAttendanceDoc(record: AttendanceRecord) {
  const path = `attendances/${record.id}`;
  try {
    await setDoc(doc(db, 'attendances', record.id), record, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function batchSaveAttendances(records: AttendanceRecord[]) {
  try {
    const batch = writeBatch(db);
    records.forEach((r) => {
      const docRef = doc(db, 'attendances', r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'attendances/batch');
  }
}

export async function deleteAttendanceDoc(recordId: string) {
  const path = `attendances/${recordId}`;
  try {
    await deleteDoc(doc(db, 'attendances', recordId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveAdminDoc(admin: AdminUser) {
  const path = `admins/${admin.id}`;
  try {
    await setDoc(doc(db, 'admins', admin.id), admin, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAdminDoc(adminId: string) {
  const path = `admins/${adminId}`;
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveActivityLogDoc(log: AdminActivityLog) {
  const path = `activityLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'activityLogs', log.id), log);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSchoolProfileDoc(profile: SchoolProfile) {
  const path = 'settings/schoolProfile';
  try {
    await setDoc(doc(db, 'settings', 'schoolProfile'), profile, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
