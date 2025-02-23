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
  photoURL?: string;
  uid: string;
  role: 'admin' | 'referee';
  phone?: string;
  isAvailable?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
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

  const q = role 
    ? query(usersCollection, where('role', '==', role))
    : usersCollection;

  return onSnapshot(
    q, 
    (snapshot) => {
      console.log('Received users update:', {
        count: snapshot.docs.length,
        timestamp: new Date().toISOString(),
        metadata: snapshot.metadata
      });
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      callback(users);
    },
    (error) => {
      console.error('Users subscription error:', {
        code: error.code,
        message: error.message,
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
    const docRef = await addDoc(usersCollection, user);
    const newUser = { id: docRef.id, ...user };
    console.log('Successfully created user:', {
      id: docRef.id,
      timestamp: new Date().toISOString()
    });
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

export { 
  usersCollection,
  matchesCollection,
  notificationsCollection,
  verificationRequestsCollection,
  Timestamp
};