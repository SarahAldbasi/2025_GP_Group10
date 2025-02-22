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
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
const refereesCollection = collection(db, 'referees');
const matchesCollection = collection(db, 'matches');

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
  assistantReferee1?: string | null;
  assistantReferee2?: string | null;
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
    handleFirestoreError(error as FirestoreError, 'create referee');
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
    handleFirestoreError(error as FirestoreError, 'update referee');
  }
};

export const deleteReferee = async (id: string): Promise<void> => {
  try {
    console.log('Deleting referee:', { id, timestamp: new Date().toISOString() });
    const docRef = doc(refereesCollection, id);
    await deleteDoc(docRef);
    console.log('Successfully deleted referee:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'delete referee');
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
    handleFirestoreError(error as FirestoreError, 'get referees');
    return []; 
  }
};

// Referee operations with optimized batching 
export const getMatches = async (): Promise<Match[]> => {
  try {
    const snapshot = await getDocs(matchesCollection);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      date: (doc.data().date as Timestamp).toDate() 
    } as Match));
  } catch (error) {
    console.error('Error getting matches:', {error, timestamp: new Date().toISOString()});
    throw error;
  }
};

//Match Operations
export const getMatch = async (id: string): Promise<Match | null> => {
  try {
    console.log('Fetching match...', {id, timestamp: new Date().toISOString()});
    const docRef = doc(matchesCollection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp).toDate()
      } as Match;
    }
    console.log('Match not found', {id, timestamp: new Date().toISOString()});
    return null;
  } catch (error) {
    console.error('Error getting match:', {error, timestamp: new Date().toISOString()});
    throw error;
  }
};

export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match> => {
  try {
    console.log('Creating new match:', {data: match, timestamp: new Date().toISOString()});
    const batch = writeBatch(db);
    const docRef = doc(matchesCollection);
    const newMatch = {
      ...match,
      date: Timestamp.fromDate(match.date)
    };

    batch.set(docRef, newMatch);
    await batch.commit();

    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match:', {error, timestamp: new Date().toISOString()});
    throw error;
  }
};

export const updateMatch = async (id: string, match: Partial<Match>): Promise<void> => {
  try {
    console.log('Updating match:', {id, data: match, timestamp: new Date().toISOString()});
    const batch = writeBatch(db);
    const docRef = doc(matchesCollection, id);
    const updateData = { ...match };

    if (match.date) {
      updateData.date = Timestamp.fromDate(match.date);
    }

    batch.update(docRef, updateData);
    await batch.commit();
  } catch (error) {
    console.error('Error updating match:', {error, timestamp: new Date().toISOString()});
    throw error;
  }
};

export const deleteMatch = async (id: string): Promise<void> => {
  try {
    console.log('Deleting match:', {id, timestamp: new Date().toISOString()});
    const batch = writeBatch(db);
    const docRef = doc(matchesCollection, id);

    batch.delete(docRef);
    await batch.commit();
  } catch (error) {
    console.error('Error deleting match:', {error, timestamp: new Date().toISOString()});
    throw error;
  }
};

export { 
  refereesCollection,
  matchesCollection,
  Timestamp
};