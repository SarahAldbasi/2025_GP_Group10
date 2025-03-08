import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, collection, query, where, getDocs, addDoc } from "firebase/firestore";


console.log("Initializing Firebase with new configuration...");

const firebaseConfig = {
  apiKey: "AIzaSyC16V8PSX1lRNH-uNDMIBqxxcqrxP9tJIE",
  authDomain: "hakkim-database-42b05.firebaseapp.com",
  projectId: "hakkim-database-42b05",
  storageBucket: "hakkim-database-42b05.firebasestorage.app",
  messagingSenderId: "30678186224",
  appId: "1:30678186224:web:92261f806c80be87f72a35"
};

// Check if Firebase config is properly loaded
if (!firebaseConfig.apiKey) {
  console.error("Firebase API key is missing. Make sure your .env file is properly configured.");
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline capabilities
console.log("Initializing Firestore with offline support...");
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Initialize Auth services with persistence
console.log("Initializing Auth with persistence...");
const auth = getAuth(app);

// Set persistence asynchronously
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set successfully");
  })
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
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
      photoURL: user.photoURL || null, 
      role: 'admin', 
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

// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
// import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "AIzaSyC16V8PSX1lRNH-uNDMIBqxxcqrxP9tJIE",
//   authDomain: "hakkim-database-42b05.firebaseapp.com",
//   projectId: "hakkim-database-42b05",
//   storageBucket: "hakkim-database-42b05.firebasestorage.app",
//   messagingSenderId: "30678186224",
//   appId: "1:30678186224:web:92261f806c80be87f72a35"
// };

// const app = initializeApp(firebaseConfig);
// const db = initializeFirestore(app, {
//   cacheSizeBytes: CACHE_SIZE_UNLIMITED
// });
// const auth = getAuth(app);
// setPersistence(auth, browserLocalPersistence);
// const googleProvider = new GoogleAuthProvider();

// export { app as default, auth, db, googleProvider };