import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Redirect to main Firebase configuration
console.warn('Deprecated: Using src/lib/firebase.ts. Please update imports to use client/src/lib/firebase.ts');
export { default, auth, db, googleProvider } from '../../client/src/lib/firebase';