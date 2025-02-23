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
const refereesCollection = collection(db, 'referees');
const matchesCollection = collection(db, 'matches');
const notificationsCollection = collection(db, 'notifications');

// Types
export interface Referee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isAvailable: boolean;
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
  readBy: string[]; // Array of user IDs who have read this notification
}

// Error handling helper with detailed logging
const handleFirestoreError = (error: FirestoreError, operation: string) => {
  console.error(`Firestore ${operation} error:`, {
    code: error.code,
    message: error.message,
    details: error,
    timestamp: new Date().toISOString()
  });
  throw error;
};

// Real-time referee subscription with detailed logging
export const subscribeToReferees = (callback: (referees: Referee[]) => void) => {
  console.log('Setting up referees subscription...', {
    collection: 'referees',
    timestamp: new Date().toISOString()
  });

  return onSnapshot(
    refereesCollection, 
    (snapshot) => {
      console.log('Received referees update:', {
        count: snapshot.docs.length,
        timestamp: new Date().toISOString(),
        metadata: snapshot.metadata
      });
      const referees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Referee));
      callback(referees);
    },
    (error) => {
      console.error('Referees subscription error:', {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      handleFirestoreError(error as FirestoreError, 'subscription');
    }
  );
};

// Referee operations with detailed logging
export const createReferee = async (referee: Omit<Referee, 'id'>): Promise<Referee> => {
  try {
    console.log('Creating new referee:', {
      data: referee,
      timestamp: new Date().toISOString()
    });
    const docRef = await addDoc(refereesCollection, referee);
    const newReferee = { id: docRef.id, ...referee };
    console.log('Successfully created referee:', {
      id: docRef.id,
      timestamp: new Date().toISOString()
    });
    return newReferee;
  } catch (error) {
    console.error('Error creating referee:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const updateReferee = async (id: string, referee: Partial<Referee>): Promise<void> => {
  try {
    console.log('Updating referee:', { id, data: referee, timestamp: new Date().toISOString() });
    const docRef = doc(refereesCollection, id);
    await updateDoc(docRef, referee);
    console.log('Successfully updated referee:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating referee:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const deleteReferee = async (id: string): Promise<void> => {
  try {
    console.log('Deleting referee:', { id, timestamp: new Date().toISOString() });

    // Get the referee's name before deletion to use in notification
    const refereeDoc = await getDoc(doc(refereesCollection, id));
    const refereeName = refereeDoc.exists() 
      ? `${refereeDoc.data().firstName} ${refereeDoc.data().lastName}`
      : 'Unknown referee';

    // Delete the referee
    await deleteDoc(doc(refereesCollection, id));

    // Add notification about deletion
    await addNotification(`Referee ${refereeName} has been removed from the system`);

    console.log('Successfully deleted referee:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting referee:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const getReferees = async (): Promise<Referee[]> => {
  try {
    console.log('Fetching all referees...', { timestamp: new Date().toISOString() });
    const snapshot = await getDocs(refereesCollection);
    const referees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Referee));
    console.log('Successfully fetched referees:', { count: referees.length, timestamp: new Date().toISOString() });
    return referees;
  } catch (error) {
    console.error('Error getting referees:', {
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
            timestamp: data.timestamp.toDate(), // Convert Firestore Timestamp to Date
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
      readBy: [] // Initialize empty array of users who have read this
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

export { 
  refereesCollection,
  matchesCollection,
  notificationsCollection,
  Timestamp
};