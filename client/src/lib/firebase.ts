import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED, clearIndexedDbPersistence } from "firebase/firestore";

// Clear all Firebase-related caches and storage
async function clearFirebaseData() {
  console.log('Clearing all Firebase data...');

  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('firebase') || key?.includes('firestore')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Clear IndexedDB databases
  const databases = await window.indexedDB.databases();
  await Promise.all(
    databases
      .filter(db => db.name?.includes('firebase') || db.name?.includes('firestore'))
      .map(db => window.indexedDB.deleteDatabase(db.name!))
  );

  // Clear service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }

  // Clear application cache
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.includes('firebase') || name.includes('firestore'))
        .map(name => caches.delete(name))
    );
  }
}

// Clear all Firebase data before initialization
await clearFirebaseData();

// Add error handling for missing environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET'
];

const missingVars = requiredEnvVars.filter(
  varName => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase configuration: ${missingVars.join(', ')}`
  );
}

// Initialize Firebase with new configuration
console.log('Initializing Firebase with new configuration...');
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase with a unique name and time stamp to avoid conflicts
const app = initializeApp(firebaseConfig, `football-admin-${Date.now()}`);

// Initialize Firestore with better offline support
console.log('Initializing Firestore with offline support...');
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Clear existing Firestore cache
console.log('Clearing Firestore cache...');
clearIndexedDbPersistence(db).catch((err) => {
  console.warn('Error clearing persistence:', err);
});

// Initialize Auth services
console.log('Initializing Auth...');
const auth = getAuth(app);

// Sign out any existing user to ensure clean state
signOut(auth).catch((error) => {
  console.warn('Error signing out existing user:', error);
});

const googleProvider = new GoogleAuthProvider();

// Enable offline persistence with detailed error logging
console.log('Enabling Firestore persistence...');
enableIndexedDbPersistence(db, {
  forceOwnership: true // This ensures persistence works in multiple tabs
}).then(() => {
  console.log('Firestore persistence enabled successfully');
}).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser doesn\'t support offline persistence');
  } else {
    console.error('Error enabling persistence:', err);
  }
});

export { app as default, auth, db, googleProvider };