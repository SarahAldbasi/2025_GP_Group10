import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDoc, doc } from "firebase/firestore";


// Add error handling for missing environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID'
];

const missingVars = requiredEnvVars.filter(
  varName => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase configuration: ${missingVars.join(', ')}`
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Add basic error handling and retry logic.  This is a simplified example and
// might need adjustments depending on the specific error scenarios and retry strategy.

async function getFirestoreData(docPath: string) {
  let retries = 3;
  while (retries > 0) {
    try {
      const docRef = doc(db, docPath);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log("No such document!");
        return null; // Or throw an error, depending on your needs
      }
    } catch (error) {
      console.error("Firestore error:", error);
      retries--;
      if (retries > 0) {
        console.log(`Retrying in 1 second... ${retries} retries left`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw new Error(`Failed to connect to Firestore after multiple retries: ${error}`);
      }
    }
  }
}


export { app as default, auth, db, googleProvider, getFirestoreData };