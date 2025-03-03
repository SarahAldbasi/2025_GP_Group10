import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED, collection, query, where, getDocs, addDoc } from "firebase/firestore";

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

// Initialize Firebase with a unique name
const app = initializeApp(firebaseConfig);

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

// Create a function to handle user document creation
async function createUserDocument(user: any) {
  const usersCollection = collection(db, 'users');

  try {
    // Check if user already exists
    const existingUserQuery = query(usersCollection, where('uid', '==', user.uid));
    const existingUserDocs = await getDocs(existingUserQuery);

    if (!existingUserDocs.empty) {
      console.log('User document already exists:', user.uid);
      return;
    }

    // Create new user document with validated data
    const userData = {
      uid: user.uid,
      email: user.email || '',
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ')[1] || '',
      photoURL: user.photoURL || null, // Changed from undefined to null
      role: 'admin', // Default to admin role
      isAvailable: true,
      verificationStatus: 'pending'
    };

    // Log the data being saved
    console.log('Attempting to create user document with data:', userData);

    await addDoc(usersCollection, userData);
    console.log('Created new user document:', user.uid);
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

// Set up auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('Auth state changed - user signed in:', user.uid);
    try {
      await createUserDocument(user);
    } catch (error) {
      console.error('Error in auth state change handler:', error);
    }
  } else {
    console.log('Auth state changed - user signed out');
  }
});

const googleProvider = new GoogleAuthProvider();

export { app as default, auth, db, googleProvider };