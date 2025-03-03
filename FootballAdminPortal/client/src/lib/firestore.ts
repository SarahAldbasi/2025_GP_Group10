import { 
  collection, 
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  type FirestoreError,
  writeBatch,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
const usersCollection = collection(db, 'users');
const matchesCollection = collection(db, 'matches');
const notificationsCollection = collection(db, 'notifications');
const verificationRequestsCollection = collection(db, 'verificationRequests');

// Types
export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  photoURL: string | null; 
  uid: string;
  role: 'admin' | 'referee';
  phone?: string;
  isAvailable: boolean; 
  verificationStatus: 'pending' | 'approved' | 'rejected';
  documentationUrl?: string;
}

export interface Match {
  id?: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  date: Date;
  league: string;
  status: string;
  mainReferee: string;
  assistantReferee1?: string | null;
  assistantReferee2?: string | null;
}

export interface Notification {
  id?: string;
  message: string;
  timestamp: Date;
  readBy: string[]; 
}

export interface VerificationRequest {
  id?: string;
  userId: string;
  submissionDate: Date;
  documentationType: 'license' | 'certificate' | 'other';
  documentationData: {
    description: string;
    fileType: string;
    additionalNotes?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewDate?: Date;
  reviewNotes?: string;
}

// Mock verification requests for static feature
const MOCK_VERIFICATION_REQUESTS: VerificationRequest[] = [
  {
    id: 'ver1',
    userId: 'ref1',
    submissionDate: new Date('2024-02-20'),
    documentationType: 'license',
    documentationData: {
      description: 'Official Referee License',
      fileType: 'pdf',
      additionalNotes: '5 years of experience'
    },
    status: 'pending'
  },
  {
    id: 'ver2',
    userId: 'ref2',
    submissionDate: new Date('2024-02-21'),
    documentationType: 'certificate',
    documentationData: {
      description: 'Referee Training Certificate',
      fileType: 'pdf'
    },
    status: 'pending'
  }
];

// Error handling helper
const handleFirestoreError = (error: FirestoreError, operation: string) => {
  console.error(`Firestore ${operation} error:`, {
    code: error.code,
    message: error.message,
    details: error,
    timestamp: new Date().toISOString()
  });
  throw error;
};

// User operations
export const subscribeToUsers = (role: 'admin' | 'referee' | null, callback: (users: User[]) => void) => {
  console.log('Setting up users subscription...', {
    role,
    timestamp: new Date().toISOString()
  });

  // Create query based on role
  const q = role 
    ? query(usersCollection, where('role', '==', role))
    : query(usersCollection);

  return onSnapshot(
    q,
    {
      includeMetadataChanges: true
    },
    (snapshot) => {
      // Get all users
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      console.log('Raw users data:', {
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          role: u.role,
          isAvailable: u.isAvailable
        }))
      });

      // Filter users based on role and context
      let filteredUsers = users;

      // Only apply availability filter for referees in specific contexts
      if (role === 'referee') {
        // Show all referees for the referee page
        filteredUsers = users;
      }

