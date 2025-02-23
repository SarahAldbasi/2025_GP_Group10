import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

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

// Initialize Auth services with persistence
console.log('Initializing Auth with persistence...');
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
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