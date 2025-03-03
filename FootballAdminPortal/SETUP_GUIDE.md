# Football Administration Platform Setup Guide

## Project Structure
```
├── client/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── lib/            # Core functionality
│   │   │   ├── firebase.ts    # Firebase configuration
│   │   │   ├── firestore.ts   # Database operations
│   │   │   ├── useAuth.tsx    # Authentication hook
│   │   │   └── useNotifications.tsx  # Notifications hook
│   │   ├── pages/          # Application pages
│   │   └── env.d.ts        # Environment variables types
│   └── index.html
├── shared/
│   └── schema.ts           # Type definitions
└── package.json
```

## Required Files

### 1. Firebase Configuration (client/src/lib/firebase.ts)
```typescript
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const googleProvider = new GoogleAuthProvider();

export { app as default, auth, db, googleProvider };
```

### 2. Environment Variables (.env)
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Type Definitions (shared/schema.ts)
This file contains all the TypeScript interfaces and Zod schemas for type validation:
```typescript
import { z } from "zod";

// User types
export const insertUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  photoURL: z.string().nullable(),
  uid: z.string(),
  role: z.enum(['admin', 'referee']),
  phone: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05").optional(),
  isAvailable: z.boolean().default(true),
  verificationStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  documentationUrl: z.string().optional()
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
```

## Environment Setup

1. Install Node.js (version 20.x recommended)

2. Install dependencies:
```bash
npm install
```

Required dependencies from package.json:
- React + Vite
- Firebase
- TanStack Query
- Tailwind CSS
- shadcn/ui components
- Zod for validation
- React Hook Form
- Wouter for routing

## Firebase Setup

1. Create a new Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Google Sign-in)
3. Create a Firestore database
4. Set up Firestore rules (firebase.rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // For development only
    }
  }
}
```

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5000

## Features
- User Authentication (Admin/Referee)
- Referee Management
- Match Scheduling
- Real-time Notifications
- Verification System for Referees

## Important Notes
1. The application uses Firebase/Firestore for all data storage
2. All API keys should be kept secure and never committed to version control
3. The Firestore rules should be properly secured before production deployment
4. The application is designed to be mobile-responsive

## Troubleshooting
1. If you see Firebase initialization errors, check your environment variables
2. For authentication issues, ensure Firebase Authentication is properly configured
3. For database errors, verify Firestore rules and permissions