      callback(filteredUsers);
    },
    (error) => {
      console.error('Users subscription error:', {
        code: error.code,
        message: error.message,
        details: error,
        timestamp: new Date().toISOString()
      });
      handleFirestoreError(error as FirestoreError, 'subscription');
    }
  );
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    console.log('Creating new user:', {
      data: user,
      timestamp: new Date().toISOString()
    });

    // Check if user already exists with this UID
    const existingUserQuery = query(usersCollection, where('uid', '==', user.uid));
    const existingUserDocs = await getDocs(existingUserQuery);

    if (!existingUserDocs.empty) {
      console.log('User already exists:', {
        uid: user.uid,
        timestamp: new Date().toISOString()
      });
      const existingDoc = existingUserDocs.docs[0];
      return { id: existingDoc.id, ...existingDoc.data() } as User;
    }

    // Set default values for new users
    const userData = {
      ...user,
      isAvailable: true, // Always set isAvailable to true for new users
      verificationStatus: user.role === 'referee' ? 'approved' : undefined // Auto-approve referees
    };

    const docRef = await addDoc(usersCollection, userData);
    const newUser = { id: docRef.id, ...userData };

    console.log('Successfully created user:', {
      id: docRef.id,
      data: newUser,
      timestamp: new Date().toISOString()
    });

    // Create notification for new referee
    if (user.role === 'referee') {
      await addNotification(
        `New referee ${user.firstName} ${user.lastName} has been added to the system`
      );
    }

    return newUser;
  } catch (error) {
    console.error('Error creating user:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  try {
    console.log('Updating user:', { id, data: user, timestamp: new Date().toISOString() });
    const docRef = doc(usersCollection, id);
    await updateDoc(docRef, user);
    console.log('Successfully updated user:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating user:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    console.log('Deleting user:', { id, timestamp: new Date().toISOString() });

    // Get the user's name before deletion
    const userDoc = await getDoc(doc(usersCollection, id));
    const userName = userDoc.exists() 
      ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
      : 'Unknown user';

    // Delete the user
    await deleteDoc(doc(usersCollection, id));

    // Add notification about deletion
    await addNotification(`${userName} has been removed from the system`);

    console.log('Successfully deleted user:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting user:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const getUsers = async (role?: 'admin' | 'referee'): Promise<User[]> => {
  try {
    console.log('Fetching users...', { role, timestamp: new Date().toISOString() });
    const q = role 
      ? query(usersCollection, where('role', '==', role))
      : usersCollection;

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
    console.log('Successfully fetched users:', { count: users.length, timestamp: new Date().toISOString() });
    return users;
  } catch (error) {
    console.error('Error getting users:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Match operations
export const getMatches = async (): Promise<Match[]> => {
  try {
    console.log('Fetching all matches...', { timestamp: new Date().toISOString() });
    const snapshot = await getDocs(matchesCollection);
    const matches = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate()
      } as Match;
    });
    console.log('Successfully fetched matches:', { count: matches.length, timestamp: new Date().toISOString() });
    return matches;
  } catch (error) {
    console.error('Error getting matches:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match> => {
  try {
    console.log('Creating new match:', { data: match, timestamp: new Date().toISOString() });
    const matchData = {
      ...match,
      date: Timestamp.fromDate(match.date)
    };
    const docRef = await addDoc(matchesCollection, matchData);
    console.log('Successfully created match:', { id: docRef.id, timestamp: new Date().toISOString() });
    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const updateMatch = async (id: string, match: Partial<Match>): Promise<void> => {
  try {
    console.log('Updating match:', { id, data: match, timestamp: new Date().toISOString() });
    const docRef = doc(matchesCollection, id);
    const updateData = { ...match };
    if (match.date) {
      updateData.date = Timestamp.fromDate(match.date);
    }
    await updateDoc(docRef, updateData);
    console.log('Successfully updated match:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating match:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const deleteMatch = async (id: string): Promise<void> => {
  try {
    console.log('Deleting match:', { id, timestamp: new Date().toISOString() });
    const docRef = doc(matchesCollection, id);
    await deleteDoc(docRef);
    console.log('Successfully deleted match:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting match:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Notification operations
export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  console.log('Setting up notifications subscription...', {
    collection: 'notifications',
    userId,
    timestamp: new Date().toISOString()
  });

  // Query all notifications
  const q = query(notificationsCollection);

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('Received notifications update:', {
        count: snapshot.docs.length,
        timestamp: new Date().toISOString(),
        metadata: snapshot.metadata
      });
      const notifications = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            message: data.message,
            timestamp: data.timestamp.toDate(), 
            readBy: data.readBy || []
          } as Notification;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      callback(notifications);
    },
    (error) => {
      console.error('Notifications subscription error:', {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      handleFirestoreError(error as FirestoreError, 'subscription');
    }
  );
};

export const addNotification = async (message: string): Promise<void> => {
  try {
    console.log('Creating new notification:', {
      message,
      timestamp: new Date().toISOString()
    });

    // Store the actual message text instead of IDs
    const notificationData = {
      message,
      timestamp: Timestamp.fromDate(new Date()),
      readBy: [] 
    };

    await addDoc(notificationsCollection, notificationData);
    console.log('Successfully created notification');
  } catch (error) {
    console.error('Error creating notification:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const markNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    console.log('Marking notifications as read:', {
      userId,
      timestamp: new Date().toISOString()
    });

    const snapshot = await getDocs(notificationsCollection);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      const readBy = doc.data().readBy || [];
      if (!readBy.includes(userId)) {
        batch.update(doc.ref, {
          readBy: arrayUnion(userId)
        });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking notifications as read:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Verification operations
export const getVerificationRequests = async (): Promise<VerificationRequest[]> => {
  // For static feature, return mock data
  return MOCK_VERIFICATION_REQUESTS;
};

export const updateVerificationRequest = async (
  id: string,
  update: Partial<VerificationRequest>
): Promise<void> => {
  // For static feature, log the update
  console.log('Updating verification request:', { id, update });

  // If it's an approval/rejection, create a notification
  if (update.status === 'approved' || update.status === 'rejected') {
    const request = MOCK_VERIFICATION_REQUESTS.find(r => r.id === id);
    if (request) {
      const message = `Referee verification request ${id} has been ${update.status}`;
      await addNotification(message);
    }
  }
};

// Add getReferees function
export const getReferees = async (): Promise<User[]> => {
  return getUsers('referee');
};

// Initialize admin user with error handling and retries
export const initializeAdminUser = async () => {
  try {
    console.log('Starting admin user initialization...', {
      timestamp: new Date().toISOString(),
      database: 'Hakkim-Database'
    });

    const adminQuery = query(usersCollection, where('role', '==', 'admin'));
    const snapshot = await getDocs(adminQuery);

    console.log('Checked for existing admin:', {
      exists: !snapshot.empty,
      count: snapshot.docs.length,
      timestamp: new Date().toISOString()
    });

    if (snapshot.empty) {
      // Create Firebase Auth user
      const adminEmail = 'admin@footballadmin.com';
      const adminPassword = 'Admin123!'; // Should be changed after first login

      console.log('Creating admin auth user...', {
        email: adminEmail,
        timestamp: new Date().toISOString()
      });

      // Commented out auth.createUserWithEmailAndPassword because it causes circular dependency
      // const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
      // const adminData = {
      //   email: adminEmail,
      //   firstName: 'System',
      //   lastName: 'Admin',
      //   uid: userCredential.user.uid,
      //   role: 'admin',
      //   isAvailable: true
      // };


      // Placeholder for admin creation - needs alternative approach due to circular dependency
      const adminData = {
        email: adminEmail,
        firstName: 'System',
        lastName: 'Admin',
        uid: 'admin-uid-placeholder', // Placeholder UID - needs a proper solution
        role: 'admin',
        isAvailable: true
      };

      console.log('Creating admin Firestore document...', {
        data: adminData,
        timestamp: new Date().toISOString()
      });

      const docRef = await addDoc(usersCollection, adminData);

      console.log('Admin Firestore document created:', {
        id: docRef.id,
        timestamp: new Date().toISOString()
      });

      return true;
    }

    console.log('Admin user already exists, skipping initialization');
    return false;
  } catch (error: any) {
    console.error('Error in admin initialization:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const initializeSampleData = async () => {
  try {
    console.log('Starting sample data initialization...', {
      timestamp: new Date().toISOString(),
      database: 'Hakkim-Database'
    });

    // Check and create sample matches
    const matchesSnapshot = await getDocs(matchesCollection);
    console.log('Checked matches collection:', {
      exists: !matchesSnapshot.empty,
      count: matchesSnapshot.docs.length,
      timestamp: new Date().toISOString()
    });

    if (matchesSnapshot.empty) {
      const sampleMatches = [
        {
          homeTeam: 'Manchester United',
          awayTeam: 'Liverpool',
          venue: 'Old Trafford',
          date: new Date('2025-03-01T15:00:00'),
          league: 'Premier League',
          status: 'scheduled',
          mainReferee: 'John Smith',
          assistantReferee1: 'Mike Johnson',
          assistantReferee2: 'David Wilson'
        },
        {
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          venue: 'Emirates Stadium',
          date: new Date('2025-03-08T17:30:00'),
          league: 'Premier League',
          status: 'scheduled',
          mainReferee: 'Sarah Parker',
          assistantReferee1: 'James Brown',
          assistantReferee2: 'Robert Taylor'
        }
      ];

      console.log('Creating sample matches...', {
        count: sampleMatches.length,
        timestamp: new Date().toISOString()
      });

      for (const match of sampleMatches) {
        const docRef = await addDoc(matchesCollection, match);
        console.log('Created match:', {
          id: docRef.id,
          match: match,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check and create sample notifications
    const notificationsSnapshot = await getDocs(notificationsCollection);
    console.log('Checked notifications collection:', {
      exists: !notificationsSnapshot.empty,
      count: notificationsSnapshot.docs.length,
      timestamp: new Date().toISOString()
    });

    if (notificationsSnapshot.empty) {
      const sampleNotifications = [
        'Welcome to the Football Admin Dashboard!',
        'New match schedule has been published',
        'Referee verification system is now active'
      ];

      console.log('Creating sample notifications...', {
        count: sampleNotifications.length,
        timestamp: new Date().toISOString()
      });

      for (const message of sampleNotifications) {
        const notificationData = {
          message,
          timestamp: Timestamp.fromDate(new Date()),
          readBy: []
        };
        const docRef = await addDoc(notificationsCollection, notificationData);
        console.log('Created notification:', {
          id: docRef.id,
          message: message,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log('Sample data initialization completed successfully', {
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sample data initialization:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Immediately invoke initialization
console.log('Starting database initialization...', {
  timestamp: new Date().toISOString(),
  database: 'Hakkim-Database'
});

Promise.all([
  initializeAdminUser(),
  initializeSampleData()
]).then(() => {
  console.log('Database initialization completed', {
    timestamp: new Date().toISOString(),
    database: 'Hakkim-Database'
  });
}).catch(error => {
  console.error('Database initialization failed:', {
    error,
    timestamp: new Date().toISOString(),
    database: 'Hakkim-Database'
  });
});

export { 
  usersCollection,
  matchesCollection,
  notificationsCollection,
  verificationRequestsCollection,
  Timestamp
};